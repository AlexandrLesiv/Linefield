import { createGlobalThemeContract } from "@vanilla-extract/css";
import { resolved } from "../../../shared/theme/resolve.ts";
import type { Role, Scheme } from "../../../shared/theme/types.ts";

// Web compatibility names map to shared semantic intent.
const roles = {
  background: "surface.canvas",
  surface: "surface.panel",
  text: "text.primary",
  line: "border.default",
  muted: "text.secondary",
  new: "surface.creation",
  buttonHover: "action.secondary.hover",
  buttonPressed: "action.secondary.pressed",
  primaryHover: "action.primary.hover",
  primaryPressed: "action.primary.pressed",
  paper: "artwork.paper",
  paperText: "artwork.text",
  paperMuted: "artwork.secondary",
  paperHover: "artwork.control.hover",
  paperLine: "artwork.border",
  paperTitle: "artwork.title.overlay",
  paperControl: "artwork.control.overlay",
  destructiveSurface: "action.destructive.surface",
  onDestructive: "action.destructive.onSurface",
  focus: "focus.ring",
  destructive: "action.destructive.foreground",
  error: "status.error.foreground",
  scrim: "overlay.scrim",
} as const satisfies Record<string, Role>;
export type ColorToken = keyof typeof roles;
export type ColorScheme = Record<ColorToken, string>;
function adapt(scheme: Scheme): ColorScheme {
  return Object.fromEntries(
    Object.entries(roles).map(([key, role]) => [key, scheme[role]]),
  ) as ColorScheme;
}
export const light = adapt(resolved.light);
export const dark = adapt(resolved.dark);

// Keep stable custom-property names for the measured motion layers.
export const theme = createGlobalThemeContract({
  background: "background",
  surface: "surface",
  text: "text",
  line: "line",
  muted: "muted",
  new: "new",
  buttonHover: "buttonHover",
  buttonPressed: "buttonPressed",
  primaryHover: "primaryHover",
  primaryPressed: "primaryPressed",
  paper: "paper",
  paperText: "paperText",
  paperMuted: "paperMuted",
  paperHover: "paperHover",
  paperLine: "paperLine",
  paperTitle: "paperTitle",
  paperControl: "paperControl",
  destructiveSurface: "destructiveSurface",
  onDestructive: "onDestructive",
  focus: "focus",
  destructive: "destructive",
  error: "error",
  scrim: "scrim",
});
