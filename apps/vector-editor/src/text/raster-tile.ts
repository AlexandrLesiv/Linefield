import { textFont, TEXT_FONT } from "./font";
import { TEXT_LINE, textLayout, type TextLayout } from "./layout";
const validated = new Map<string, TextLayout>();
import type { TextTile } from "./tiles";
const measured = new Map<string, { line: string; ascent: number; descent: number }[]>();
export type RasterText = {
  text: string;
  color: number;
  inkX: number;
  baseline: number;
  width: number;
  height: number;
  tile: TextTile;
};
export async function rasterText(data: RasterText) {
  await textFont();
  let layout = validated.get(data.text);
  if (!layout) {
    layout = await textLayout(data.text);
    if (validated.size >= 8) validated.delete(validated.keys().next().value!);
    validated.set(data.text, layout);
  }
  if (
    layout.width !== data.width ||
    layout.height !== data.height ||
    layout.x !== data.inkX ||
    layout.y !== data.baseline
  )
    throw Error("text-layout-mismatch");
  const { tile } = data,
    w = Math.ceil(tile.width * tile.density - 1e-7),
    h = Math.ceil(tile.height * tile.density - 1e-7);
  if (w < 1 || h < 1 || w > 512 || h > 512 || new TextEncoder().encode(data.text).length > 16384)
    throw Error("text-raster-limit");
  const canvas = new OffscreenCanvas(w + 4, h + 4),
    context = canvas.getContext("2d");
  if (!context) throw Error("text-render-unavailable");
  context.scale(tile.density, tile.density);
  context.translate(2 / tile.density - tile.x, 2 / tile.density - tile.y);
  context.font = TEXT_FONT;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillStyle = "#" + data.color.toString(16).padStart(6, "0");
  let lines = measured.get(data.text);
  if (!lines) {
    lines = data.text.split("\n").map((line) => {
      const metrics = context.measureText(line);
      return {
        line,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent,
      };
    });
    if (measured.size >= 8) measured.delete(measured.keys().next().value!);
    measured.set(data.text, lines);
  }
  for (let i = 0; i < lines.length; i++) {
    const baseline = data.baseline + i * TEXT_LINE,
      line = lines[i],
      gutter = 2 / tile.density;
    if (
      baseline + line.descent < tile.y - gutter ||
      baseline - line.ascent > tile.y + tile.height + gutter
    )
      continue;
    context.fillText(line.line, data.inkX, baseline);
  }
  const bitmap = await createImageBitmap(canvas, { premultiplyAlpha: "premultiply" });
  return bitmap;
}
