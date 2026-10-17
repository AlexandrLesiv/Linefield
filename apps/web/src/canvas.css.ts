import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
globalStyle(".drawing-surface", {
  isolation: "isolate",
  position: "fixed",
  inset: "0",
  width: "100vw",
  height: "100dvh",
  overflow: "hidden",
  background: theme.paper,
  color: theme.paperText,
  zIndex: "10",
});
globalStyle(".canvas-art", {
  mixBlendMode: "darken",
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "contain",
  background: "transparent",
});
globalStyle(".canvas-toolbar", {
  position: "absolute",
  top: "max(16px, env(safe-area-inset-top))",
  left: "max(16px, env(safe-area-inset-left))",
  right: "max(16px, env(safe-area-inset-right))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  transition: "opacity 100ms",
});
globalStyle(".canvas-title", {
  padding: "8px 14px",
  background: theme.paperTitle,
  backdropFilter: "blur(16px)",
  borderRadius: "10px",
  maxWidth: "65%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
globalStyle(".back", {
  padding: "10px 16px",
  border: `1px solid ${theme.paperLine}`,
  borderRadius: "10px",
  background: theme.paperControl,
  color: theme.paperText,
  backdropFilter: "blur(16px)",
});

globalStyle(".compose-edge", {
  position: "absolute",
  inset: 0,
  border: "1px solid",
  borderRadius: "inherit",
  pointerEvents: "none",
  zIndex: 1,
});
