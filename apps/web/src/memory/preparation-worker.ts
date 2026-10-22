import { loadPreparation, preparationHeap } from "./preparation-loader.ts";
import { request } from "./preparation-messages.ts";
import type { PreparationResponse } from "./preparation-messages.ts";
import type { GeometryPreparation } from "#preparation-bindings";
const jobs = new Map<bigint, GeometryPreparation>();
function send(value: PreparationResponse, transfer: Transferable[] = []) {
  self.postMessage(value, { transfer });
}
void loadPreparation()
  .then((begin) => {
    self.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (!request(data)) return;
      try {
        if (data.kind === "cancel") {
          jobs.get(data.request)?.free();
          jobs.delete(data.request);
          return;
        }
        if (data.kind === "start") {
          if (jobs.size >= 8 || jobs.has(data.request)) throw Error("capacity");
          jobs.set(data.request, begin(data.points, data.parameters));
        }
        const job = jobs.get(data.request);
        if (!job) throw Error("unavailable");
        const started = performance.now();
        const result = job.nextPage();
        let output: Float32Array, origin: Float64Array, done: boolean;
        try {
          output = result.data;
          origin = result.origin;
          done = result.done;
        } finally {
          result.free();
        }
        send(
          {
            kind: "page",
            request: data.request,
            data: output,
            origin,
            done,
            heap: preparationHeap(),
            duration: performance.now() - started,
          },
          [output.buffer, origin.buffer],
        );
        if (done) {
          job.free();
          jobs.delete(data.request);
        }
      } catch {
        jobs.get(data.request)?.free();
        jobs.delete(data.request);
        send({ kind: "failed", request: data.request });
      }
    };
    send({ kind: "ready" });
  })
  .catch(() => send({ kind: "failed", request: 0n }));
