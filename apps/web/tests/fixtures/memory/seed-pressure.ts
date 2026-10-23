import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
export async function seedPressure(
  canvas: HTMLCanvasElement,
  mode: "capacity" | "same" | "multiple",
) {
  const { check, report } = assertions(),
    f = await seedFixture(canvas),
    held: bigint[] = [];
  try {
    if (mode !== "same") f.append();
    if (mode === "multiple") f.append(600);
    if (mode === "capacity")
      for (let i = 0; i < 6; i++) {
        const receipt = frames.capture(f.state());
        check(receipt.code === "ok", "seven receipts positively occupied before mandatory fold");
        held.push(receipt.id);
      }
    const copies = metrics.prefixSeedCopies,
      panCopies = metrics.panCopies,
      panAttempts = metrics.panAttempts,
      capacity = metrics.prefixSeedCapacityMisses;
    await f.seed();
    check(
      metrics.prefixSeedCopies === copies && !f.candidate.busy,
      "optional miss issues no copy or candidate work",
    );
    check(
      metrics.panCopies === panCopies && metrics.panAttempts === panAttempts,
      "same prefix, capacity and multiple successors never enter pan-copy route",
    );
    check(!f.base.prefix && !!f.base.receipt, "ordinary fold still completed");
    if (mode === "capacity")
      check(
        metrics.prefixSeedCapacityMisses === capacity + 1,
        "mandatory eighth fold receipt reserved before optional target capture",
      );
    else
      check(
        mode === "same" ? metrics.prefixSeedSameMisses > 0 : metrics.prefixSeedCountMisses > 0,
        "specific successful negative reuse proof",
      );
    for (const id of held.splice(0)) frames.release(f.state(), id);
    f.candidate.start(1);
    await f.idle();
    check(f.candidate.ready, "complete fallback renders all current source");
    return { ...report(), mode };
  } finally {
    for (const id of held) frames.release(f.state(), id);
    await f.close();
  }
}
