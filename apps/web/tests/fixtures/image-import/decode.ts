import { DECODE_OPTIONS, type DecodeMode } from "./types";
export class Decoder {
  private worker: Worker | null = null;
  private pending: {
    id: number;
    resolve: (v: { image: ImageBitmap; decodeMs: number }) => void;
    reject: (e: Error) => void;
  } | null = null;
  private serial = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  async decode(blob: Blob, mode: DecodeMode) {
    if (this.pending) throw Error("image-busy");
    if (mode === "main") {
      const start = performance.now(),
        image = await createImageBitmap(blob, DECODE_OPTIONS);
      return { image, decodeMs: performance.now() - start };
    }
    if (!this.worker) {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
        name: "linefield-image-checkpoint",
      });
      this.worker.onmessage = ({ data }) => {
        if (!this.pending || data.id !== this.pending.id) {
          data.image?.close();
          return;
        }
        const pending = this.pending;
        this.pending = null;
        clearTimeout(this.timer);
        if (data.error) pending.reject(Error(data.error));
        else pending.resolve(data);
      };
      this.worker.onerror = () => this.reset("image-worker-failure");
      this.worker.onmessageerror = () => this.reset("image-worker-message");
    }
    const id = ++this.serial;
    return new Promise<{ image: ImageBitmap; decodeMs: number }>((resolve, reject) => {
      this.pending = { id, resolve, reject };
      this.timer = setTimeout(() => this.reset("image-worker-timeout"), 30000);
      try {
        this.worker!.postMessage({ id, blob });
      } catch {
        this.reset("image-worker-message");
      }
    });
  }
  isPending() {
    return this.pending !== null;
  }
  reset(reason = "image-cancelled") {
    clearTimeout(this.timer);
    this.pending?.reject(Error(reason));
    this.pending = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
