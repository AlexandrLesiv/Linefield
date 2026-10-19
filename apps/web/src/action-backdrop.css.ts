import { theme } from "./theme.css.ts";
import { style } from "@vanilla-extract/css";
export const actionBackdrop = style({
  position: "fixed",
  inset: "0",
  zIndex: "999",
  background: theme.scrim,
  touchAction: "none",
});
