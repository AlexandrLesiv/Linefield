import { TEXT_FONT, textFont } from "./font";
export const TEXT_LINE = 40;
export type TextLayout = {
  text: string;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fallback: boolean;
};
export async function textLayout(text: string): Promise<TextLayout> {
  const covers = await textFont();
  if (new TextEncoder().encode(text).length > 16384 || text.includes("\0"))
    throw Error("text-limit");
  const lines = text.split("\n");
  if (lines.length > 256) throw Error("text-limit");
  const canvas = new OffscreenCanvas(1, 1),
    context = canvas.getContext("2d");
  if (!context) throw Error("text-render-unavailable");
  context.font = TEXT_FONT;
  context.textBaseline = "alphabetic";
  let left = 0,
    right = 0,
    top = -32,
    bottom = (lines.length - 1) * TEXT_LINE + 8;
  for (let i = 0; i < lines.length; i++) {
    const m = context.measureText(lines[i]);
    left = Math.min(left, -m.actualBoundingBoxLeft);
    right = Math.max(right, m.width, m.actualBoundingBoxRight);
    top = Math.min(top, i * TEXT_LINE - m.actualBoundingBoxAscent);
    bottom = Math.max(bottom, i * TEXT_LINE + m.actualBoundingBoxDescent);
  }
  const width = Math.ceil(right - left) + 4,
    height = Math.ceil(bottom - top) + 4;
  if (width > 65536 || height > 65536) throw Error("text-layout-limit");
  return {
    text,
    lines,
    x: 2 - left,
    y: 2 - top,
    width,
    height,
    fallback: [...text].some(
      (char) => char !== "\n" && char !== "\t" && !covers(char.codePointAt(0) || 0),
    ),
  };
}
export function paintText(
  context: OffscreenCanvasRenderingContext2D,
  layout: TextLayout,
  color: number,
) {
  context.font = TEXT_FONT;
  context.textBaseline = "alphabetic";
  context.fillStyle = "#" + (color >>> 0).toString(16).padStart(6, "0");
  for (let i = 0; i < layout.lines.length; i++)
    context.fillText(layout.lines[i], layout.x, layout.y + i * TEXT_LINE);
}
