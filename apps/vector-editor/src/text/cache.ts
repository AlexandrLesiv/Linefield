import { prepareText } from "./prepared";
import type { ImageCache } from "../images/cache";
import type { TextRecord } from "./records";
import type { TextTile } from "./tiles";
import { TextGpu } from "./gpu";
import { TextRaster } from "./raster";
export type TextJob = { record: TextRecord; tile: TextTile; text: string };
type Entry = ReturnType<TextGpu["upload"]> & { job: TextJob; touched: number; presented: boolean };
export class TextCache {
  private gpu: TextGpu | undefined;
  private raster = new TextRaster();
  private entries = new Map<string, Entry>();
  private pins = new Set<string>();
  private requested: TextJob[] = [];
  private running = false;
  private inflight = "";
  private bytes = 0;
  private clock = 0;
  private active: AbortController | undefined;
  private stopped = false;
  error = "";
  constructor(
    private gl: WebGL2RenderingContext,
    private host: {
      images(): ImageCache;
      wait(signal: AbortSignal): Promise<void>;
      active(): boolean;
      changed(): void;
    },
  ) {
    host.images().setExternalEvict((maximum) => {
      for (const [key, entry] of [...this.entries].sort((a, b) => a[1].touched - b[1].touched)) {
        if (this.bytes <= maximum) break;
        if (this.pins.has(key)) continue;
        this.gl.deleteTexture(entry.texture);
        this.entries.delete(key);
        this.bytes -= entry.bytes;
      }
      return this.bytes;
    });
  }
  private room(size: number) {
    for (const [key, entry] of [...this.entries].sort((a, b) => a[1].touched - b[1].touched)) {
      try {
        if (this.entries.size >= 512) throw Error("text-view-limit");
        this.host.images().reserveExternal(this.bytes + size);
        return;
      } catch {
        if (this.pins.has(key)) continue;
        this.gl.deleteTexture(entry.texture);
        this.entries.delete(key);
        this.bytes -= entry.bytes;
      }
    }
    if (this.entries.size >= 512) throw Error("text-view-limit");
    this.host.images().reserveExternal(this.bytes + size);
  }
  ensure(jobs: TextJob[]) {
    const keys = jobs.map((job) => job.tile.key),
      signature = keys.join("|");
    if (signature === this.requested.map((job) => job.tile.key).join("|")) return;
    if (this.inflight && !keys.includes(this.inflight)) {
      this.active?.abort();
      this.raster.cancel();
    }
    this.requested = jobs;
    this.pins = new Set(keys);
    this.error = "";
    if (!this.running) void this.pump();
  }
  async prepare(record: TextRecord, text: string, tile: TextTile, signal: AbortSignal) {
    const entry = await prepareText(record, text, tile, signal, {
      wait: this.host.wait,
      upload: (bitmap) => {
        try {
          this.room(bitmap.width * bitmap.height * 4);
          this.gpu ??= new TextGpu(this.gl);
          const uploaded = this.gpu.upload(bitmap);
          this.bytes += uploaded.bytes;
          return uploaded;
        } finally {
          this.host.images().reserveExternal(this.bytes);
        }
      },
    });
    let retained = true;
    return {
      publish: (job: TextJob) => {
        if (!retained) throw Error("text-preparation");
        retained = false;
        this.entries.set(job.tile.key, { ...entry, job, touched: ++this.clock, presented: true });
      },
      dispose: () => {
        if (retained) {
          retained = false;
          this.gl.deleteTexture(entry.texture);
          this.bytes -= entry.bytes;
          this.host.images().reserveExternal(this.bytes);
        }
      },
    };
  }
  admit(bytes: number, total = 0) {
    try {
      this.room(bytes);
      this.host.images().reserveExternal(Math.max(this.bytes + bytes, total));
    } finally {
      this.host.images().reserveExternal(this.bytes);
    }
  }
  retry() {
    this.error = "";
    if (!this.running) void this.pump();
  }
  private async pump() {
    this.running = true;
    try {
      while (!this.stopped) {
        const controller = new AbortController();
        this.active = controller;
        const missing = this.requested.find((job) => !this.entries.has(job.tile.key));
        if (!missing) break;
        this.inflight = missing.tile.key;
        let bitmap: ImageBitmap | undefined;
        try {
          await this.host.wait(controller.signal);
          if (controller.signal.aborted) continue;
          bitmap = await this.raster.render(missing.record, missing.text, missing.tile);
          await this.host.wait(controller.signal);
          if (this.stopped || !this.pins.has(missing.tile.key) || controller.signal.aborted)
            continue;
          const size = bitmap.width * bitmap.height * 4;
          this.room(size);
          this.gpu ??= new TextGpu(this.gl);
          const entry = this.gpu.upload(bitmap);
          this.bytes += entry.bytes;
          this.entries.set(missing.tile.key, {
            ...entry,
            job: missing,
            touched: ++this.clock,
            presented: false,
          });
          this.host.changed();
        } catch (error) {
          if (controller.signal.aborted || !this.pins.has(missing.tile.key)) continue;
          this.error = error instanceof Error ? error.message : "text-render-failed";
          this.host.changed();
          break;
        } finally {
          bitmap?.close();
          this.host.images().reserveExternal(this.bytes);
          this.inflight = "";
        }
      }
    } finally {
      this.running = false;
    }
  }
  available(key: string) {
    const e = this.entries.get(key);
    return !!e && (e.presented || !this.host.active());
  }
  state() {
    return {
      gpuBytes: this.bytes,
      queued: this.requested.filter((job) => !this.entries.has(job.tile.key)).length,
      error: this.error,
    };
  }
  draw(job: TextJob, corners: number[], opacity: number, width: number, height: number) {
    const entry = this.entries.get(job.tile.key);
    if (!entry || !this.gpu || !this.available(job.tile.key)) return;
    const w = entry.width,
      h = entry.height,
      tile = job.tile;
    this.gpu.draw(
      entry.texture,
      corners,
      [2 / w, 2 / h, (2 + tile.width * tile.density) / w, (2 + tile.height * tile.density) / h],
      opacity,
      width,
      height,
    );
    entry.presented = true;
    entry.touched = ++this.clock;
  }
  dispose(lost = false) {
    this.stopped = true;
    this.active?.abort();
    this.raster.cancel();
    if (!lost) {
      for (const entry of this.entries.values()) this.gl.deleteTexture(entry.texture);
      this.gpu?.dispose();
    }
    this.entries.clear();
    this.bytes = 0;
    this.host.images().reserveExternal(0);
  }
}
