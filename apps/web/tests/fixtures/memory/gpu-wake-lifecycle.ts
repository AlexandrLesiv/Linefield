import { gpuWakeSource } from "./gpu-wake-source.ts";
import { gpuWakeProbe } from "./gpu-wake-probe.ts";
import { assertions } from "./tail-fixture.ts";
import { wakePixelsPresent } from "./gpu-wake-pixels.ts";
import { gpuAdmission, retiringGpuBytes } from "../../../src/memory/gpu-retirement.ts";
export async function gpuWakeLifecycle(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    source = await gpuWakeSource(canvas);
  const renderer = source.renderer,
    probe = gpuWakeProbe(renderer.gl);
  let replacement: Awaited<ReturnType<typeof gpuWakeSource>> | undefined;
  let releaseCpu = () => {};
  const cpu = new Promise<void>((resolve) => {
    releaseCpu = resolve;
  });
  try {
    await renderer.slot();
    source.issue();
    await renderer.slot();
    const serial = source.issue();
    let cancelled = false;
    const pending = renderer.validated(serial).catch(() => {
      cancelled = true;
    });
    check(probe.snapshot().pendingTasks === 1, "real fence wait has a scheduled task");
    probe.visible(false);
    const hidden = probe.snapshot();
    probe.advance(400);
    await probe.pause(60);
    probe.staleCallbacks();
    check(
      probe.snapshot().polls === hidden.polls && probe.snapshot().pendingTasks === 0,
      "hide-before-fire and queued old callback cause zero hidden fence polls",
    );
    probe.visible(true);
    probe.visible(true);
    check(
      probe.snapshot().pendingTasks === 1 && probe.snapshot().delays.at(-1) === 4,
      "show arms one fresh4ms task",
    );
    await probe.pause(10);
    check(probe.snapshot().polls > hidden.polls, "visible owner resumes actual readiness checks");
    probe.visible(false);
    renderer.dispose({
      resources: source.resources,
      cleanup: async () => {
        await cpu;
        source.releaseCpu();
      },
    });
    await pending;
    check(
      cancelled && probe.snapshot().pendingTasks === 0,
      "owner abort rejects dormant wait and clears task",
    );
    probe.releaseAll();
    probe.visible(true);
    for (let turn = 0; retiringGpuBytes() && turn < 100; turn++) await probe.pause(10);
    check(
      retiringGpuBytes() === 0 && source.resources().bytes > 0 && !gpuAdmission(),
      "GPU drained while real prepared CPU geometry remains charged",
    );
    const cpuOnly = probe.snapshot();
    await probe.pause(80);
    check(
      probe.snapshot().pendingTasks === 0 && probe.snapshot().fired === cpuOnly.fired,
      "CPU-only retirement creates zero awaited GPU wake tasks",
    );
    releaseCpu();
    await source.close();
    replacement = await gpuWakeSource(canvas);
    probe.hold();
    await replacement.renderer.slot();
    const next = replacement.issue();
    let finished = false;
    const successor = replacement.renderer.validated(next).then(() => {
      finished = true;
    });
    probe.staleCallbacks();
    check(
      !finished && probe.snapshot().pendingTasks === 1,
      "old callback cannot erase or fulfill replacement wake",
    );
    probe.releaseAll();
    await successor;
    const pixels = await replacement.pixels();
    // Both independently captured outputs must contain ink and paper after replacement.
    const visible = await wakePixelsPresent(pixels);
    return {
      ...report(),
      counters: probe.snapshot(),
      pixels: visible,
      scope:
        "real GL owner with controlled visibility/queued callback faults; not native background-tab timing",
    };
  } finally {
    releaseCpu();
    probe.releaseAll();
    probe.visible(true);
    if (replacement) await replacement.close();
    else await source.close();
    probe.restore();
  }
}
