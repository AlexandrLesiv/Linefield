import { style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
import { empty } from "./states.css.ts";
import { removed } from "./states.css.ts";
export const drawingCard = style({
  "@media": {
    "(max-width: 639px)": {
      aspectRatio: "auto",
    },
    "(min-width: 640px)": {
      maxWidth: "420px",
    },
    "(hover: hover) and (pointer: fine)": {
      selectors: {
        "&:hover": {
          boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
        },
      },
    },
  },
  position: "relative",
  aspectRatio: "1",
  minWidth: "0",
  borderRadius: "12px",
  transition: "box-shadow 150ms ease",
  selectors: {
    "&[data-menu-open]": {
      boxShadow: "0 5px 18px rgb(0 0 0 / 12%)",
    },
    "&[data-renaming]": {
      boxShadow: "0 5px 18px rgb(0 0 0 / 16%)",
    },
  },
});
export const drawingName = style({
  "@media": {
    "(hover: hover) and (pointer: fine) and (min-width: 640px)": {
      opacity: "0",
      transition: "opacity 130ms",
      selectors: {
        [`${drawingCard}:is(:hover, :focus-within, [data-menu-open]) &`]: {
          opacity: "1",
        },
      },
    },
    "(max-width: 639px)": {
      opacity: "1",
    },
  },
  padding: "14px 60px 16px 16px",
  fontSize: "15px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  selectors: {
    [`${drawingCard}[data-renaming] &`]: {
      opacity: 1,
    },
  },
});
export const more = style({
  "@media": {
    "(hover: hover) and (pointer: fine) and (min-width: 640px)": {
      opacity: "0",
      transition: "opacity 130ms",
      selectors: {
        [`${drawingCard}:is(:hover, :focus-within, [data-menu-open]) &`]: {
          opacity: "1",
        },
        '&[aria-expanded="true"]': {
          opacity: "1",
        },
      },
    },
  },
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
  selectors: {
    "&:hover": {
      background: theme.paperHover,
    },
    '&[aria-expanded="true"]': {
      background: theme.paperHover,
    },
  },
});
export const drawingGrid = style({
  "@media": {
    "(max-width: 959px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "24px",
      padding: "16px 24px",
    },
    "(max-width: 639px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "20px",
      padding: "16px 20px 110px",
    },
  },
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "24px",
  maxWidth: "1372px",
  margin: "0 auto",
  padding: "16px 32px 32px",
  selectors: {
    [`${empty} &`]: {
      minHeight: "calc(100dvh - 140px)",
      display: "grid",
      placeItems: "center",
    },
  },
});
export const drawingTile = style({
  "@media": {
    "(max-width: 639px)": {
      height: "auto",
    },
  },
  width: "100%",
  height: "100%",
  padding: "0",
  border: "0",
  borderRadius: "12px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  background: theme.paper,
  color: theme.paperText,
  textAlign: "left",
  selectors: {
    "&:active": {
      filter: "brightness(0.96)",
    },
    [`${removed} &`]: {
      visibility: "hidden",
    },
  },
});
export const artwork = style({
  "@media": {
    "(max-width: 639px)": {
      aspectRatio: "4/3",
      flex: "none",
    },
  },
  isolation: "isolate",
  width: "100%",
  flex: "1",
  minHeight: "0",
  background: theme.paper,
  padding: "18px",
  display: "grid",
  placeItems: "center",
});

export const removal = style({
  position: "absolute",
  inset: "0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  padding: "20px",
  borderRadius: "12px",
  background: theme.surface,
  textAlign: "center",
  overflowWrap: "anywhere",
});
export const undo = style({
  padding: "10px 20px",
  background: theme.text,
  color: theme.background,
  border: "0",
  borderRadius: "8px",
});
export const emptyMessage = style({
  textAlign: "center",
  padding: "64px 20px",
});
export const artworkImage = style({
  mixBlendMode: "darken",
  width: "100%",
  height: "100%",
  minHeight: "0",
  objectFit: "contain",
  pointerEvents: "none",
});
