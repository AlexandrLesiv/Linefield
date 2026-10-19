import type { ReplyValue } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import type { WorkerRequest, WorkerReply } from "./worker-wire.ts";
import { accepted } from "./undo-input.ts";
export type Frame = Extract<WorkerReply, { kind: "frame" }>;
export class PrototypeWorker {
  private worker = new Worker(new URL("./render-prototype.worker.ts", import.meta.url), {
    type: "module",
  });
  private pending:
    | { id: number; resolve(value: WorkerReply): void; reject(error: Error): void }
    | undefined;
  onBusy: (id: number) => void = () => {};
  maximumPageBytes = 0;
  maximumQueryMs = 0;
  constructor() {
    this.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (reply.kind === "busy") {
        this.onBusy(reply.id);
        return;
      }
      const pending = this.pending;
      if (!pending || pending.id !== reply.id) {
        if (reply.kind === "frame") reply.bitmap.close();
        return;
      }
      this.pending = undefined;
      if (reply.kind === "failure") pending.reject(Error(reply.reason));
      else pending.resolve(reply);
    };
    this.worker.onerror = () => {
      this.pending?.reject(Error("worker-error"));
      this.pending = undefined;
    };
  }
  request(message: WorkerRequest, transfer: Transferable[] = []) {
    if (this.pending) throw Error("credit-exceeded");
    return new Promise<WorkerReply>((resolve, reject) => {
      this.pending = { id: message.id, resolve, reject };
      this.worker.postMessage(message, transfer);
    });
  }
  async render(state: ReplyValue, ids: bigint[], id: number, clear: boolean): Promise<Frame> {
    await this.request({ kind: "start", id, clear });
    for (const stroke of ids) {
      const status = penBridge.stroke(state, stroke);
      accepted(status);
      let offset = 0n;
      while (offset < status.verbs) {
        const start = performance.now();
        const page = penBridge.page(state, stroke, status.geometry, offset);
        this.maximumQueryMs = Math.max(this.maximumQueryMs, performance.now() - start);
        accepted(page);
        offset += BigInt(page.verbs.length);
        const bytes = page.verbs.byteLength + page.points.byteLength + page.weights.byteLength;
        this.maximumPageBytes = Math.max(this.maximumPageBytes, bytes);
        if (page.verbs.length > 4096 || bytes > 256 * 1024) throw Error("page-limit");
        await this.request(
          {
            kind: "page",
            id,
            verbs: page.verbs,
            points: page.points,
            weights: page.weights,
            color: [page.red, page.green, page.blue],
            done: page.done,
          },
          [page.verbs.buffer, page.points.buffer, page.weights.buffer],
        );
        if (page.done) break;
        if (offset !== page.next) throw Error("page-order");
      }
    }
    const reply = await this.request({ kind: "finish", id });
    if (reply.kind !== "frame") throw Error("missing-frame");
    return reply;
  }
  async dispose() {
    try {
      await this.request({ kind: "dispose", id: 999 });
    } finally {
      this.worker.terminate();
    }
  }
}
