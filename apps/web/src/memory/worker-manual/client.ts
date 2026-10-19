import type { Request, Reply, Frame } from "./wire.ts";
export class WorkerClient {
  private worker = new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" });
  private pending:
    | { id: number; resolve(value: Reply): void; reject(error: Error): void }
    | undefined;
  private stopped = false;
  constructor(failure: () => void) {
    const fail = () => {
      if (this.stopped) return;
      this.pending?.reject(Error("worker-failure"));
      this.pending = undefined;
      failure();
    };
    this.worker.onmessage = (event: MessageEvent<Reply>) => {
      const value = event.data;
      const waiting = this.pending;
      if (value.kind === "error") {
        fail();
        return;
      }
      if (!waiting || waiting.id !== value.id || this.stopped) {
        if (value.kind === "frame") value.bitmap.close();
        return;
      }
      this.pending = undefined;
      waiting.resolve(value);
    };
    this.worker.onerror = fail;
    this.worker.onmessageerror = fail;
  }
  request(value: Request, transfer: Transferable[] = []) {
    if (this.stopped || this.pending) return Promise.reject(Error("worker-unavailable"));
    return new Promise<Reply>((resolve, reject) => {
      this.pending = { id: value.id, resolve, reject };
      this.worker.postMessage(value, transfer);
    });
  }
  async finish(id: number): Promise<Frame> {
    const value = await this.request({ kind: "finish", id });
    if (value.kind !== "frame") throw Error("worker-frame");
    return value;
  }
  dispose() {
    this.stopped = true;
    this.worker.terminate();
    this.pending?.reject(Error("worker-disposed"));
    this.pending = undefined;
  }
}
