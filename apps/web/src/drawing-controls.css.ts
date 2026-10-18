import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
globalStyle(".drawing-tool", {
  display: "grid",
  placeItems: "center",
  width: "48px",
  height: "48px",
  minHeight: "48px",
  flexShrink: 0,
  border: "1px solid transparent",
  borderRadius: "10px",
  padding: "10px",
  background: "transparent",
  color: theme.text,
});
globalStyle(".drawing-tool svg", { width: "28px", height: "28px" });
globalStyle('.drawing-tool[aria-pressed="true"]', { background: theme.text, color: theme.surface });
globalStyle(".drawing-tool:disabled", { cursor: "not-allowed", opacity: 0.5 });
globalStyle(".drawing-tool:not(:disabled):hover, .back:hover", { background: theme.buttonHover });
globalStyle('.drawing-tool[aria-pressed="true"]:hover', { background: theme.primaryHover });
globalStyle(".drawing-color", {
  marginTop: "8px",
  borderTop: `1px solid ${theme.line}`,
  borderRadius: 0,
  paddingTop: "14px",
  height: "58px",
});
globalStyle(".color-swatch", {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: theme.text,
  outline: `1px solid ${theme.text}`,
  outlineOffset: "3px",
});
globalStyle(".drawing-property", {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexShrink: 0,
  minHeight: "48px",
});
globalStyle(".drawing-property svg", { width: "24px", height: "24px", flexShrink: 0 });
globalStyle(".property-value", {
  minWidth: "3.5ch",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});
globalStyle(".drawing-property input", {
  width: "100px",
  minHeight: "44px",
  margin: 0,
  accentColor: theme.text,
  cursor: "pointer",
});
globalStyle(".property-width input", {
  width: "clamp(120px, 22vw, 340px)",
  appearance: "none",
  background: "transparent",
  position: "relative",
});
globalStyle(".property-track", { position: "relative", display: "flex", alignItems: "center" });
globalStyle(".property-width .property-track::before", {
  content: '""',
  position: "absolute",
  left: 0,
  right: 0,
  height: "18px",
  background: theme.muted,
  clipPath: "polygon(0 47%, 100% 0, 100% 100%, 0 53%)",
  borderRadius: "10px",
  pointerEvents: "none",
});
globalStyle(".property-width input::-webkit-slider-runnable-track", {
  height: "18px",
  background: "transparent",
});
globalStyle(".property-width input::-webkit-slider-thumb", {
  appearance: "none",
  width: "24px",
  height: "24px",
  marginTop: "-3px",
  background: theme.surface,
  border: `1px solid ${theme.line}`,
  borderRadius: "50%",
});
globalStyle(".property-width input::-moz-range-track", {
  height: "18px",
  background: "transparent",
});
globalStyle(".property-width input::-moz-range-thumb", {
  width: "24px",
  height: "24px",
  background: theme.surface,
  border: `1px solid ${theme.line}`,
  borderRadius: "50%",
});
globalStyle(".property-opacity, .property-smoothing", {
  borderLeft: `1px solid ${theme.line}`,
  paddingLeft: "20px",
});
globalStyle(".stroke-preview", {
  width: "72px",
  minWidth: "72px",
  height: "44px",
  display: "grid",
  placeItems: "center",
});
globalStyle(".stroke-preview svg", { width: "64px", height: "40px", overflow: "visible" });
globalStyle(".context-empty", { color: theme.muted, whiteSpace: "nowrap" });
globalStyle(".drawing-chrome [hidden]", { display: "none" });
globalStyle(".drawing-chrome :focus-visible", {
  outline: `2px solid ${theme.focus}`,
  outlineOffset: "2px",
});
globalStyle(".drawing-chrome", {
  "@media": { "(forced-colors: active)": { color: "CanvasText" } },
});
globalStyle('.drawing-tool[aria-pressed="true"]', {
  "@media": { "(forced-colors: active)": { borderColor: "Highlight", color: "Highlight" } },
});
globalStyle(".property-width input", {
  "@media": { "(forced-colors: active)": { appearance: "auto" } },
});
