import type { Core } from "./core";
export type GeometryData = Float32Array | Float64Array;

/** Borrowed scratch: copy before the next owning geometry operation. */
export function readGeometry(
  core: Core,
  id: number,
  chunk: number,
  tolerance: number,
): GeometryData {
  if (core.geometry_requires_f64(id, chunk)) {
    const count = core.render_chunk_f64(id, chunk, tolerance);
    return new Float64Array(core.memory.buffer, core.render_chunk_f64_ptr(), count * 6);
  }
  const count = core.render_chunk(id, chunk, tolerance);
  return new Float32Array(core.memory.buffer, core.render_chunk_ptr(), count * 6);
}

export function readGeometryBounds(core: Core, id: number, chunk: number): number[] {
  if (core.geometry_requires_f64(id, chunk)) {
    const pointer = core.raw_chunk_bounds_f64_ptr(id, chunk);
    return Array.from(new Float64Array(core.memory.buffer, pointer, 4));
  }
  const pointer = core.raw_chunk_bounds_ptr(id, chunk);
  return Array.from(new Float32Array(core.memory.buffer, pointer, 4));
}
