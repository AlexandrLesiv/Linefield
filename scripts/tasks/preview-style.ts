import type { TokenLookup } from "../diagrams/tokens.ts";

export function previewStyle(tokens: TokenLookup): string {
  const c = (name: string) => tokens(`diagram.color.${name}`, "color");
  const size = (name: string) => tokens(`diagram.size.${name}`, "dimension") + "px";
  const font = tokens("diagram.font.family", "fontFamily");
  return `
html { scrollbar-gutter: stable; }
* { box-sizing: border-box; }
body { margin: 0; background: ${c("panel")}; color: ${c("ink")}; font-family: ${font}; font-size: ${size("body")}; line-height: 1.6; overflow-wrap: anywhere; }
.page { max-width: 720px; padding: 80px 24px; margin: auto; }
a { color: inherit; text-underline-offset: 4px; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible, summary:focus-visible { outline: 3px solid ${c("ink")}; outline-offset: 5px; border-radius: 3px; }
.skip { position: absolute; top: -100px; padding: 12px; background: ${c("panel")}; }
.skip:focus { top: 8px; }
.back { display: inline-block; margin-bottom: 44px; color: ${c("muted")}; text-decoration: none; }
h1 { font-size: calc(${size("title")} * .8); line-height: 1.25; letter-spacing: -.02em; margin: 0 0 12px; }
h2 { font-size: ${size("node")}; line-height: 1.4; margin: 28px 0 16px; }
h3 { font-size: ${size("body")}; line-height: 1.5; margin: 24px 0 10px; }
p { margin: 0 0 16px; }
.status, .meta, .back { color: ${c("muted")}; }
.status { margin: 0; }
.meta { font-size: ${size("meta")}; }
.lead { white-space: pre-line; font-size: 18px; margin: 36px 0 28px; max-width: 540px; }
.primary { display: inline-block; border-radius: ${size("labelRadius")}; padding: 10px 20px; background: ${c("ink")}; color: ${c("panel")}; font-weight: 600; text-decoration: none; }
.primary:hover { text-decoration: underline; }
.blocker { border-left: 2px solid ${c("divider")}; padding-left: 16px; margin-bottom: 28px; }
.groups { margin-top: 48px; }
.group { border-top: 1px solid ${c("divider")}; }
.group:last-child { border-bottom: 1px solid ${c("divider")}; }
.group > summary { padding: 22px 0; font-weight: 500; }
summary { cursor: pointer; padding: 12px 0; }
summary::marker { color: ${c("muted")}; }
.group-content { padding: 0 0 28px 20px; }
.group-content > section:first-child h2 { margin-top: 8px; }
.group-content details { margin-top: 12px; }
.panel { margin: 0 0 28px; }
.item { padding: 18px 0; border-bottom: 1px solid ${c("divider")}; }
.item:last-child { border-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.tag { color: ${c("muted")}; font-size: ${size("meta")}; }
.warning { color: ${c("muted")}; }
code, .digest { font-family: ui-monospace, monospace; font-size: ${size("meta")}; overflow-wrap: anywhere; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: ${size("meta")}; line-height: 1.6; background: ${c("canvas")}; padding: 16px; max-height: 440px; overflow-y: auto; }
ul { padding-left: 22px; margin: 8px 0 18px; }
.task-list { padding: 0; margin: 36px 0 0; list-style: none; }
.task-list li { border-bottom: 1px solid ${c("divider")}; }
.task-list a { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 18px 0; text-decoration: none; }
.task-list a:hover > span:first-child { text-decoration: underline; }
.task-id { display: block; color: ${c("muted")}; font-size: ${size("meta")}; }
.source-link { margin-top: 24px; }
.task-list .status { flex-shrink: 0; font-size: ${size("meta")}; }
@media (max-width: 600px) {
  .page { padding: 32px 24px; }
  .task-list a { flex-direction: column; gap: 4px; }
  .back { margin-bottom: 36px; }
  .lead { margin-top: 28px; }
  .group-content { padding-left: 8px; }
}
@media print { .page { padding: 0; } .back, .skip { display: none; } }
`;
}
