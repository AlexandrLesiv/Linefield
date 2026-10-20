import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { comparePixels, inkPixels } from "../cpu-raster/raster.ts";
import { Publication } from "./publication.ts";
import { Client } from "./client.ts";
import { capture } from "./capture.ts";
import { same } from "./protocol.ts";
import type { Cursor, Result, Frame } from "./protocol.ts";
export class Harness {
  client = new Client();
  private publication = new Publication();
  cursors: Cursor[] = [];
  rows: Record<string, unknown>[] = [];
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  async initialize(state: ReplyValue) {
    const result = await this.client.run({
      frame: {
        module: "fixture-module-1",
        state,
        width: this.width,
        height: this.height,
        strokes: [],
      },
      fresh: false,
      guarded: false,
      initialize: true,
    });
    if (result.status !== "completed") throw Error("renderer-initialization");
    this.rows.push({
      label: "untimed-renderer-initialization",
      heap: result.heap,
      wallMs: result.workerWallMs,
    });
  }
  dispose() {
    this.client.dispose();
  }
  current(frame: Frame) {
    const state = bridge.read(frame.state.owner);
    const mapping = bridge.mapping(state.owner, state.session);
    return (
      same(state, frame.state) &&
      state.interaction === frame.state.interaction &&
      mapping.width * mapping.backing === frame.width &&
      mapping.height * mapping.backing === frame.height
    );
  }
  async frame(state: ReplyValue, label: string, guarded = false, evict = false) {
    const start = performance.now();
    const captured = await capture(
      state,
      this.width,
      this.height,
      evict ? [] : this.cursors,
      guarded,
    );
    if (!this.current(captured.frame)) throw Error("capture-stale");
    const result = await this.client.run({ frame: captured.frame, fresh: false, guarded, evict });
    const { bitmap, pixels, cursors, ...metadata } = result;
    const row = {
      label,
      ...metadata,
      queries: captured.units,
      submitted: false,
      wallMs: performance.now() - start,
      inputBytes: captured.frame.strokes.reduce(
        (sum, s) =>
          sum +
          s.pages.reduce(
            (n, p) => n + p.verbs.byteLength + p.points.byteLength + p.weights.byteLength,
            0,
          ),
        0,
      ),
    };
    this.rows.push(row);
    if (result.status !== "completed" || !pixels || !bitmap) {
      bitmap?.close();
      throw Error(result.reason ?? "candidate-failure");
    }
    if (!this.current(captured.frame)) {
      bitmap.close();
      throw Error("stale-publication-rejected");
    }
    this.cursors = cursors;
    try {
      const submission = this.publication.submit(
        bitmap,
        pixels,
        state,
        this.width,
        this.height,
        guarded,
        () => this.current(captured.frame),
      );
      row.submitted = true;
      Object.assign(row, {
        submission,
        inkPixels: inkPixels(pixels),
        captureToAcknowledgementMs: submission.acknowledgedAt - start,
      });
      if (submission.parity.differentChannels) throw Error("bitmap-parity");
      if (guarded && submission.submitMs > 8) throw Error("operation-guard:publication");
      if (guarded && submission.acknowledgedAt - start > 500) throw Error("complete-frame-500ms");
      return { pixels, frame: captured.frame, result };
    } catch (error) {
      bitmap.close();
      throw error;
    }
  }
  rejectPublication(frame: Frame, result: Result, receiptFault = false) {
    this.publication.reject(frame, result, () => this.current(frame), receiptFault);
    this.rows.push({
      label: receiptFault ? "receipt-failure-rollback" : "stale-publication-rejection",
      preserved: true,
    });
  }
  async reference(state: ReplyValue, candidate: Uint8Array, repeat = true) {
    let full = await capture(state, this.width, this.height);
    let previous: Uint8Array | undefined;
    for (let i = 0; i < (repeat ? 2 : 1); i++) {
      if (i) full = await capture(state, this.width, this.height);
      const result = await this.client.run({ frame: full.frame, fresh: true, guarded: false });
      result.bitmap?.close();
      if (result.status !== "completed" || !result.pixels) throw Error("reference-failure");
      if (comparePixels(candidate, result.pixels).differentChannels)
        throw Error("candidate-reference-parity");
      if (previous && comparePixels(previous, result.pixels).differentChannels)
        throw Error("reference-repeatability");
      previous = result.pixels;
    }
    this.diagnostic("reference", previous!);
    Object.assign(this.rows[this.rows.length - 1]!, {
      referenceParity: "exact",
      repeatability: repeat,
    });
    return full.frame;
  }
  diagnostic(id: string, pixels: Uint8Array) {
    const canvas = document.getElementById(id);
    if (!(canvas instanceof HTMLCanvasElement)) throw Error("diagnostic-canvas");
    canvas.width = this.width;
    canvas.height = this.height;
    const context = canvas.getContext("2d");
    if (!context) throw Error("diagnostic-context");
    context.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), this.width, this.height),
      0,
      0,
    );
  }
  async gpu(state: ReplyValue, cpu: Uint8Array) {
    // Dispose the candidate heap before creating the separately labelled GPU control heap.
    this.client.dispose();
    this.client = new Client();
    this.cursors = [];
    const full = await capture(state, this.width, this.height);
    const result: Result = await this.client.run({
      frame: full.frame,
      fresh: true,
      guarded: false,
      gpu: true,
    });
    result.bitmap?.close();
    if (result.status !== "completed" || !result.pixels) throw Error("gpu-control-failure");
    this.diagnostic("gpu", result.pixels);
    this.rows.push({
      label: "sequential-gpu-diagnostic",
      environment: result.environment,
      cpuGpuDifference: comparePixels(cpu, result.pixels),
      cpuInk: inkPixels(cpu),
      gpuInk: inkPixels(result.pixels),
    });
    this.client.dispose();
    this.client = new Client();
  }
}
