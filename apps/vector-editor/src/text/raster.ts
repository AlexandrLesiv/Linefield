import type { TextRecord } from "./records";
import type { TextTile } from "./tiles";
export class TextRaster {
  private worker: Worker | undefined;
  private serial = 0;
  private pending:
    | {
        id: number;
        resolve(bitmap: ImageBitmap): void;
        reject(error: Error): void;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  cancel() {
    this.worker?.terminate();
    this.worker = undefined;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(Error("text-cancelled"));
      this.pending = undefined;
    }
  }
  render(record: TextRecord, text: string, tile: TextTile): Promise<ImageBitmap> {
    if (this.pending) return Promise.reject(Error("text-busy"));
    if (!this.worker) {
      this.worker = new Worker(new URL("./raster-worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = ({
        data,
      }: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
        const pending = this.pending;
        if (!pending || pending.id !== data.id) {
          data.bitmap?.close();
          return;
        }
        clearTimeout(pending.timer);
        this.pending = undefined;
        if (data.bitmap) pending.resolve(data.bitmap);
        else pending.reject(Error("text-render-failed"));
      };
      this.worker.onerror = (event) => {
        event.preventDefault();
        this.cancel();
      };
      this.worker.onmessageerror = () => this.cancel();
    }
    return new Promise((resolve, reject) => {
      const id = ++this.serial,
        timer = setTimeout(() => this.cancel(), 15000);
      this.pending = { id, resolve, reject, timer };
      try {
        this.worker!.postMessage({
          id,
          text,
          color: record.color,
          inkX: record.inkX,
          baseline: record.baseline,
          width: record.width,
          height: record.height,
          tile,
        });
      } catch {
        this.cancel();
      }
    });
  }
}
