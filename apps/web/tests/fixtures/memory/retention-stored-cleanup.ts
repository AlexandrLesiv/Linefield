import { ProgressiveScene } from "../../../src/memory/progressive-scene.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { ReadyPreparation } from "../../../src/memory/ready-preparation.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import { retireScene } from "../../../src/memory/scene-retirement.ts";
import { gpuAdmission } from "../../../src/memory/gpu-retirement.ts";
import { geometryMetrics } from "../../../src/memory/geometry-metrics.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
export async function retentionStoredCleanup(canvas: HTMLCanvasElement) {
  const { check, report } = assertions();
  const state = visibilityStroke(visibilityState(), 129);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  let injected = false,
    retiring = false,
    notifications = 0,
    reached = () => {};
  let completion: Promise<void> | undefined;
  const entered = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const scene = new ProgressiveScene(
    () => state,
    renderer,
    () => {},
    () => {
      notifications++;
    },
  );
  const release = preparation.release,
    poll = ReadyPreparation.prototype.poll;
  preparation.release = (...args) => {
    const code = release(...args);
    if (!injected) {
      injected = true;
      check(code === "ok", "actual prepared ticket release reached inside generator next");
      throw Error("disposed");
    }
    return code;
  };
  ReadyPreparation.prototype.poll = function () {
    const result = poll.call(this);
    if (result.kind !== "pending") return result;
    return {
      kind: "pending",
      wait: result.wait.then(() => {
        if (!injected || retiring) return;
        // advance stored the rejected next before this callback. Stop before poll can
        // surface it; the closed generator's later return succeeds, but cleanup failed.
        retiring = true;
        retireScene(renderer, scene);
        completion = scene.dispose();
        void completion.catch(() => {});
        reached();
      }),
    };
  };
  try {
    await loadPreparation();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    check(renderer.available(), "actual renderer admitted");
    scene.render(1);
    renderer.check();
    await entered;
    check(injected && retiring && !!completion, "generator cleanup failed before disposal poll");
    const rejected = await completion?.then(
      () => false,
      () => true,
    );
    check(rejected === true, "stored next cleanup rejection survives successful later return");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const resources = scene.resources();
    check(
      resources.bytes === 0 && resources.uncertainTickets === 1,
      "known payload drains; uncertain ownership remains once",
    );
    check(
      geometryMetrics.pendingFrames === 0 && notifications === 0,
      "stopped host resets without UI failure callback",
    );
    let denied = false;
    try {
      gpuAdmission();
    } catch {
      denied = true;
    }
    check(denied, "old failed cleanup cannot admit replacement");
    return {
      ...report(),
      resources,
      scope: "actual worker/candidate next-finally failure before disposal",
    };
  } finally {
    preparation.release = release;
    ReadyPreparation.prototype.poll = poll;
    await scene.dispose().catch(() => {});
    closeTailFixture(state);
  }
}
