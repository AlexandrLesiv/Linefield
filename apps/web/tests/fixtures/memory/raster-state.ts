import { check, rasterFixture } from "./raster-proof.ts";
import { rasterAdmission } from "./raster-admission.ts";
export function rasterState() {
  const admission = rasterAdmission();
  const f = rasterFixture(4, 0.05, Math.PI / 12, true);
  const rows = [];
  try {
    const canonical = f.view();
    f.begin(-Number.MIN_VALUE);
    const subnormal = f.update(1n, 1);
    check(
      !subnormal.enabled && subnormal.outcome === "fractional",
      "exact difference cannot round away subnormal",
      subnormal,
    );
    f.terminal(1n, true);
    rows.push(subnormal);
    const initial = f.begin();
    rows.push(f.update(1n, 0.125));
    check(!rows.at(-1)!.enabled, "fractional intermediate", rows);
    const recovered = f.update(2n, 4095.75);
    check(recovered.enabled && recovered.x === 16383, "integral recovers in gesture", recovered);
    const edge = f.update(3n, 4096);
    check(edge.enabled && edge.x === 16384, "inclusive bound", edge);
    const over = f.update(4n, 4096.25);
    check(!over.enabled && over.outcome === "range", "range miss", over);
    const sticky = f.update(5n, 1);
    check(!sticky.enabled && sticky.outcome === "range", "range sticky", sticky);
    const cancel = f.terminal(5n, true);
    check(cancel.epoch === initial.epoch && cancel.x === 0, "Cancel restores phase", cancel);
    const restored = f.view();
    check(
      restored.regionX === canonical.regionX &&
        restored.regionY === canonical.regionY &&
        restored.localX === canonical.localX &&
        restored.localY === canonical.localY,
      "Cancel restores far canonical bits",
      restored,
    );
    f.begin();
    f.update(1n, 4096.25);
    const failedEnd = f.terminal(1n);
    check(
      failedEnd.enabled && failedEnd.x === 0 && failedEnd.epoch !== initial.epoch,
      "failed End reanchors",
      failedEnd,
    );
    f.begin();
    const integral = f.update(1n, -1);
    const end = f.terminal(1n);
    check(
      end.epoch === failedEnd.epoch && end.x === -4 && end.enabled,
      "integral End preserves",
      end,
    );
    f.begin();
    const noChange = f.terminal(0n);
    check(
      noChange.epoch === end.epoch && noChange.x === end.x,
      "no-update End preserves",
      noChange,
    );
    f.basis();
    const changed = f.begin();
    check(changed.epoch !== end.epoch && changed.x === 0, "basis invalidates", changed);
    f.terminal(0n);
    rows.push(
      initial,
      recovered,
      edge,
      over,
      sticky,
      cancel,
      failedEnd,
      integral,
      end,
      noChange,
      changed,
    );
    return {
      evidence: "isolated proposed state driven by actual pan commands; no production raster state",
      rows,
      admission,
    };
  } finally {
    f.dispose();
  }
}
