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
globalStyle(".drawing-chrome", {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  color: theme.text,
  vars: {
    "--rail-size": "72px",
    "--header-size": "calc(max(64px, 3em) + env(safe-area-inset-top))",
  },
  "@media": {
    "(max-width: 600px)": {
      vars: {
        "--rail-size": "56px",
        "--header-size": "calc(max(56px, 3em) + env(safe-area-inset-top))",
      },
    },
  },
});
globalStyle(".canvas-toolbar", {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "var(--header-size)",
  display: "grid",
  gridTemplateColumns: "minmax(max(88px, 4em), 1fr) minmax(0, 3fr) minmax(max(88px, 4em), 1fr)",
  alignItems: "center",
  gap: "8px",
  padding:
    "env(safe-area-inset-top) max(8px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left))",
  background: theme.surface,
  borderBottom: `1px solid ${theme.line}`,
  pointerEvents: "auto",
});
globalStyle(".canvas-toolbar > :last-child", { justifySelf: "end" });
globalStyle(".canvas-title", {
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
globalStyle(".back", {
  justifySelf: "start",
  minHeight: "44px",
  padding: "8px",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  color: theme.text,
  whiteSpace: "nowrap",
});
globalStyle(".drawing-rail", {
  position: "absolute",
  top: "var(--header-size)",
  bottom: 0,
  left: 0,
  width: "var(--rail-size)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "16px 4px",
  overflowY: "auto",
  background: theme.surface,
  borderRight: `1px solid ${theme.line}`,
  pointerEvents: "auto",
});
globalStyle(".drawing-context", {
  position: "absolute",
  top: "var(--header-size)",
  left: "var(--rail-size)",
  right: 0,
  minHeight: "72px",
  display: "flex",
  alignItems: "center",
  gap: "20px",
  padding: "8px 20px",
  overflowX: "auto",
  background: theme.surface,
  borderBottom: `1px solid ${theme.line}`,
  pointerEvents: "auto",
});
globalStyle(".canvas-footer", {
  position: "absolute",
  bottom: "max(12px, env(safe-area-inset-bottom))",
  left: "calc(var(--rail-size) + 16px)",
  right: "max(16px, env(safe-area-inset-right))",
  display: "flex",
  alignItems: "end",
  gap: "12px",
});
globalStyle(".canvas-notice", {
  margin: 0,
  flex: 1,
  minWidth: 0,
  overflowWrap: "anywhere",
  fontSize: "0.75rem",
  color: theme.paperMuted,
  background: theme.paper,
  padding: "4px 6px",
  borderRadius: "4px",
});
globalStyle(".canvas-zoom", {
  flexShrink: 0,
  color: theme.paperMuted,
  background: theme.paper,
  padding: "4px",
});
