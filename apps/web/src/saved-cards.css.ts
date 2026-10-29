import { artwork } from "./cards.css.ts";
import { style } from "@vanilla-extract/css";
export const savedName = style({
  padding: "14px 16px 6px",
  fontSize: "15px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
});
export const savedDate = style({ padding: "0 16px 14px", fontSize: "12px", opacity: 0.7 });
export const whiteThumbnail = style([artwork, { background: "#fff" }]);
