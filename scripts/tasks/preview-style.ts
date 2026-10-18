import type { TokenLookup } from "../diagrams/tokens.ts";

export function previewStyle(tokens: TokenLookup): string {
  const c = (name: string) => tokens(`diagram.color.${name}`, "color");
  const size = (name: string) => tokens(`diagram.size.${name}`, "dimension") + "px";
  const weight = tokens("diagram.font.weight", "fontWeight");
  const font = tokens("diagram.font.family", "fontFamily");
  return `
* { box-sizing: border-box; }
body { margin: 0; background: ${c("canvas")}; color: ${c("ink")}; font-family: ${font}; font-size: ${size("body")}; line-height: 1.6; overflow-wrap: anywhere; }
.page { max-width: 1360px; padding: 32px 48px; margin: auto; }
a { color: inherit; text-underline-offset: 4px; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible, summary:focus-visible { outline: 3px solid ${c("ink")}; outline-offset: 5px; border-radius: 3px; }
.skip { position: absolute; top: -100px; padding: 12px; background: ${c("panel")}; }
.skip:focus { top: 8px; z-index: 2; }
.mast { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 28px; border-bottom: 1px solid ${c("divider")}; }
.eyebrow, .label { font-size: ${size("meta")}; text-transform: uppercase; letter-spacing: .12em; font-weight: ${weight}; }
.eyebrow { margin-top: 32px; color: ${c("muted")}; }
h1 { font-size: ${size("title")}; line-height: 1.15; letter-spacing: -.025em; margin: 14px 0 18px; max-width: 900px; }
h2 { font-size: ${size("section")}; line-height: 1.25; margin: 0 0 22px; letter-spacing: -.02em; }
h3 { font-size: ${size("node")}; line-height: 1.4; margin: 22px 0 10px; }
p { margin: 0 0 16px; }
.lead { font-size: 18px; max-width: 850px; color: ${c("muted")}; }
.muted, .meta { color: ${c("muted")}; }
.meta { font-size: ${size("meta")}; }
.attention { margin: 30px 0 0; background: ${c("command")}; border: 1px solid ${c("divider")}; border-radius: 20px; padding: 24px 28px; }
.attention.blocked { background: ${c("unknown")}; }
.attention h2 { font-size: ${size("node")}; margin-bottom: 8px; }
.attention p { margin: 0; }
.facts { display: grid; grid-template-columns: repeat(3, 1fr); margin: 26px 0 36px; border-block: 1px solid ${c("divider")}; }
.fact { padding: 18px 22px 18px 0; }
.fact + .fact { border-left: 1px solid ${c("divider")}; padding-left: 22px; }
.fact strong { display: block; font-size: 18px; }
.layout { display: grid; grid-template-columns: 180px minmax(0,1fr); gap: 40px; }
.section-nav { align-self: start; position: sticky; top: 24px; }
.section-nav a { display: block; margin: 0 0 14px; color: ${c("muted")}; }
.panel { background: ${c("panel")}; border: 1px solid ${c("divider")}; border-radius: ${size("panelRadius")}; padding: 32px; margin-bottom: 24px; scroll-margin-top: 24px; }
.tag { display: inline-block; border: 1px solid ${c("divider")}; padding: 2px 9px; border-radius: 6px; font-size: ${size("meta")}; font-weight: ${weight}; }
.item { padding-block: 18px; border-top: 1px solid ${c("divider")}; }
.item:first-of-type { border-top: 0; padding-top: 0; }
.item p:last-child { margin-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
.warning { background: ${c("unknown")}; padding: 16px; border-radius: ${size("participantRadius")}; }
code, .digest { font-family: ui-monospace, monospace; font-size: ${size("meta")}; overflow-wrap: anywhere; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: ${size("meta")}; line-height: 1.6; background: ${c("canvas")}; padding: 18px; border-radius: ${size("participantRadius")}; max-height: 440px; overflow-y: auto; }
summary { cursor: pointer; padding-block: 10px; font-weight: ${weight}; }
details { border-top: 1px solid ${c("divider")}; margin-top: 12px; }
.document { padding: 16px 0; }
ul { padding-left: 22px; margin: 8px 0 18px; }
.cards { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 24px; margin-top: 36px; }
.card { display: flex; flex-direction: column; align-items: start; margin-bottom: 0; }
.card h2 { margin-top: 20px; }
.card .open { margin-top: auto; padding-top: 24px; font-weight: ${weight}; }
footer { border-top: 1px solid ${c("divider")}; margin-top: 32px; padding-top: 24px; font-size: ${size("meta")}; color: ${c("muted")}; }
@media (max-width: 760px) {
  .page { padding: 20px; }
  h1 { font-size: 32px; }
  .layout, .cards { grid-template-columns: 1fr; gap: 12px; }
  .panel { padding: 22px; }
  .section-nav { position: static; display: flex; flex-wrap: wrap; gap: 8px 18px; }
  .section-nav a { margin-bottom: 8px; }
  .facts { grid-template-columns: 1fr; }
  .fact + .fact { border-left: 0; border-top: 1px solid ${c("divider")}; padding-left: 0; }
  .attention { padding: 22px; }
  .mast { flex-wrap: wrap; padding-bottom: 18px; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
@media print { .page { padding: 0; } .section-nav, .skip { display: none; } .layout { display: block; } }
`;
}
