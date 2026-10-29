import type { LassoSnapshot } from "./lasso-snapshot";

/** One query, one optional worker. Cancellation never runs the fallback. */
export class LassoPreparer {
  private stop: (() => void) | null = null;
  readonly stats = {
    pending: false,
    submitted: 0,
    completed: 0,
    fallback: 0,
    canceled: 0,
    bytes: 0,
  };
  cancel() {
    this.stop?.();
  }
  run(
    snapshot: LassoSnapshot,
    current: () => boolean,
    fallback: () => number[],
    publish: (ids: number[]) => void,
    failed: (error: unknown) => void,
  ) {
    this.cancel();
    this.stats.pending = true;
    let worker: Worker | null = null,
      timer: ReturnType<typeof setTimeout> | undefined,
      done = false,
      sent = false;
    const finish = () => {
      if (done) return false;
      done = true;
      this.stats.pending = false;
      clearTimeout(timer);
      worker?.terminate();
      this.stop = null;
      this.stats.bytes = 0;
      return true;
    };
    const recover = () => {
      if (!finish()) return;
      try {
        if (!current()) return;
        this.stats.fallback++;
        publish(fallback());
      } catch (error) {
        failed(error);
      }
    };
    this.stop = () => {
      if (finish()) this.stats.canceled++;
    };
    const allowed = new Set(snapshot.strokes.map((stroke) => stroke.id));
    try {
      worker = new Worker(new URL("./lasso-worker.ts", import.meta.url), { type: "module" });
      timer = setTimeout(recover, 2000);
      worker.onerror = worker.onmessageerror = recover;
      worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (done) return;
        try {
          if (!current()) {
            this.cancel();
            return;
          }
          if (!data || typeof data !== "object") {
            recover();
            return;
          }
          if ("ready" in data && data.ready === true && !sent) {
            sent = true;
            try {
              const copy = {
                ...snapshot,
                strokes: snapshot.strokes.map((s) => ({
                  ...s,
                  chunks: s.chunks.map((c) => ({ ...c, data: c.data.slice() })),
                })),
              };
              const buffers = copy.strokes.flatMap((s) =>
                s.chunks.map((c) => c.data.buffer as ArrayBuffer),
              );
              this.stats.bytes = buffers.reduce((n, b) => n + b.byteLength, 0);
              this.stats.submitted++;
              worker!.postMessage(copy, buffers);
            } catch {
              recover();
            }
            return;
          }
          if (
            !sent ||
            !("ids" in data) ||
            !Array.isArray(data.ids) ||
            data.ids.length > allowed.size ||
            new Set(data.ids).size !== data.ids.length ||
            !data.ids.every((id) => Number.isSafeInteger(id) && allowed.has(id))
          ) {
            recover();
            return;
          }
          const found = new Set<number>(data.ids);
          if (finish()) {
            this.stats.completed++;
            try {
              publish(snapshot.strokes.filter((s) => found.has(s.id)).map((s) => s.id));
            } catch (error) {
              failed(error);
            }
          }
        } catch (error) {
          if (finish()) failed(error);
        }
      };
    } catch {
      recover();
    }
  }
}
