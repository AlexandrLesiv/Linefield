import { gpuWakeSource } from "./gpu-wake-source.ts";
import { gpuWakeProbe } from "./gpu-wake-probe.ts";
import { assertions } from "./tail-fixture.ts";
import { compareWakePixels } from "./gpu-wake-pixels.ts";
export async function gpuWakeProgress(
  canvas: HTMLCanvasElement,
  mode: "visible" | "hidden" | "retire",
) {
  const { check, report } = assertions(),
    source = await gpuWakeSource(canvas);
  const renderer = source.renderer;
  await renderer.slot();
  await renderer.validated(source.issue());
  const baseline = await source.pixels();
  const probe = gpuWakeProbe(renderer.gl);
  try {
    probe.park(true);
    await renderer.slot();
    source.issue();
    await renderer.slot();
    const serial = source.issue();
    let completed = 0,
      cancelled = 0;
    const waits = [renderer.validated(serial), renderer.validated(serial)].map((pending) =>
      pending.then(
        () => {
          completed++;
        },
        () => {
          cancelled++;
        },
      ),
    );
    check(probe.snapshot().pendingTasks === 1, "real waiters share parked owner timer");
    await probe.pause(20);
    check(completed === 0 && probe.snapshot().fired === 0, "no timer grants validation");
    if (mode === "hidden") probe.visible(false);
    probe.releaseAll();
    let reserved = false;
    for (let step = 0; step < 100 && !reserved; step++) {
      reserved = renderer.available();
      if (!reserved) await probe.pause(1);
    }
    if (mode === "retire") renderer.dispose();
    await Promise.resolve();
    await Promise.resolve();
    check(
      reserved && probe.snapshot().signaled > 0,
      "actual signaled reader and fresh slot acquired",
    );
    if (mode === "hidden") {
      check(
        completed === 0 && cancelled === 0 && probe.snapshot().pendingTasks === 0,
        "externally validated hidden wait stays dormant with no timer",
      );
      probe.park(false);
      probe.visible(true);
      await Promise.all(waits);
      check(completed === 2, "visibility resumes already validated shared wait");
    } else if (mode === "retire") {
      check(
        completed === 0 && cancelled === 2,
        "retirement before waiter microtask rejects continuations",
      );
      let rejected = false;
      try {
        await renderer.slot();
      } catch {
        rejected = true;
      }
      check(rejected, "retired owner cannot reacquire a draw reservation");
    } else
      check(completed === 2, "real validation resolves shared waiters before any wake timer fires");
    check(
      probe.snapshot().pendingTasks === 0 && (mode === "hidden" || probe.snapshot().fired === 0),
      "validation cancels owner timer without rearming",
    );
    await Promise.all(waits);
    probe.staleCallbacks();
    check(probe.snapshot().pendingTasks === 0, "cancelled timer cannot recreate old wait");
    probe.park(false);
    if (mode !== "retire") await renderer.validated(source.issue());
    const pixels =
      mode === "retire" ? undefined : await compareWakePixels(baseline, await source.pixels());
    return {
      ...report(),
      mode,
      pixels,
      counters: probe.snapshot(),
      evidence:
        "actual generated source/render; controlled parked timer and fence release, no latency claim",
    };
  } finally {
    probe.park(false);
    probe.releaseAll();
    await source.close();
    probe.restore();
  }
}
