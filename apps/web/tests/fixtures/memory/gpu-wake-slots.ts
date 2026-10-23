import { gpuWakeSource } from "./gpu-wake-source.ts";
import { gpuWakeProbe } from "./gpu-wake-probe.ts";
import { assertions } from "./tail-fixture.ts";
export async function gpuWakeSlots(canvas: HTMLCanvasElement, reserved: boolean) {
  const { check, report } = assertions(),
    source = await gpuWakeSource(canvas);
  const renderer = source.renderer;
  await renderer.slot();
  await renderer.validated(source.issue());
  const baseline = await source.pixels();
  const probe = gpuWakeProbe(renderer.gl);
  try {
    await renderer.slot();
    const first = source.issue();
    check(renderer.available(), "second real slot reserved");
    const serial = reserved ? first : source.issue();
    let complete = false,
      acquired = false;
    const completion = renderer.validated(serial).then(() => {
      complete = true;
    });
    const other = renderer.validated(serial);
    const slot = reserved
      ? Promise.resolve()
      : renderer.slot().then(() => {
          acquired = true;
        });
    await probe.pause(100);
    const blocked = probe.snapshot();
    check(
      blocked.peak === 1 && blocked.pendingTasks === 1,
      "multiple actual consumers coalesce to one task",
    );
    check(
      blocked.delays.slice(0, 4).join() === "4,8,16,32",
      "one backoff step per owner wake cycle",
    );
    check(
      blocked.delays.slice(3).every((value) => value === 32),
      "blocked owner stays at32ms ceiling",
    );
    check(
      !complete && !acquired && blocked.errors === 0 && blocked.deletes === 0,
      "wake grants no validation or slot",
    );
    if (reserved) probe.releaseAll();
    else probe.releaseOne();
    for (let turn = 0; probe.snapshot().signaled === 0 && turn < 100; turn++) await probe.pause(10);
    check(probe.snapshot().signaled > 0, "released real reader positively observed signaled");
    check(
      !complete && probe.snapshot().errors === 0 && probe.snapshot().deletes === 0,
      reserved
        ? "signaled reader cannot validate a live reservation"
        : "first signaled reader cannot validate held second reader",
    );
    if (reserved) {
      const last = source.issue();
      await renderer.validated(last);
    } else probe.releaseAll();
    await Promise.all([completion, other, slot]);
    check(
      complete && probe.snapshot().readers === 0,
      "all-reader zero-reservation validation drains together",
    );
    if (reserved) await renderer.slot();
    probe.hold();
    const next = source.issue(),
      pending = renderer.validated(next);
    check(
      probe.snapshot().delays.at(-1) === 4,
      "actual validated progress resets next waiting episode",
    );
    probe.releaseAll();
    await pending;
    const final = await source.pixels();
    check(
      final.every((value, index) => value === baseline[index]),
      "actual prepared source has exact final pixels",
    );
    const quiet = probe.snapshot();
    await probe.pause(80);
    check(
      probe.snapshot().fired === quiet.fired && quiet.pendingTasks === 0,
      "ordinary idle has zero awaited task polling",
    );
    return {
      ...report(),
      reserved,
      counters: probe.snapshot(),
      scope:
        "actual canonical preparation/render/submission; controlled GL fence hold, not timing evidence",
    };
  } finally {
    probe.releaseAll();
    await source.close();
    probe.restore();
  }
}
