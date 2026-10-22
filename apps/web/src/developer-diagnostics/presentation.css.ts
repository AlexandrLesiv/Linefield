import { style } from "@vanilla-extract/css";
import { theme } from "../theme.css.ts";
export const panel = style({
  boxSizing: "border-box",
  position: "absolute",
  insetInlineEnd: 8,
  insetBlockStart: 8,
  width: "min(24rem, calc(100vw - 16px))",
  maxWidth: "calc(100% - 16px)",
  maxHeight: "calc(100dvh - 16px)",
  overflowY: "auto",
  overflowX: "hidden",
  padding: 12,
  border: `1px solid ${theme.line}`,
  borderRadius: 12,
  background: theme.surface,
  color: theme.text,
  fontSize: "0.875rem",
  zIndex: 5,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  selectors: { "&[hidden]": { display: "none" } },
  "@media": { "(forced-colors: active)": { borderColor: "CanvasText" } },
});
export const title = style({ margin: 0, fontSize: "1rem", fontWeight: 600, outlineOffset: 3 });
export const heading = style({ margin: 0, fontSize: "0.875rem", fontWeight: 600 });
export const group = style({ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 });
export const actions = style({ display: "flex", gap: 8, flexWrap: "wrap" });
export const action = style({
  minHeight: 44,
  minWidth: 44,
  maxWidth: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${theme.line}`,
  color: theme.text,
  background: theme.surface,
  font: "inherit",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  selectors: {
    "&:disabled": { cursor: "not-allowed" },
    "&:not(:disabled):hover": { background: theme.buttonHover },
    "&:focus-visible": { outline: `2px solid ${theme.focus}`, outlineOffset: 2 },
  },
  "@media": { "(forced-colors: active)": { borderColor: "ButtonText" } },
});
export const copy = style({ margin: 0, overflowWrap: "anywhere" });
export const muted = style([copy, { color: theme.muted }]);
export const error = style([copy, { color: theme.error }]);
export const list = style({ display: "grid", gap: 8, margin: 0, minWidth: 0 });
export const row = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
  minWidth: 0,
});
export const value = style({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  unicodeBidi: "isolate",
});
export const pin = style({ display: "flex", gap: 8, alignItems: "center", minHeight: 44 });
export const overlay = style({
  position: "absolute",
  insetInlineEnd: 8,
  width: "max-content",
  maxWidth: "min(22rem, calc(100% - 16px))",
  boxSizing: "border-box",
  padding: 8,
  borderRadius: 8,
  border: `1px solid ${theme.line}`,
  background: theme.surface,
  color: theme.text,
  fontSize: "0.75rem",
  fontVariantNumeric: "tabular-nums",
  pointerEvents: "none",
  userSelect: "none",
  zIndex: 1,
  overflowWrap: "anywhere",
  selectors: { "&[hidden]": { display: "none" } },
  "@media": { "(forced-colors: active)": { borderColor: "CanvasText" } },
});
export const overlayRow = style({ margin: 0, pointerEvents: "none" });
export const announcement = style({
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
});
