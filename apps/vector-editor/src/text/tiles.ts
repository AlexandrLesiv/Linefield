import type { TextRecord } from "./records";
import type { Camera } from "../camera";
export type TextTile = {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
  key: string;
};
export function textTiles(
  record: TextRecord,
  camera: Camera,
  width: number,
  height: number,
  dpr: number,
): TextTile[] {
  const scale = Math.hypot(record.a, record.b),
    squared = scale * scale;
  if (!(squared > 0)) throw Error("text-transform");
  const density = 2 ** (Math.ceil(Math.log2(camera.zoom * scale * dpr) * 4) / 4);
  const local = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    const p = camera.screenToWorld(x, y),
      dx = p[0] - record.x,
      dy = p[1] - record.y;
    return [(record.a * dx + record.b * dy) / squared, (-record.b * dx + record.a * dy) / squared];
  });
  const left = Math.max(0, Math.min(...local.map((p) => p[0]))),
    top = Math.max(0, Math.min(...local.map((p) => p[1])));
  const right = Math.min(record.width, Math.max(...local.map((p) => p[0]))),
    bottom = Math.min(record.height, Math.max(...local.map((p) => p[1])));
  if (right <= left || bottom <= top) return [];
  const size = 512 / density,
    result: TextTile[] = [];
  for (let iy = Math.floor(top / size); iy * size < bottom; iy++)
    for (let ix = Math.floor(left / size); ix * size < right; ix++) {
      const x = ix * size,
        y = iy * size;
      if (result.length >= 256) throw Error("text-view-limit");
      result.push({
        x,
        y,
        width: Math.min(size, record.width - x),
        height: Math.min(size, record.height - y),
        density,
        key: `${record.generation}:${record.id}:${density}:${x}:${y}`,
      });
    }
  return result;
}
export function tileCorners(record: TextRecord, tile: TextTile) {
  return [
    [tile.x, tile.y],
    [tile.x + tile.width, tile.y],
    [tile.x, tile.y + tile.height],
    [tile.x + tile.width, tile.y + tile.height],
  ].flatMap(([x, y]) => [
    record.x + record.a * x - record.b * y,
    record.y + record.b * x + record.a * y,
  ]);
}
