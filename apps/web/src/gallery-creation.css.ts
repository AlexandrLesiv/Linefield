import { theme } from "./theme.css.ts";
import { style } from "@vanilla-extract/css";
import { empty } from "./states.css.ts";
export const newCell = style({
  "@media": {
    "(max-width: 639px)": {
      display: "none",
      selectors: {
        [`${empty} &`]: {
          display: "block",
        },
      },
    },
    "(min-width: 640px)": {
      maxWidth: "420px",
    },
  },
  position: "relative",
  aspectRatio: "1",
  minWidth: "0",
  borderRadius: "12px",
  selectors: {
    [`${empty} &`]: {
      width: "min(360px, 100%)",
    },
  },
});
export const mobileCreate = style({
  "@media": {
    "(max-width: 639px)": {
      display: "block",
      position: "fixed",
      bottom: "max(24px, env(safe-area-inset-bottom))",
      right: "max(20px, env(safe-area-inset-right))",
      zIndex: "2",
      padding: "16px 22px",
      maxWidth: "calc(100vw - 40px)",
      minHeight: "44px",
      overflowWrap: "anywhere",
      border: `1px solid ${theme.line}`,
      borderRadius: "20px",
      background: theme.surface,
      color: theme.text,
      boxShadow: "0 4px 18px #0003",
      selectors: {
        [`${empty} &`]: {
          display: "none",
        },
      },
    },
  },
  display: "none",
});
export const newTile = style({
  width: "100%",
  height: "100%",
  padding: "0",
  border: `1px dashed ${theme.line}`,
  borderRadius: "12px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  background: theme.new,
  color: theme.text,
  fontSize: "58px",
  transition: "background 150ms,\n    box-shadow 150ms",
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      selectors: {
        "&:hover": {
          background: theme.surface,
          boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
        },
      },
    },
  },
  selectors: {
    "&:active": {
      filter: "brightness(0.96)",
    },
  },
});
export const newLabel = style({
  fontSize: "18px",
  fontWeight: "500",
});
