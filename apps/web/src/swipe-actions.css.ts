import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
globalStyle(".swipe-card", { overflow: "hidden" });
globalStyle(".swipe-card .drawing-tile", {
  position: "relative",
  zIndex: "1",
  touchAction: "pan-y",
  transition: "transform 200ms ease",
});
globalStyle(".swipe-card[data-swiped] .drawing-tile", { transform: "translateX(-160px)" });
globalStyle(".swipe-actions", {
  position: "absolute",
  inset: "0 0 0 auto",
  width: "160px",
  display: "flex",
  alignItems: "stretch",
});
globalStyle(".swipe-actions button", {
  width: "80px",
  border: "0",
  borderRadius: "0",
  padding: "8px",
  background: "var(--text)",
  color: "var(--background)",
  overflowWrap: "anywhere",
});
globalStyle(".swipe-actions .delete", {
  background: theme.destructiveSurface,
  color: theme.onDestructive,
});
globalStyle(".swipe-access", {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  padding: "0",
  border: "0",
});
globalStyle(".swipe-access:focus-visible", {
  width: "auto",
  height: "auto",
  clipPath: "none",
  bottom: "8px",
  right: "8px",
  padding: "10px",
  zIndex: "2",
  background: "var(--surface)",
  color: "var(--text)",
});
globalStyle(".swipe-card .drawing-tile", {
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
globalStyle(".swipe-actions", { opacity: "0", transition: "opacity 200ms ease" });
globalStyle(".swipe-card[data-swiped] .swipe-actions", { opacity: "1" });
