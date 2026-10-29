import { style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
export const frame = style({
  position: "fixed",
  top: 52,
  left: 0,
  width: "100vw",
  height: "calc(100dvh - 52px)",
  border: 0,
  zIndex: 12,
  background: theme.paper,
});
export const header = style({
  position: "absolute",
  inset: "0 0 auto",
  height: 52,
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "0 16px",
  background: theme.surface,
  color: theme.text,
  zIndex: 13,
});
