import { style } from "@vanilla-extract/css";
import { theme } from "./theme.css.ts";
export const drawingTool = style({
  display: "grid",
  placeItems: "center",
  width: "48px",
  height: "48px",
  minHeight: "48px",
  flexShrink: 0,
  border: "1px solid transparent",
  borderRadius: "10px",
  padding: "10px",
  background: "transparent",
  color: theme.text,
  selectors: {
    '&[aria-pressed="true"]': {
      background: theme.text,
      color: theme.surface,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
    "&:not(:disabled):hover": {
      background: theme.buttonHover,
    },
    '&[aria-pressed="true"]:not(:disabled):hover': {
      background: theme.primaryHover,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.focus}`,
      outlineOffset: "2px",
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        '&[aria-pressed="true"]': {
          borderColor: "Highlight",
          color: "Highlight",
        },
      },
    },
  },
});
export const drawingColor = style({
  marginTop: "8px",
  borderTop: `1px solid ${theme.line}`,
  borderRadius: 0,
  paddingTop: "14px",
  height: "58px",
});
export const colorSwatch = style({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: theme.text,
  outline: `1px solid ${theme.text}`,
  outlineOffset: "3px",
});
export const drawingProperty = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexShrink: 0,
  minHeight: "48px",
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});
export const propertyValue = style({
  minWidth: "3.5ch",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});
export const propertyWidth = style({});
export const propertyTrack = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  selectors: {
    [`${propertyWidth} &::before`]: {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      height: "18px",
      background: theme.muted,
      clipPath: "polygon(0 47%, 100% 0, 100% 100%, 0 53%)",
      borderRadius: "10px",
      pointerEvents: "none",
    },
  },
});
export const propertyOpacity = style({
  borderLeft: `1px solid ${theme.line}`,
  paddingLeft: "20px",
});
export const propertySmoothing = style({
  borderLeft: `1px solid ${theme.line}`,
  paddingLeft: "20px",
});
export const strokePreview = style({
  width: "72px",
  minWidth: "72px",
  height: "44px",
  display: "grid",
  placeItems: "center",
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});
export const contextEmpty = style({
  color: theme.muted,
  whiteSpace: "nowrap",
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});
export const toolIcon = style({
  width: "28px",
  height: "28px",
});
export const propertyIcon = style({
  width: "24px",
  height: "24px",
  flexShrink: 0,
});
export const propertyInput = style({
  width: "100px",
  minHeight: "44px",
  margin: 0,
  accentColor: theme.text,
  cursor: "pointer",
  selectors: {
    [`${propertyWidth} &`]: {
      width: "clamp(120px, 22vw, 340px)",
      appearance: "none",
      background: "transparent",
      position: "relative",
    },
    [`${propertyWidth} &::-webkit-slider-runnable-track`]: {
      height: "18px",
      background: "transparent",
    },
    [`${propertyWidth} &::-webkit-slider-thumb`]: {
      appearance: "none",
      width: "24px",
      height: "24px",
      marginTop: "-3px",
      background: theme.surface,
      border: `1px solid ${theme.line}`,
      borderRadius: "50%",
    },
    [`${propertyWidth} &::-moz-range-track`]: {
      height: "18px",
      background: "transparent",
    },
    [`${propertyWidth} &::-moz-range-thumb`]: {
      width: "24px",
      height: "24px",
      background: theme.surface,
      border: `1px solid ${theme.line}`,
      borderRadius: "50%",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.focus}`,
      outlineOffset: "2px",
    },
  },
  "@media": {
    "(forced-colors: active)": {
      selectors: {
        [`${propertyWidth} &`]: {
          appearance: "auto",
        },
      },
    },
  },
});
export const strokeIcon = style({
  width: "64px",
  height: "40px",
  overflow: "visible",
});
