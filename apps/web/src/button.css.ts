import { style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";

export const buttonControl = style({
  cursor: "pointer",
  selectors: {
    "&:where(:focus-visible)": {
      outline: `3px solid ${theme.text}`,
      outlineOffset: "4px",
    },
  },
});
