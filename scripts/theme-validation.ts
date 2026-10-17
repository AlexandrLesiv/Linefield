import { resolved } from "../shared/theme/resolve.ts";
import { tokens } from "../shared/theme/types.ts";
import type { Catalog, Scheme } from "../shared/theme/types.ts";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => key in value);
}
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
export function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function validateTheme(value: unknown): asserts value is Catalog {
  if (!object(value) || !exactKeys(value, ["light", "dark"]))
    throw Error("Expected light/dark schemes");
  for (const mode of ["light", "dark"] as const) {
    const scheme = value[mode];
    if (!object(scheme) || !exactKeys(scheme, tokens))
      throw Error(`${mode}: invalid semantic keys`);
    for (const token of tokens) {
      const color = scheme[token];
      const pattern =
        token === "artwork.title.overlay" ||
        token === "artwork.control.overlay" ||
        token === "overlay.scrim"
          ? /^#[\da-f]{8}$/i
          : /^#[\da-f]{6}$/i;
      if (typeof color !== "string" || !pattern.test(color))
        throw Error(`${mode}.${token}: invalid hex`);
    }
    const pairs: readonly (readonly [keyof Scheme, keyof Scheme])[] = [
      ["text.primary", "surface.canvas"],
      ["text.primary", "surface.panel"],
      ["text.secondary", "surface.panel"],
      ["text.primary", "surface.creation"],
      ["text.primary", "action.secondary.hover"],
      ["text.primary", "action.secondary.pressed"],
      ["surface.canvas", "text.primary"],
      ["surface.canvas", "action.primary.hover"],
      ["surface.canvas", "action.primary.pressed"],
      ["artwork.text", "artwork.paper"],
      ["artwork.text", "artwork.control.hover"],
      ["artwork.secondary", "artwork.paper"],
      ["action.destructive.foreground", "surface.panel"],
      ["status.error.foreground", "surface.panel"],
      ["action.destructive.onSurface", "action.destructive.surface"],
    ];
    for (const [foreground, background] of pairs) {
      if (contrast(String(scheme[foreground]), String(scheme[background])) < 4.5) {
        throw Error(`${mode}: insufficient contrast for ${foreground}/${background}`);
      }
    }
  }
}

export async function readTheme(): Promise<unknown> {
  return structuredClone(resolved);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateTheme(await readTheme());
  console.log(JSON.stringify({ check: "shared-theme", status: "passed" }));
}
