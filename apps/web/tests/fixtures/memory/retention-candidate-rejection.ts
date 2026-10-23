import { ProgressiveScene } from "../../../src/memory/progressive-scene.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { FrameCommands } from "../../../src/memory/frame-commands.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import {
  gpuAdmission,
  retiringCpuResources,
  watchGpuAdmission,
} from "../../../src/memory/gpu-retirement.ts";
import { retireScene } from "../../../src/memory/scene-retirement.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { geometryMetrics } from "../../../src/memory/geometry-metrics.ts";
export async function retentionCandidateRejection(canvas: HTMLCanvasElement, fault = "commands") {
  const { check, report } = assertions();
  const state = visibilityStroke(visibilityState(), 129);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  let wake = 0,
    notifications = 0,
    arrived = () => {},
    release = () => {};
  const entered = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const dispose = FrameCommands.prototype.dispose;
  const releaseFrame = frames.release;
  const unprotect = renderer.unprotect.bind(renderer);
  const validated = renderer.validated.bind(renderer);
  let bodyFailed = false;
  let notificationFault = false;
  if (fault === "operation-receipt")
    renderer.validated = async (serial) => {
      await validated(serial);
      bodyFailed = true;
      throw Error("injected-validation-failure");
    };
  FrameCommands.prototype.dispose = async function () {
    arrived();
    await held;
    await dispose.call(this);
    // Real candidate/scene cleanup must preserve even a normally recoverable error label.
    if (fault === "commands" || fault === "commands-notification") throw Error("disposed");
  };
  const scene = new ProgressiveScene(
    () => {
      if (notificationFault) throw Error("injected-observation-failure");
      return state;
    },
    renderer,
    () => {},
    () => {
      notifications++;
    },
  );
  const unwatch = watchGpuAdmission(() => {
    wake++;
  });
  try {
    await loadPreparation();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    check(renderer.available(), "real renderer admitted");
    scene.render(1);
    renderer.check();
    await entered;
    check(
      scene.resources().bytes > 0,
      "actual candidate prepared/adopted geometry before cleanup hold",
    );
    if (fault === "receipt" || fault === "operation-receipt") frames.release = () => "invalid";
    if (fault === "commands-notification")
      frames.release = (...args) => {
        const code = releaseFrame(...args);
        notificationFault = true;
        return code;
      };
    if (fault === "residency")
      renderer.unprotect = (token, credit) => {
        unprotect(token, credit);
        throw Error("disposed");
      };
    retireScene(renderer, scene);
    const completion = scene.dispose().then(
      () => false,
      () => true,
    );
    release();
    check(await completion, "actual scene rejects actual candidate cleanup failure");
    check(
      geometryMetrics.pendingFrames === 0,
      "receipt failure still resets candidate host ownership",
    );
    if (fault === "operation-receipt")
      check(bodyFailed, "actual validation body failed before receipt cleanup fault");
    if (fault === "commands-notification")
      check(notificationFault, "optional state observation fails after known receipt release");
    for (let i = 0; i < 100; i++) {
      if (wake) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    let denied = false;
    try {
      gpuAdmission();
    } catch {
      denied = true;
    }
    check(denied, "rejected zero-payload cleanup cannot reopen old generation");
    check(retiringCpuResources().bytes === 0, "known host arrays still drain truthfully");
    check(
      notifications === 0 && wake === 1,
      "stopped UI receives no failure notification; admission failure wakes once",
    );
    return {
      ...report(),
      fault,
      scope: "actual renderer/candidate/scene disposal with positive cleanup fault",
    };
  } finally {
    release();
    unwatch();
    FrameCommands.prototype.dispose = dispose;
    frames.release = releaseFrame;
    notificationFault = false;
    renderer.unprotect = unprotect;
    renderer.validated = validated;
    await scene.dispose().catch(() => {});
    closeTailFixture(state);
  }
}
