import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
globalStyle(".drawing-grid", {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "24px",
  maxWidth: "1372px",
  margin: "0 auto",
  padding: "16px 32px 32px",
});
globalStyle(".drawing-card, .new-cell", {
  position: "relative",
  aspectRatio: "1",
  minWidth: "0",
  borderRadius: "12px",
});
globalStyle(".drawing-tile, .new-tile", {
  width: "100%",
  height: "100%",
  padding: "0",
  border: "0",
  borderRadius: "12px",
  overflow: "hidden",
});
globalStyle(".drawing-tile", {
  display: "flex",
  flexDirection: "column",
  background: theme.paper,
  color: theme.paperText,
  textAlign: "left",
});
globalStyle(".artwork", {
  isolation: "isolate",
  width: "100%",
  flex: "1",
  minHeight: "0",
  background: theme.paper,
  padding: "18px",
  display: "grid",
  placeItems: "center",
});
globalStyle(".artwork img", {
  mixBlendMode: "darken",
  width: "100%",
  height: "100%",
  minHeight: "0",
  objectFit: "contain",
  pointerEvents: "none",
});
globalStyle(".drawing-name", {
  padding: "14px 60px 16px 16px",
  fontSize: "15px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
globalStyle(".more", {
  position: "absolute",
  bottom: "6px",
  right: "8px",
  width: "44px",
  height: "40px",
  border: "0",
  borderRadius: "8px",
  background: "transparent",
  color: theme.paperText,
  fontSize: "22px",
});
globalStyle('.more:hover, .more[aria-expanded="true"]', {
  background: theme.paperHover,
});
globalStyle(".new-tile", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  background: "var(--new)",
  color: "var(--text)",
  border: "1px dashed var(--line)",
  fontSize: "58px",
  transition: "background 150ms,\n    box-shadow 150ms",
});
globalStyle(".new-tile span", {
  fontSize: "18px",
  fontWeight: "500",
});
globalStyle(".new-tile:hover", {
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      background: "var(--surface)",
      boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
    },
  },
});
globalStyle(".drawing-card", { transition: "box-shadow 150ms ease" });
globalStyle(".drawing-card:hover", {
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
    },
  },
});
globalStyle(".drawing-card[data-menu-open]", {
  boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
});
globalStyle(".drawing-tile:active, .new-tile:active", {
  filter: "brightness(0.96)",
});
globalStyle(".removed .drawing-tile", {
  visibility: "hidden",
});
globalStyle(".removal", {
  position: "absolute",
  inset: "0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  padding: "20px",
  borderRadius: "12px",
  background: "var(--surface)",
  textAlign: "center",
  overflowWrap: "anywhere",
});
globalStyle(".undo", {
  padding: "10px 20px",
  background: "var(--text)",
  color: "var(--background)",
  border: "0",
  borderRadius: "8px",
});
globalStyle(".mobile-create", {
  display: "none",
});
globalStyle(".empty .drawing-grid", {
  minHeight: "calc(100dvh - 140px)",
  display: "grid",
  placeItems: "center",
});
globalStyle(".empty .new-cell", {
  width: "min(360px, 100%)",
});
globalStyle(".empty-message", {
  textAlign: "center",
  padding: "64px 20px",
});
globalStyle(".drawing-card[data-renaming]", { boxShadow: "0 5px 18px rgb(0 0 0 / 16%)" });
globalStyle(".drawing-card[data-renaming] .drawing-name", { opacity: 1 });
