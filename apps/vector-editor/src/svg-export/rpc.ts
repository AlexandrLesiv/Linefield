import type { WorkerCommand, WorkerReply } from "./types";
/** Exactly one request in flight; reset rejects it before terminating its worker. */
export class ExportWorker {
  private worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
    name: "linefield-svg-export",
  });
  private sequence = 0;
  private pending: {
    id: number;
    resolve: (reply: WorkerReply) => void;
    reject: (error: Error) => void;
  } | null = null;
  private timer: ReturnType<typeof setInterval>;
  private busyMs = 0;
  private paused = false;
  private failure: string | null = null;
  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      const pending = this.pending;
      if (!pending || data.id !== pending.id) return;
      this.pending = null;
      if (data.error) pending.reject(Error(data.error));
      else pending.resolve(data);
    };
    this.worker.onerror = () => this.dispose("svg-worker-failure");
    this.worker.onmessageerror = () => this.dispose("svg-worker-message");
    this.timer = setInterval(() => {
      if (this.pending && !this.paused) this.busyMs += 1000;
      if (this.busyMs >= 30000) this.dispose("svg-worker-timeout");
    }, 1000);
  }
  setActive(active: boolean) {
    if (this.failure) return;
    if (this.paused === active) return;
    this.paused = active;
    this.worker.postMessage({ active });
  }
  send(command: WorkerCommand, transfer: Transferable[] = []): Promise<WorkerReply> {
    if (this.failure) return Promise.reject(Error(this.failure));
    if (this.pending) return Promise.reject(Error("svg-worker-backpressure"));
    const id = ++this.sequence;
    this.busyMs = 0;
    return new Promise((resolve, reject) => {
      this.pending = { id, resolve, reject };
      try {
        this.worker.postMessage({ id, command }, transfer);
      } catch (error) {
        this.pending = null;
        reject(error instanceof Error ? error : Error("svg-worker-transfer"));
      }
    });
  }
  dispose(reason = "svg-cancelled") {
    this.failure ??= reason;
    clearInterval(this.timer);
    this.pending?.reject(Error(reason));
    this.pending = null;
    this.worker.terminate();
  }
}
