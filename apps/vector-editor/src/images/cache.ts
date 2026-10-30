import { ImageDecoder } from "./decode";
import { ImageGpu } from "./gpu";
import { GPU_BUDGET, textureBytes } from "./types";
type Entry = ReturnType<ImageGpu["upload"]> & { touched: number; presented: boolean };
export type ImageCacheHost = {
  readAsset(digest: string): Promise<Blob>;
  waitForIdle(signal: AbortSignal): Promise<void>;
  isInputActive(): boolean;
};
/** Disposable textures only. Canonical visibility/order and durable assets belong elsewhere. */
export class ImageCache {
  private gpu: ImageGpu;
  private decoder = new ImageDecoder();
  private entries = new Map<string, Entry>();
  private pins = new Set<string>();
  private clock = 0;
  private bytes = 0;
  private external = 0;
  private externalEvict: ((maximum: number) => number) | undefined;
  private stopped = false;
  private active: AbortController | undefined;
  private request:
    | {
        key: string;
        digests: string[];
        resolve(): void;
        reject(error: Error): void;
        promise: Promise<void>;
      }
    | undefined;
  private pumping = false;
  constructor(
    private gl: WebGL2RenderingContext,
    private host: ImageCacheHost,
  ) {
    this.gpu = new ImageGpu(gl);
  }
  get usedBytes() {
    return this.bytes;
  }
  reserveExternal(bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw Error("image-gpu-budget");
    if (bytes > this.external) this.room(bytes - this.external, false);
    this.external = bytes;
  }
  setExternalEvict(evict: (maximum: number) => number) {
    this.externalEvict = evict;
  }
  has(digest: string) {
    return this.entries.has(digest);
  }
  needsPresentation(digests: readonly string[]) {
    return digests.some((digest) => !this.entries.get(digest)?.presented);
  }
  private room(bytes: number, external = true) {
    if (bytes > GPU_BUDGET) throw Error("image-gpu-budget");
    for (const [digest, entry] of [...this.entries].sort((a, b) => a[1].touched - b[1].touched)) {
      if (this.bytes + this.external + bytes <= GPU_BUDGET) break;
      if (this.pins.has(digest)) continue;
      this.gl.deleteTexture(entry.texture);
      this.entries.delete(digest);
      this.bytes -= entry.bytes;
    }
    if (external && this.externalEvict && this.bytes + this.external + bytes > GPU_BUDGET)
      this.external = this.externalEvict(Math.max(0, GPU_BUDGET - this.bytes - bytes));
    if (this.bytes + this.external + bytes > GPU_BUDGET) throw Error("image-gpu-budget");
  }
  async prepare(digest: string, image: ImageBitmap, signal: AbortSignal) {
    try {
      if (!/^[0-9a-f]{64}$/.test(digest)) throw Error("image-asset-identity");
      if (this.entries.has(digest)) return;
      await this.host.waitForIdle(signal);
      if (signal.aborted || this.stopped) throw Error("image-cancelled");
      if (this.host.isInputActive()) throw Error("image-input-active");
      if (this.entries.has(digest)) return;
      this.room(textureBytes(image.width, image.height));
      const entry = this.gpu.upload(image);
      this.bytes += entry.bytes;
      this.entries.set(digest, { ...entry, touched: ++this.clock, presented: false });
    } finally {
      image.close();
    }
  }
  ensureVisible(digests: readonly string[]): Promise<void> {
    if (this.stopped) return Promise.reject(Error("image-cancelled"));
    const unique = [...new Set(digests)],
      key = unique.slice().sort().join(":");
    if (this.request?.key === key) return this.request.promise;
    if (!this.request && unique.every((digest) => this.entries.has(digest))) {
      this.pins = new Set(unique);
      return Promise.resolve();
    }
    this.request?.reject(Error("image-cancelled"));
    this.active?.abort();
    this.decoder.cancel();
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    this.request = { key, digests: unique, resolve, reject, promise };
    if (!this.pumping) void this.pump();
    return promise;
  }
  private async pump() {
    this.pumping = true;
    try {
      while (this.request && !this.stopped) {
        const request = this.request,
          controller = new AbortController();
        this.active = controller;
        // Last complete pixels stay on canvas while the next complete visible set is prepared.
        this.pins = new Set(request.digests);
        try {
          for (const digest of request.digests) {
            if (controller.signal.aborted) throw Error("image-cancelled");
            const existing = this.entries.get(digest);
            if (existing) {
              existing.touched = ++this.clock;
              continue;
            }
            const blob = await this.host.readAsset(digest);
            if (controller.signal.aborted) throw Error("image-cancelled");
            const decoded = await this.decoder.decode(blob, controller.signal);
            await this.prepare(digest, decoded.image, controller.signal);
          }
          if (this.request === request) {
            this.request = undefined;
            request.resolve();
          }
        } catch (error) {
          if (this.request === request) {
            this.request = undefined;
            request.reject(error instanceof Error ? error : Error("image-load-failed"));
          }
        }
      }
    } finally {
      this.pumping = false;
      this.active = undefined;
    }
  }
  draw(digest: string, corners: readonly number[], opacity: number, width: number, height: number) {
    const entry = this.entries.get(digest);
    if (!entry) throw Error("image-not-ready");
    if (!entry.presented && this.host.isInputActive()) throw Error("image-input-active");
    this.gpu.draw(entry.texture, corners, opacity, width, height);
    entry.presented = true;
    entry.touched = ++this.clock;
  }
  dispose(contextLost = false) {
    this.stopped = true;
    this.active?.abort();
    this.decoder.dispose();
    this.request?.reject(Error("image-cancelled"));
    this.request = undefined;
    if (!contextLost)
      for (const entry of this.entries.values()) this.gl.deleteTexture(entry.texture);
    this.entries.clear();
    this.bytes = 0;
    if (!contextLost) this.gpu.dispose();
  }
}
