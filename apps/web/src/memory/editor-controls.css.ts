import { theme } from "../theme.css.ts";
import { style } from "@vanilla-extract/css";
export const colorInput = style({
  width: 44,
  height: 44,
  padding: 2,
  border: 0,
  background: "transparent",
  cursor: "pointer",
  borderRadius: "50%",
  selectors: {
    "&::-webkit-color-swatch-wrapper": { padding: 0 },
    "&::-webkit-color-swatch": { borderRadius: "50%", border: "1px solid currentColor" },
  },
});
export const viewControls = style({
  color: theme.text,
  background: theme.surface,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  gap: 4,
  overflowX: "auto",
  maxWidth: "100%",
  pointerEvents: "auto",
  flexShrink: 0,
});
export const locked = style({ cursor: "not-allowed" });

export const viewButton = style({ color: theme.text });
