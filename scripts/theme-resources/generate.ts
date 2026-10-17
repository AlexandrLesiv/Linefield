import { tokens } from "../../shared/theme/types.ts";
import type { Catalog } from "../../shared/theme/types.ts";
import { validateTheme } from "../theme-validation.ts";

export function resourceNames(roles: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();
  for (const role of roles) {
    if (!/^[a-z][a-zA-Z]*(?:\.[a-z][a-zA-Z]*)+$/.test(role)) throw Error("Invalid semantic role");
    const name = `linefield_${role.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replaceAll(".", "_")}`;
    if (used.has(name)) throw Error("Theme resource name collision");
    used.add(name);
    result[role] = name;
  }
  return result;
}
export function channels(hex: string): readonly [number, number, number, number] {
  if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(hex)) throw Error("Invalid resource color");
  return [1, 3, 5, 7].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2) || "ff", 16),
  ) as [number, number, number, number];
}
function argb(hex: string): string {
  return `#${hex.slice(7) || "ff"}${hex.slice(1, 7)}`.toUpperCase();
}
function appleColor(hex: string) {
  const [red, green, blue, alpha] = channels(hex);
  return {
    "color-space": "srgb",
    components: {
      red: String(red / 255),
      green: String(green / 255),
      blue: String(blue / 255),
      alpha: String(alpha / 255),
    },
  };
}
const info = { author: "linefield", version: 1 };
const json = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";

export function generateThemeResources(catalog: Catalog): Record<string, string> {
  validateTheme(catalog);
  const names = resourceNames(tokens);
  const outputs: Record<string, string> = {
    "apple/LinefieldColors.xcassets/Contents.json": json({ info }),
  };
  for (const role of tokens) {
    outputs[`apple/LinefieldColors.xcassets/${names[role]}.colorset/Contents.json`] = json({
      colors: [
        { idiom: "universal", color: appleColor(catalog.light[role]) },
        {
          idiom: "universal",
          appearances: [{ appearance: "luminosity", value: "dark" }],
          color: appleColor(catalog.dark[role]),
        },
      ],
      info,
    });
  }
  const dictionaries: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const scheme = catalog[mode];
    outputs[`android/${mode === "light" ? "values" : "values-night"}/colors.xml`] =
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' +
      tokens
        .map((role) => `  <color name="${names[role]}">${argb(scheme[role])}</color>`)
        .join("\n") +
      "\n</resources>\n";
    dictionaries.push(
      `    <ResourceDictionary x:Key="${mode === "light" ? "Light" : "Dark"}">\n` +
        tokens
          .map((role) => `      <Color x:Key="${names[role]}">${argb(scheme[role])}</Color>`)
          .join("\n") +
        "\n    </ResourceDictionary>",
    );
    outputs[`gtk/${mode}.css`] =
      tokens
        .map((role) => {
          const [red, green, blue, alpha] = channels(scheme[role]);
          return `@define-color ${names[role]} rgba(${red}, ${green}, ${blue}, ${alpha / 255});`;
        })
        .join("\n") + "\n";
  }
  outputs["windows/LinefieldColors.xaml"] =
    '<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n  <ResourceDictionary.ThemeDictionaries>\n' +
    dictionaries.join("\n") +
    "\n  </ResourceDictionary.ThemeDictionaries>\n</ResourceDictionary>\n";
  return outputs;
}
