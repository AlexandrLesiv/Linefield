import { record } from "./tokens.ts";
import type { TokenLookup } from "./tokens.ts";
import { diagramStyle } from "./style.ts";
export type DiagramElement = {
  tag: "rect" | "path" | "text";
  attrs: Record<string, string | number>;
  text?: string;
};
export type Diagram = {
  width: number;
  height: number;
  title: string;
  description: string;
  elements: DiagramElement[];
};
export function xmlEscape(value: string): string {
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    if (
      (point < 32 && ![9, 10, 13].includes(point)) ||
      (point >= 0xd800 && point <= 0xdfff) ||
      point === 0xfffe ||
      point === 0xffff
    )
      throw new Error("Invalid XML text");
  }
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
const numeric = new Set(["x", "y", "width", "height", "rx", "stroke-width"]);
function attribute(key: string, value: unknown, tokens: TokenLookup): string {
  if (typeof value !== "string" && typeof value !== "number")
    throw new Error("Invalid SVG attribute value");
  let raw = String(value);
  if (raw.startsWith("{")) {
    if (!/^\{[a-zA-Z0-9.-]+\}$/.test(raw)) throw new Error("Invalid SVG token reference");
    raw = tokens(raw.slice(1, -1), key === "fill" || key === "stroke" ? "color" : "dimension");
  }
  let valid = false;
  if (numeric.has(key)) valid = /^-?\d+(\.\d+)?$/.test(raw) && Number.isFinite(Number(raw));
  if (key === "fill" || key === "stroke") valid = /^(#[0-9A-Fa-f]{6}|none)$/.test(raw);
  if (key === "d") valid = /^[MLHVCSQTAZmlhvcsqtaz0-9., -]+$/.test(raw);
  if (key === "class") valid = /^(title|section|node|body|meta|edge|guide)$/.test(raw);
  if (key === "text-anchor") valid = /^(start|middle|end)$/.test(raw);
  if (!valid) throw new Error(`Unsupported or unsafe SVG attribute: ${key}`);
  return `${key}="${xmlEscape(raw)}"`;
}
export function renderDiagram(input: unknown, tokens: TokenLookup): string {
  if (
    !record(input) ||
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    typeof input.width !== "number" ||
    typeof input.height !== "number" ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > 20000 ||
    input.height > 20000 ||
    typeof input.title !== "string" ||
    typeof input.description !== "string" ||
    !Array.isArray(input.elements)
  ) {
    throw new Error("Invalid diagram document");
  }
  const elements = input.elements.map((element: unknown) => {
    if (
      !record(element) ||
      !["rect", "path", "text"].includes(String(element.tag)) ||
      !record(element.attrs)
    )
      throw new Error("Unsupported SVG element");
    const attrs = Object.entries(element.attrs)
      .map(([key, value]) => attribute(key, value, tokens))
      .join(" ");
    if (element.tag === "text") {
      if (typeof element.text !== "string") throw new Error("Missing SVG text");
      return `<text ${attrs}>${xmlEscape(element.text)}</text>`;
    }
    if (element.text !== undefined) throw new Error("Unexpected shape text");
    return `<${element.tag} ${attrs}/>`;
  });
  const edge = tokens("diagram.color.edge", "color");
  const border = tokens("diagram.size.border", "dimension");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" role="img" aria-labelledby="title description">\n` +
    `<title id="title">${xmlEscape(input.title)}</title>\n<desc id="description">${xmlEscape(input.description)}</desc>\n` +
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="${edge}" stroke-width="${border}"/></marker><style>${diagramStyle(tokens)}</style></defs>\n` +
    elements.join("\n") +
    "\n</svg>\n"
  );
}
