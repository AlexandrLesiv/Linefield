import { style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
export const frame = style({
  position: "fixed",
  top: "var(--editor-header-height, 52px)",
  left: 0,
  width: "100vw",
  height: "calc(100dvh - var(--editor-header-height, 52px))",
  border: 0,
  zIndex: 12,
  background: theme.paper,
});
export const header = style({
  position: "absolute",
  inset: "0 0 auto",
  minHeight: 52,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 16,
  padding: "0 16px",
  background: theme.surface,
  color: theme.text,
  zIndex: 13,
  "@media": {
    "(max-width: 1000px)": {
      gridTemplateColumns: "auto minmax(0, 1fr)",
      gap: 8,
      padding: "8px 16px",
    },
  },
});

export const disclosure = style({
  "@media": { "(max-width: 1000px)": { gridColumn: "1 / -1" } },
});

export const title = style({ minWidth: 0, overflowWrap: "anywhere" });
