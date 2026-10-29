import type { Core } from "./core";
import type { GeometryData } from "./derived-geometry";
import { LassoRegion, type LassoPoint } from "./lasso";
import type { StrokeTransform } from "./stroke-transform";
export const LASSO_SNAPSHOT_BYTES = 8 * 1024 * 1024;
export type LassoChunk = { data: GeometryData; stride: number };
export type LassoStroke = { id: number; transform: StrokeTransform; chunks: LassoChunk[] };
export type LassoSnapshot = {
  strokes: LassoStroke[];
  points: readonly LassoPoint[];
  partial: boolean;
};

/** Disposable local geometry only. The worker has query scratch, never a document. */
export function queryLasso(core: Core, snapshot: LassoSnapshot): number[] {
  const region = new LassoRegion(core, snapshot.points),
    found: number[] = [];
  try {
    for (const stroke of snapshot.strokes) {
      let hit = false,
        enclosed = true;
      for (const chunk of stroke.chunks) {
        const flags = region.capsules(chunk.data, chunk.stride, stroke.transform, snapshot.partial);
        if (snapshot.partial) hit = Boolean(flags & 2);
        else {
          hit ||= Boolean(flags & 1);
          if (flags & 4) enclosed = false;
        }
        if ((snapshot.partial && hit) || !enclosed) break;
      }
      if (hit && (snapshot.partial || enclosed)) found.push(stroke.id);
    }
    return found;
  } finally {
    region.dispose();
  }
}

export function validateLasso(snapshot: LassoSnapshot) {
  if (
    !snapshot ||
    typeof snapshot.partial !== "boolean" ||
    !Array.isArray(snapshot.points) ||
    !Array.isArray(snapshot.strokes)
  )
    throw Error("Invalid Lasso snapshot");
  let bytes = snapshot.points.length * 16;
  if (snapshot.points.length < 2 || bytes > LASSO_SNAPSHOT_BYTES)
    throw Error("Invalid Lasso path size");
  for (const point of snapshot.points)
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))
      throw Error("Invalid Lasso point");
  const ids = new Set<number>();
  for (const stroke of snapshot.strokes) {
    bytes += 64;
    if (
      !Number.isSafeInteger(stroke.id) ||
      stroke.id < 0 ||
      ids.has(stroke.id) ||
      !Array.isArray(stroke.transform) ||
      stroke.transform.length !== 4 ||
      !stroke.transform.every(Number.isFinite) ||
      !Array.isArray(stroke.chunks)
    )
      throw Error("Invalid Lasso stroke");
    ids.add(stroke.id);
    for (const { data, stride } of stroke.chunks) {
      if (
        !(data instanceof Float32Array || data instanceof Float64Array) ||
        !(data.buffer instanceof ArrayBuffer) ||
        data.byteOffset !== 0 ||
        data.buffer.byteLength !== data.byteLength ||
        (stride !== 3 && stride !== 6) ||
        data.length % stride !== 0
      )
        throw Error("Invalid Lasso geometry");
      bytes += data.byteLength + 32;
      if (bytes > LASSO_SNAPSHOT_BYTES || !data.every(Number.isFinite))
        throw Error("Invalid Lasso geometry budget");
    }
    if (bytes > LASSO_SNAPSHOT_BYTES) throw Error("Lasso snapshot budget exceeded");
  }
}
