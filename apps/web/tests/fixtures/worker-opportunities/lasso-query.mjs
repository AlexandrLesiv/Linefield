import { LassoRegion } from "../../../../vector-editor/src/lasso.ts";
export async function queryCore() {
  return (await WebAssembly.instantiateStreaming(fetch("/apps/vector-editor/public/core.wasm"), {}))
    .instance.exports;
}
export function query(core, plan, points, partial) {
  const region = new LassoRegion(core, points),
    ids = [];
  try {
    for (const r of plan.records) {
      if (!region.overlaps(r.bounds)) continue;
      const flags = region.capsules(r.entry.capsules, r.entry.capsuleStride, [1, 0, 0, 0], partial);
      if (partial ? flags & 2 : flags & 1 && !(flags & 4)) ids.push(r.id);
    }
    return ids;
  } finally {
    region.dispose();
  }
}
export function polygon(dense, index) {
  const cx = dense ? 400 : 2300,
    cy = dense ? 65 : 1600;
  const radius = dense ? 350 : 2800;
  return Array.from({ length: 513 }, (_, i) => {
    const angle = ((i % 512) * Math.PI * 2) / 512;
    return [cx + Math.cos(angle) * (radius + index), cy + Math.sin(angle) * (radius + index)];
  });
}
