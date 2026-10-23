import { gpuWakeSource } from "./gpu-wake-source.ts";
import { gpuWakeProbe } from "./gpu-wake-probe.ts";
import { assertions } from "./tail-fixture.ts";
export async function gpuWakeDeadline(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    source = await gpuWakeSource(canvas);
  const renderer = source.renderer,
    probe = gpuWakeProbe(renderer.gl);
  let failure: unknown;
  try {
    await renderer.slot();
    const pending = renderer.validated(source.issue()).catch((error: unknown) => {
      failure = error;
    });
    for (let i = 0; i < 19; i++) {
      probe.advance(500);
      await probe.pause(35);
    }
    probe.advance(400);
    await probe.pause(35);
    check(!failure, "actual fence remains waiting at9900 visible ms");
    probe.visible(false);
    const hidden = probe.snapshot();
    probe.advance(400);
    await probe.pause(45);
    check(
      probe.snapshot().polls === hidden.polls && !failure,
      "short hidden interval near deadline neither polls nor fails",
    );
    probe.visible(true);
    probe.advance(50);
    await probe.pause(35);
    check(!failure, "hidden400ms excluded:9950 visible ms remains admissible");
    probe.advance(51);
    await probe.pause(40);
    await pending;
    check(
      failure instanceof Error && failure.message === "gpu-resource",
      "true10001 visible ms preserves no-progress failure",
    );
    check(
      probe.snapshot().readers === 1 && probe.snapshot().deletes === 0,
      "failed reader remains charged before cleanup",
    );
    return {
      ...report(),
      counters: probe.snapshot(),
      scope:
        "actual render/fence with controlled monotonic clock and visibility; no latency acceptance",
    };
  } finally {
    probe.releaseAll();
    probe.visible(true);
    await source.close();
    probe.restore();
  }
}
