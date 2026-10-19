import { theme } from "./theme.css.ts";
import { style } from "@vanilla-extract/css";
export const renameDialog = style({
  padding: "24px",
  border: `1px solid ${theme.line}`,
  borderRadius: "14px",
  background: theme.surface,
  color: theme.text,
  width: "min(360px, calc(100vw - 32px))",
  selectors: {
    "&::backdrop": {
      background: "transparent",
    },
  },
});
export const dialogActions = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
});
export const primary = style({
  background: theme.text,
  color: theme.background,
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      selectors: {
        "&:hover:not(:active)": {
          background: theme.primaryHover,
        },
      },
    },
  },
  selectors: {
    "&:active": {
      background: theme.primaryPressed,
    },
  },
});
export const error = style({
  color: theme.error,
});
export const dialogHeading = style({
  margin: "0 0 24px",
  fontSize: "18px",
});
export const dialogLabel = style({
  display: "grid",
  gap: "8px",
  fontSize: "14px",
});
export const dialogInput = style({
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: `1px solid ${theme.line}`,
  background: theme.background,
});
export const dialogButton = style({
  padding: "8px 14px",
  border: `1px solid ${theme.line}`,
  borderRadius: "8px",
  minHeight: "44px",
  minWidth: "44px",
  transition: "background-color 120ms",
  "@media": {
    "(hover: hover) and (pointer: fine)": {
      selectors: {
        [`&:not(${primary}):hover:not(:active)`]: {
          background: theme.buttonHover,
        },
      },
    },
  },
  selectors: {
    [`&:not(${primary})`]: { background: theme.surface },
    [`&:not(${primary}):active`]: {
      background: theme.buttonPressed,
    },
  },
});
