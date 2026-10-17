import type { palette } from "./palette.ts";

export const tokens = [
  "surface.canvas",
  "surface.panel",
  "text.primary",
  "border.default",
  "text.secondary",
  "surface.creation",
  "action.secondary.hover",
  "action.secondary.pressed",
  "action.primary.hover",
  "action.primary.pressed",
  "artwork.paper",
  "artwork.text",
  "artwork.secondary",
  "artwork.control.hover",
  "artwork.border",
  "artwork.title.overlay",
  "artwork.control.overlay",
  "action.destructive.surface",
  "action.destructive.onSurface",
  "focus.ring",
  "action.destructive.foreground",
  "status.error.foreground",
  "overlay.scrim",
] as const;
export type Role = (typeof tokens)[number];
export type Scheme = Record<Role, string>;
export type Catalog = { light: Scheme; dark: Scheme };
export type PaletteReference = keyof typeof palette;
export type SemanticCatalog = {
  light: Record<Role, PaletteReference>;
  dark: Record<Role, PaletteReference>;
};
