import type { Request, Result, Progress, Unit, Delivery } from "./protocol.ts";
import { hostUnit, stage } from "./telemetry.ts";
export class Client {
  private worker = new Worker(new URL("./checkpoint.worker.ts", import.meta.url), {
    type: "module",
  });
  private sequence = 0;
  private active = false;
  stage = "idle";
  observations:
    | { stage: string; elapsedWallMs: number; stageWallMs: number; lastUnits: Unit[] }
    | undefined;
  dispose() {
    this.worker.terminate();
  }
  run(request: Omit<Request, "id">): Promise<Result> {
    if (this.active) throw Error("publication-inflight-limit");
    this.active = true;
    const id = ++this.sequence;
    const started = performance.now();
    let stageStart = started;
    let lastUnits: Unit[] = [];
    let returned: Result | undefined;
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const fail = (reason: string) => {
        clearTimeout(timer);
        returned?.bitmap?.close();
        this.dispose();
        this.active = false;
        this.observations = {
          stage: this.stage,
          elapsedWallMs: performance.now() - started,
          stageWallMs: performance.now() - stageStart,
          lastUnits,
        };
        reject(Error(`${reason}:${this.stage}`));
      };
      const arm = () => {
        timer = setTimeout(() => fail("worker-timeout"), 5000);
      };
      this.worker.onerror = () => fail("worker-error");
      this.worker.onmessage = (event: MessageEvent<Result | Progress | Delivery>) => {
        clearTimeout(timer);
        if (event.data.id !== id) {
          fail("worker-request-identity");
          return;
        }
        if (event.data.kind === "delivery") {
          if (!returned) {
            fail("missing-result-before-delivery");
            return;
          }
          returned.units.push({ stage: "worker-result-transfer-post", ms: event.data.ms });
          if (request.guarded && event.data.ms > 8) {
            returned.status = "failed";
            returned.reason = "operation-guard:worker-result-transfer-post";
          }
          this.active = false;
          resolve(returned);
          return;
        }
        this.stage = event.data.stage;
        if (event.data.kind === "progress") {
          lastUnits = event.data.units;
          stageStart = performance.now();
          stage(`worker:${this.stage}`);
          arm();
          return;
        }
        returned = event.data;
        arm();
      };
      this.stage = "worker-start";
      arm();
      try {
        hostUnit(
          "worker-request-clone-post",
          () => this.worker.postMessage({ ...request, id }),
          request.guarded,
        );
      } catch (error) {
        fail(error instanceof Error ? error.message : "worker-post-failure");
      }
    });
  }
}
