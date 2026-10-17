import { colors } from "./colors.ts";
import { palette } from "./palette.ts";
import { tokens } from "./types.ts";
import type { Catalog, Scheme } from "./types.ts";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}
// References have one hop, always to literal palette data; aliases/cycles are forbidden.
export function resolveTheme(source: unknown, primitives: unknown): Catalog {
  if (!object(source) || !exact(source, ["light", "dark"]))
    throw Error("Expected light/dark schemes");
  if (!object(primitives)) throw Error("Invalid palette");
  for (const value of Object.values(primitives)) {
    if (typeof value !== "string" || !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value))
      throw Error("Palette requires literal hex colors");
  }
  const resolveMode = (mode: "light" | "dark"): Scheme => {
    const references = source[mode];
    if (!object(references) || !exact(references, tokens))
      throw Error(mode + ": invalid semantic keys");
    return Object.fromEntries(
      tokens.map((role) => {
        const reference = references[role];
        if (typeof reference !== "string" || !Object.hasOwn(primitives, reference))
          throw Error(role + ": unknown palette reference");
        return [role, primitives[reference]];
      }),
    ) as Scheme;
  };
  return { light: resolveMode("light"), dark: resolveMode("dark") };
}
export const resolved = resolveTheme(colors, palette);
