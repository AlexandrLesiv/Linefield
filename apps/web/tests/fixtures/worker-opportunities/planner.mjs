import { planSparseAtlas } from "../../../../vector-editor/src/sparse-atlas-plan.ts";
import { ViewProjection } from "../../../../vector-editor/src/view-projection.ts";
import { retainCapsules, coverageBlocks } from "../../../../vector-editor/src/geometry-cache.ts";
import {
  readTransform,
  transformCapsules,
} from "../../../../vector-editor/src/stroke-transform.ts";
export async function scene(dense) {
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("/apps/vector-editor/public/core.wasm"),
    {},
  );
  const core = instance.exports,
    records = [],
    groups = [];
  for (let id = 0; id < 256; id++) {
    core.begin_with_style(24, 0x224466, 0.1, 1, 0.4);
    core.set_active_brush(id % 3);
    for (let i = 0; i < 129; i++)
      core.push_precise(
        (dense ? 200 : (id % 16) * 300) + i * 3,
        (dense ? id * 0.5 : Math.floor(id / 16) * 200) + 40 * Math.sin(i / 12),
        0.7,
      );
    core.commit();
    const count = core.render_chunk(id, 0, 0.25);
    const raw = new Float32Array(core.memory.buffer, core.render_chunk_ptr(), count * 6);
    const projected = new Float32Array(raw.length);
    transformCapsules(raw, projected, readTransform(core, id));
    const { capsules, capsuleStride } = retainCapsules(projected);
    const bounds = [Infinity, Infinity, -Infinity, -Infinity],
      spans = new Float64Array(Math.ceil(count / 2) * 4);
    for (let first = 0; first < count; first += 2) {
      const box = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = first; i < Math.min(first + 2, count); i++) {
        const k = i * 6,
          radius = Math.max(projected[k + 2], projected[k + 5]);
        box[0] = Math.min(box[0], projected[k] - radius, projected[k + 3] - radius);
        box[1] = Math.min(box[1], projected[k + 1] - radius, projected[k + 4] - radius);
        box[2] = Math.max(box[2], projected[k] + radius, projected[k + 3] + radius);
        box[3] = Math.max(box[3], projected[k + 1] + radius, projected[k + 4] + radius);
      }
      spans.set(box, (first / 2) * 4);
      bounds[0] = Math.min(bounds[0], box[0]);
      bounds[1] = Math.min(bounds[1], box[1]);
      bounds[2] = Math.max(bounds[2], box[2]);
      bounds[3] = Math.max(bounds[3], box[3]);
    }
    records.push({
      id,
      chunk: 0,
      serial: id,
      brush: id % 3,
      color: 0x224466,
      opacity: 0.4,
      bounds,
      group: id,
      entry: { capsules, capsuleStride, spans, spanBlocks: coverageBlocks(spans), segments: count },
    });
    groups.push({ bounds, start: id, end: id + 1 });
  }
  return {
    plan: { records, groups },
    rawSamples: Array.from({ length: core.count() }, (_, id) => core.raw_length(id)).reduce(
      (a, b) => a + b,
      0,
    ),
  };
}
export function planFrame(plan, state) {
  const view = Object.assign(new ViewProjection(), state),
    clip = [0, 0, 2880, 1632];
  const bounds = view.deviceBoundsProjector(2, 2),
    pad = 2 / (state.zoom * 2),
    capsule = view.capsuleBoundsProjector(2, 2, pad, state.zoom * 2 >= 12, true);
  const visible = (box) => {
    const b = bounds(box, pad);
    return b[0] < 2880 && b[2] > 0 && b[1] < 1632 && b[3] > 0;
  };
  const steps = planSparseAtlas(plan, (b) => bounds(b, pad), clip, {
    hierarchical: true,
    reuseRectangles: true,
    visibleBounds: visible,
    spanBounds: (r, first, count, out) =>
      capsule(r.entry.capsules, first, count, out, r.entry.capsuleStride),
    spanIntersects: state.zoom * 2 >= 12 ? capsule.intersects : undefined,
  });
  return steps.map((step) =>
    step.kind === "legacy"
      ? step
      : {
          kind: step.kind,
          tiles: step.tiles,
          records: step.records.map((r) => ({
            id: r.record.id,
            chunk: r.record.chunk,
            tiles: r.tiles,
            first: r.first,
            count: r.count,
            routeCount: r.routeCount,
            spanSize: r.spanSize,
          })),
        },
  );
}
export function buffers(plan) {
  return [
    ...new Set(
      plan.records.flatMap((r) => [
        r.entry.capsules.buffer,
        r.entry.spans.buffer,
        r.entry.spanBlocks.buffer,
      ]),
    ),
  ];
}
