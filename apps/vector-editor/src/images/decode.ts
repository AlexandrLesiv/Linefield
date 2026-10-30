import type { DecodedImage } from "./types";
export class ImageDecoder {
  private worker: Worker | undefined;
  private pending:
    | {
        id: number;
        resolve(value: DecodedImage): void;
        reject(error: Error): void;
        cleanup(): void;
      }
    | undefined;
  private serial = 0;
  decode(blob: Blob, signal: AbortSignal): Promise<DecodedImage> {
    if (signal.aborted) return Promise.reject(Error("image-cancelled"));
    if (this.pending) return Promise.reject(Error("image-busy"));
    if (!this.worker) {
      this.worker = new Worker(new URL("./decode-worker.ts", import.meta.url), {
        type: "module",
        name: "linefield-image-decode",
      });
      this.worker.onmessage = ({ data }) => {
        const pending = this.pending;
        if (!pending || data.id !== pending.id) {
          data.image?.close();
          return;
        }
        this.pending = undefined;
        pending.cleanup();
        if (data.error) pending.reject(Error(data.error));
        else pending.resolve(data);
      };
      this.worker.onerror = (event) => {
        event.preventDefault();
        this.cancel("image-worker-failed");
      };
      this.worker.onmessageerror = () => this.cancel("image-worker-failed");
    }
    return new Promise((resolve, reject) => {
      const id = ++this.serial,
        abort = () => this.cancel(),
        timer = setTimeout(() => this.cancel("image-decode-timeout"), 30000);
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      };
      this.pending = { id, resolve, reject, cleanup };
      signal.addEventListener("abort", abort, { once: true });
      try {
        this.worker!.postMessage({ id, blob });
      } catch {
        this.cancel("image-worker-failed");
      }
    });
  }
  cancel(reason = "image-cancelled") {
    const pending = this.pending;
    this.pending = undefined;
    pending?.cleanup();
    pending?.reject(Error(reason));
    this.worker?.terminate();
    this.worker = undefined;
  }
  dispose() {
    this.cancel();
  }
}
