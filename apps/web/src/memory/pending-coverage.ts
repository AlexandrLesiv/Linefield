import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { ActivePages } from "./active-pages.ts";
import type { GpuPass } from "./gpu-pass.ts";
import type { LiveCoverage } from "./live-coverage.ts";
import type { PreparedCache } from "./prepared-cache.ts";
export function pendingCoverage(
  state: () => ReplyValue,
  immediate: ActivePages,
  pass: GpuPass,
  after: bigint,
  detail: number,
  prepared: PreparedCache,
  live?: LiveCoverage,
) {
  let secondary = false;
  for (;;) {
    const ids = scene.ids(state(), after);
    if (ids.code !== "ok") throw Error(ids.code);
    for (const id of ids.ids) {
      if (!secondary && live) live.gpu.resetBack();
      secondary = true;
      const stroke = scene.stroke(state(), id);
      if (stroke.code !== "ok") throw Error(stroke.code);
      pass.group();
      for (const page of immediate.read(
        id,
        stroke.count,
        detail,
        stroke.active ? undefined : prepared,
      )) {
        try {
          const p = scene.placement(state(), id, page.page);
          if (p.code !== "ok") throw Error(p.code);
          if (p.available) pass.draw(page.data, p.matrix, stroke.color, page.page);
        } finally {
          page.release?.();
        }
      }
      pass.composite();
      after = id;
    }
    if (ids.done) break;
  }
  immediate.finish();
  return !immediate.pending;
}
