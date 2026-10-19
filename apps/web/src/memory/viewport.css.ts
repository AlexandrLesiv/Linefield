import { style } from "@vanilla-extract/css";
import { theme } from "../theme.css.ts";
export const paperControl = style({
  selectors: {
    "&:is(button)": { color: theme.paperText, background: theme.paper },
    "&:is(button):not(:disabled):hover": { background: theme.paperHover },
  },
});
export const armed = style({ cursor: "grab" });
export const dragging = style({ cursor: "grabbing" });
export const zoomGroup = style({
  selectors: { "&:is(span)": { paddingBlock: 0 } },
  display: "flex",
  alignItems: "center",
  gap: "4px",
  pointerEvents: "auto",
  flexShrink: 0,
});
export const zoomButton = style({
  selectors: { "&:is(button)": { width: "44px", height: "44px", minHeight: "44px" } },
});
export const zoomValue = style({
  minWidth: "3.5em",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});
