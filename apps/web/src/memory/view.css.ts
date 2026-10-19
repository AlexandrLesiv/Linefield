import { style } from "@vanilla-extract/css";
import { theme } from "../theme.css.ts";
export const canvas = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  background: "#ffffff",
  selectors: { "&:focus-visible": { outline: `2px solid ${theme.focus}`, outlineOffset: "-3px" } },
});
export const overlay = style({
  position: "absolute",
  left: "88px",
  right: "16px",
  top: "144px",
  bottom: "110px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  selectors: { "&[hidden]": { display: "none" } },
  "@media": {
    "(max-width: 600px)": { left: "68px" },
  },
});
export const message = style({
  display: "flex",
  flexDirection: "column",
  maxWidth: "34rem",
  minWidth: 0,
  maxHeight: "100%",
  overflow: "auto",
  padding: "4px",
  borderRadius: "8px",
  color: theme.paperText,
  background: theme.paper,
  pointerEvents: "auto",
  textAlign: "center",
  overflowWrap: "anywhere",
});
export const fixed = style({ color: theme.muted, fontSize: "0.75rem", minWidth: "max-content" });
export const statusText = style({ overflowY: "auto", minHeight: 0, margin: "0 0 8px" });
export const lifetime = style({
  maxHeight: "33dvh",
  minHeight: 0,
  overflowY: "auto",
  pointerEvents: "auto",
  selectors: { "&:focus-visible": { outline: `2px solid ${theme.focus}` } },
  "@media": { "(max-height: 480px)": { maxHeight: "20dvh" } },
});
export const resumeIcon = style({ width: "24px", height: "24px", flexShrink: 0 });
export const foundationChrome = style({
  selectors: {
    "&:is(div)": { vars: { "--header-size": "calc(max(64px, 2em) + env(safe-area-inset-top))" } },
  },
});
export const foundationHeader = style({
  selectors: { "&:is(header)": { gridTemplateColumns: "max-content minmax(0, 1fr) 48px" } },
});
export const foundationFooter = style({
  maxHeight: "33dvh",
  "@media": {
    "(max-width: 600px)": {
      selectors: { "&:is(div)": { flexDirection: "column", alignItems: "stretch", gap: "4px" } },
    },
  },
});
export const retry = style({
  selectors: { "&:is(button)": { whiteSpace: "normal" } },
  overflowWrap: "anywhere",
  flexShrink: 0,
  maxWidth: "100%",
  alignSelf: "center",
});
