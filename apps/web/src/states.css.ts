import { style } from "@vanilla-extract/css";
import { gallery } from "./styles.css.ts";
export const empty = style({});
export const removed = style({});
export const away = style({
  selectors: {
    [`${gallery}&`]: {
      opacity: "0",
    },
  },
});
