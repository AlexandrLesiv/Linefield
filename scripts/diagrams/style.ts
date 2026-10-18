import type { TokenLookup } from "./tokens.ts";
export function diagramStyle(tokens: TokenLookup): string {
  const color = (name: string) => tokens(`diagram.color.${name}`, "color");
  const size = (name: string) => tokens(`diagram.size.${name}`, "dimension");
  const weight = tokens("diagram.font.weight", "fontWeight");
  const tracking = size("tracking").replace(/^(-?)0\./, "$1.");
  return (
    `text{font-family:${tokens("diagram.font.family", "fontFamily")};fill:${color("ink")}}` +
    `.title{font-size:${size("title")}px;font-weight:${weight};letter-spacing:${tracking}px}` +
    `.section{font-size:${size("section")}px;font-weight:${weight}}` +
    `.node{font-size:${size("node")}px;font-weight:${weight}}` +
    `.body{font-size:${size("body")}px}` +
    `.meta{font-size:${size("meta")}px;fill:${color("muted")}}` +
    `.edge{fill:none;stroke:${color("edge")};stroke-width:${size("arrow")};stroke-linejoin:round;stroke-linecap:round;marker-end:url(#arrow)}` +
    `.guide{fill:none;stroke:${color("edge")};stroke-width:${size("border")};stroke-dasharray:${size("dash")} ${size("gap")}}`
  );
}
