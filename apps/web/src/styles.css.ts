import { assignVars, globalStyle } from "@vanilla-extract/css";
import { theme, light, dark } from "./theme.css.ts";
import "./dialog.css.ts";
import "./cards.css.ts";
import "./cards-responsive.css.ts";
import "./canvas.css.ts";
globalStyle(":root", {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  colorScheme: "light dark",
  vars: assignVars(theme, light),
  background: "var(--background)",
  color: "var(--text)",
});
globalStyle(":root", {
  "@media": {
    "(prefers-color-scheme: dark)": {
      vars: assignVars(theme, dark),
    },
  },
});
globalStyle("*", {
  boxSizing: "border-box",
  WebkitTapHighlightColor: "transparent",
});
globalStyle("body", {
  margin: "0",
  minWidth: "280px",
});
globalStyle("button, input", {
  font: "inherit",
  color: "inherit",
});
globalStyle("button", {
  cursor: "pointer",
});
globalStyle("button:focus-visible", {
  outline: "3px solid var(--text)",
  outlineOffset: "4px",
});
globalStyle(".app-toolbar", {
  minHeight: "88px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "20px 32px",
});
globalStyle("h1", {
  fontSize: "20px",
  letterSpacing: "-0.04em",
  margin: "0",
});
globalStyle(".gallery", {
  transition: "opacity 200ms",
});
globalStyle(".gallery.away", {
  opacity: "0",
});
globalStyle(".prototype-label", {
  padding: "12px 32px",
  color: "var(--muted)",
  fontSize: "12px",
});
globalStyle(".sr-only", {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
});
globalStyle(".drawing-open", {
  overflow: "hidden",
});
globalStyle(".app-toolbar", {
  "@media": {
    "(max-width: 600px)": {
      padding: "16px",
      alignItems: "start",
    },
  },
});
globalStyle(".prototype-label", {
  "@media": {
    "(max-width: 600px)": {
      padding: "16px",
    },
  },
});
globalStyle("*, *::before, *::after", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transition: "none !important",
      animation: "none !important",
      scrollBehavior: "auto",
    },
  },
});
