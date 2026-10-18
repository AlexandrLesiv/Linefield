import { globalStyle, style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";

export const track = style({
  position: "fixed",
  insetBlock: 4,
  insetInlineEnd: 0,
  width: 20,
  zIndex: 25,
  touchAction: "none",
  selectors: { "&[hidden]": { display: "none" } },
});
export const thumb = style({
  position: "absolute",
  insetInlineEnd: 4,
  top: 0,
  width: 6,
  minHeight: 32,
  borderRadius: 8,
  background: theme.muted,
  opacity: 0.55,
  cursor: "grab",
  outlineOffset: 2,
  selectors: {
    "&:hover, &:focus-visible": { opacity: 1 },
    "&::before": { content: '""', position: "absolute", inset: "0 -7px" },
    "&:active": { cursor: "grabbing" },
  },
  "@media": {
    "(forced-colors: active)": {
      background: "ButtonText",
      border: "1px solid Canvas",
      opacity: 1,
      forcedColorAdjust: "none",
    },
  },
});
globalStyle('html[data-overlay-scrollbar="ready"]', {
  scrollbarWidth: "none",
  scrollbarGutter: "auto",
});
globalStyle('html[data-overlay-scrollbar="ready"]::-webkit-scrollbar', { display: "none" });
