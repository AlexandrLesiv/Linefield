import type { GeometryData } from "./derived-geometry";
import { preparationBuffers, type PreparedGeometry } from "./geometry-preparation";
/** Validate bounded disposable transport before cache admission. Source geometry remains available for fallback. */
export function validPreparation(value: unknown, source: GeometryData): value is PreparedGeometry {
  if (!value || typeof value !== "object") return false;
  const p = value as PreparedGeometry,
    count = source.length / 6;
  if (
    !Array.isArray(p.transform) ||
    p.transform.length !== 4 ||
    !p.transform.every(Number.isFinite) ||
    (p.capsuleStride !== 3 && p.capsuleStride !== 6)
  )
    return false;
  const retainedLength = p.capsuleStride === 3 ? (count + 1) * 3 : source.length;
  const spans = Math.ceil(count / 2) * 4;
  if (
    !(p.projected instanceof Float32Array) ||
    p.projected.length !== source.length ||
    !(p.capsules instanceof Float32Array) ||
    p.capsules.length !== retainedLength ||
    !(p.spans instanceof Float64Array) ||
    p.spans.length !== spans ||
    !(p.spanBlocks instanceof Float64Array) ||
    p.spanBlocks.length !== Math.ceil(spans / 64) * 4
  )
    return false;
  const needsLocal =
    source instanceof Float64Array ||
    p.transform[0] !== 1 ||
    !!p.transform[1] ||
    !!p.transform[2] ||
    !!p.transform[3];
  if (
    needsLocal
      ? !(source instanceof Float64Array
          ? p.local instanceof Float64Array
          : p.local instanceof Float32Array) || p.local?.length !== retainedLength
      : p.local !== undefined
  )
    return false;
  for (const array of [source, p.projected, p.capsules, p.spans, p.spanBlocks, p.local]) {
    if (
      array &&
      (!(array.buffer instanceof ArrayBuffer) ||
        array.byteOffset !== 0 ||
        array.byteLength !== array.buffer.byteLength)
    )
      return false;
  }
  return (
    preparationBuffers(source, p).reduce((sum, buffer) => sum + buffer.byteLength, 0) <=
    source.byteLength * 5 + 128
  );
}
