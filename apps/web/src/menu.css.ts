import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
globalStyle(".gallery-menu", {
  position: "fixed",
  zIndex: "1000",
  boxSizing: "border-box",
  overflow: "hidden",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: "10px",
  background: theme.surface,
  color: theme.text,
  boxShadow: "0 12px 36px #0003,\n    0 2px 8px #0002",
});
globalStyle(".gallery-menu-content", {
  boxSizing: "border-box",
  padding: "5px",
  overflowY: "auto",
  overscrollBehavior: "contain",
});
globalStyle(".gallery-menu button", {
  display: "block",
  width: "100%",
  minHeight: "34px",
  padding: "7px 12px",
  border: "0",
  borderRadius: "5px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "start",
  cursor: "pointer",
});
globalStyle(".gallery-menu button:hover, .gallery-menu button:focus-visible", {
  background: "color-mix(in srgb, currentColor 12%, transparent)",
  outline: "2px solid transparent",
  outlineOffset: "-2px",
});
globalStyle(".gallery-menu button.destructive", {
  color: theme.destructive,
});
globalStyle('[data-platform="windows"] .gallery-menu', {
  borderRadius: "7px",
});
globalStyle('[data-platform="android"] .gallery-menu', {
  borderRadius: "16px",
});
globalStyle(
  '[data-platform="android"] .gallery-menu button, [data-platform="ios"] .gallery-menu button, [data-platform="ipados"] .gallery-menu button',
  {
    minHeight: "44px",
  },
);
globalStyle('[data-platform="ios"] .gallery-menu, [data-platform="ipados"] .gallery-menu', {
  borderRadius: "14px",
});
globalStyle(".gallery-menu button:focus-visible", {
  "@media": {
    "(forced-colors: active)": {
      outlineColor: "Highlight",
    },
  },
});
