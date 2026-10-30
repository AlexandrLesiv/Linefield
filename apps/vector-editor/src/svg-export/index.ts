import { sendImageOrInk } from "../images/svg-source";
import { ExportWorker } from "./rpc";
import { ExportSession } from "./session";
import { SvgOutput } from "./output";
import { encodeImage } from "./encode";
import {
  type ControllerOptions,
  type ExportOptions,
  type ExportProgress,
  type ExportDiagnostic,
  type SvgExportCore,
} from "./types";
export type * from "./types";
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Main thread owns snapshot/serialization. The worker owns disposable render resources. */
export class SvgExportController {
  private worker: ExportWorker | null = null;
  private running = false;
  private cancelled = false;
  private active = false;
  private quietUntil = 0;
  private job = 0;
  private started = 0;
  private inputPaused = false;
  private progress: ExportProgress = { phase: "preparing", packets: 0, images: 0, bytes: 0 };
  constructor(
    private core: SvgExportCore,
    private options: ControllerOptions,
  ) {}
  setInputActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    if (!active) this.quietUntil = performance.now() + 100;
    this.worker?.setActive(active);
  }
  private update(phase: ExportProgress["phase"]) {
    this.progress.phase = phase;
    this.options.onProgress({ ...this.progress });
  }
  private check() {
    if (this.cancelled) throw Error("svg-cancelled");
  }
  private diagnostic(kind: ExportDiagnostic["kind"], code?: ExportDiagnostic["code"]) {
    try {
      this.options.onDiagnostic?.({
        kind,
        code,
        job: this.job,
        elapsedMs: Math.round(performance.now() - this.started),
        packets: this.progress.packets,
        images: this.progress.images,
        bytes: this.progress.bytes,
      });
    } catch {
      /* Diagnostic sinks must not fail a successful export. */
    }
  }
  private async gate() {
    await nextTask();
    this.check();
    while (this.active || this.options.isInputActive() || performance.now() < this.quietUntil) {
      this.worker?.setActive(true);
      if (!this.inputPaused) this.diagnostic("paused");
      this.inputPaused = true;
      this.update("paused");
      await new Promise((resolve) => setTimeout(resolve, 16));
      this.check();
    }
    this.worker?.setActive(false);
    if (this.inputPaused) this.diagnostic("resumed");
    this.inputPaused = false;
  }
  async start(options: ExportOptions): Promise<Blob> {
    if (this.running || this.active || this.options.isInputActive())
      throw Error("svg-active-or-busy");
    if (
      typeof options.grid !== "boolean" ||
      ![1, 2, 4].includes(options.density) ||
      !["current", "white", "transparent"].includes(options.background)
    )
      throw Error("svg-options-unsupported");
    this.running = true;
    this.cancelled = false;
    this.inputPaused = false;
    this.job++;
    this.started = performance.now();
    this.progress = { phase: "preparing", packets: 0, images: 0, bytes: 0 };
    this.update("preparing");
    this.diagnostic("start");
    const output = new SvgOutput();
    let session: ExportSession | undefined;
    try {
      session = new ExportSession(this.core);
      const view = await session.prepare(options, () => this.gate());
      await this.gate();
      this.worker = new ExportWorker();
      await this.worker.send({
        kind: "init",
        view,
        wasmUrl: this.options.wasmUrl ?? new URL("core.wasm", document.baseURI).href,
      });
      const c = this.core,
        t = session.token;
      output.append(session.text(c.svg_xml_begin(t)));
      if (view.paper) {
        await this.gate();
        await this.worker.send({ kind: "background" });
        await this.image(session, output);
      }
      const tolerance = c.svg_tolerance(t);
      for (;;) {
        await this.gate();
        this.update("rendering");
        const length = c.svg_next(t, tolerance);
        if (!length) {
          if (c.svg_status(t) !== 3 || c.svg_error(t)) throw Error("svg-geometry-failed");
          break;
        }
        if (length < 24 || length > 6168 || (length - 24) % 6) throw Error("svg-packet-boundary");
        const values = new Float64Array(c.memory.buffer, c.svg_output_ptr(t), length).slice();
        const last = c.svg_group_last(t) === 1;
        await sendImageOrInk(c, t, this.worker, values, last, this.options.resolveAsset);
        this.progress.packets++;
        if (last) await this.image(session, output);
      }
      await this.gate();
      await this.worker.send({ kind: "finish" });
      output.append(session.text(c.svg_xml_finish(t)));
      this.check();
      this.progress.bytes = output.bytes;
      const result = output.finish();
      await session.retire();
      session = undefined;
      this.check();
      this.update("complete");
      this.diagnostic("complete");
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      this.diagnostic(
        "failure",
        this.cancelled
          ? "cancelled"
          : /limit/.test(reason)
            ? "resource-limit"
            : reason === "svg-context-lost"
              ? "context-lost"
              : /^svg-worker-/.test(reason)
                ? "worker"
                : reason === "svg-snapshot-changed"
                  ? "snapshot-changed"
                  : "failed",
      );
      throw error;
    } finally {
      this.worker?.dispose();
      this.worker = null;
      output.clear();
      try {
        if (session) await session.retire();
      } finally {
        this.running = false;
      }
    }
  }
  private async image(session: ExportSession, output: SvgOutput) {
    const worker = this.worker;
    if (!worker) throw Error("svg-worker-state");
    this.update("encoding");
    await encodeImage(
      session,
      worker,
      output,
      () => this.gate(),
      () => {
        this.progress.bytes = output.bytes;
      },
    );
    this.progress.images++;
  }
  cancel() {
    if (this.running && !this.cancelled) this.diagnostic("cancel", "cancelled");
    this.cancelled = true;
    this.worker?.dispose();
  }
  dispose() {
    this.cancel();
  }
}
