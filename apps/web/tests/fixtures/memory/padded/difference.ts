import { comparePixels } from "../cpu-raster/raster.ts";

export function difference(
  reference: Uint8Array,
  candidate: Uint8Array,
  width: number,
  height: number,
) {
  const channels = comparePixels(reference, candidate);
  const firstPixels: {
    x: number;
    y: number;
    delta: number;
    tileDistance: number;
    viewportDistance: number;
  }[] = [];
  let pixels = 0,
    minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  const nearTileBoundary = [0, 0, 0, 0];
  for (let i = 0; i < reference.length; i += 4) {
    let delta = 0;
    for (let channel = 0; channel < 4; channel++)
      delta = Math.max(delta, Math.abs(reference[i + channel]! - candidate[i + channel]!));
    if (!delta) continue;
    const pixel = i / 4,
      x = pixel % width,
      y = Math.floor(pixel / width);
    const dx = (x % 128) + 0.5,
      dy = (y % 128) + 0.5;
    const tileDistance = Math.min(dx, 128 - dx, dy, 128 - dy);
    const viewportDistance = Math.min(x + 0.5, width - x - 0.5, y + 0.5, height - y - 0.5);
    for (const [index, threshold] of [1, 2, 4, 8].entries())
      if (tileDistance < threshold) nearTileBoundary[index]!++;
    pixels++;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    if (firstPixels.length < 32) firstPixels.push({ x, y, delta, tileDistance, viewportDistance });
  }
  return {
    ...channels,
    pixels,
    bounds: pixels ? [minX, minY, maxX, maxY] : null,
    firstPixels,
    nearTileBoundary: {
      within1: nearTileBoundary[0],
      within2: nearTileBoundary[1],
      within4: nearTileBoundary[2],
      within8: nearTileBoundary[3],
    },
  };
}
