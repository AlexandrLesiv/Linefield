import { globalStyle } from "@vanilla-extract/css";

globalStyle(".action-backdrop", {
  position: "fixed",
  inset: "0",
  zIndex: "999",
  background: "var(--scrim)",
  touchAction: "none",
});
