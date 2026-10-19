import { style, assignVars, globalStyle } from "@vanilla-extract/css";
import { theme, light, dark } from "./theme.css.ts";
globalStyle(":root", {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  colorScheme: "light dark",
  vars: assignVars(theme, light),
  background: theme.background,
  color: theme.text,
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
globalStyle("*, *::before, *::after", {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      transition: "none !important",
      animation: "none !important",
      scrollBehavior: "auto",
    },
  },
});
export const appToolbar = style({
  minHeight: "88px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "20px 32px",
  "@media": {
    "(max-width: 600px)": {
      padding: "16px",
      alignItems: "start",
    },
  },
});
export const gallery = style({
  transition: "opacity 200ms",
});
export const prototypeLabel = style({
  padding: "12px 32px",
  color: theme.muted,
  fontSize: "12px",
  "@media": {
    "(max-width: 600px)": {
      padding: "16px",
    },
  },
});
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
});
export const drawingOpen = style({
  overflow: "hidden",
});
export const productTitle = style({
  fontSize: "20px",
  letterSpacing: "-0.04em",
  margin: "0",
});
