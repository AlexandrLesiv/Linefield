import assert from "node:assert/strict";
import test from "node:test";
import { contrast, readTheme, validateTheme } from "../../../../scripts/theme-validation.ts";

import { colors } from "../../../../shared/theme/colors.ts";
import { palette } from "../../../../shared/theme/palette.ts";
import { resolveTheme } from "../../../../shared/theme/resolve.ts";

const source = await readTheme();
validateTheme(source);

test("THEME-01 shared catalog has exact semantic keys and readable state pairs", () => {
  validateTheme(source);
  assert.equal(contrast("#000000", "#ffffff"), 21);
});
test("THEME-04 light palette is unchanged and authorized dark palette uses soft graphite", () => {
  assert.deepEqual(
    [
      source.light["surface.canvas"],
      source.light["surface.panel"],
      source.light["text.primary"],
      source.light["border.default"],
      source.light["text.secondary"],
      source.light["surface.creation"],
    ],
    ["#e8e8e8", "#ffffff", "#171717", "#aaaaaa", "#555555", "#ededed"],
  );
  assert.deepEqual(
    [
      source.dark["surface.canvas"],
      source.dark["surface.panel"],
      source.dark["text.primary"],
      source.dark["border.default"],
      source.dark["text.secondary"],
      source.dark["surface.creation"],
    ],
    ["#2d2d2f", "#39393c", "#eeeeef", "#747478", "#c2c2c5", "#343437"],
  );
  assert.equal(source.light["artwork.paper"], "#ffffff");
  assert.equal(source.dark["artwork.paper"], "#eeeeec");
  assert.equal(source.light["artwork.text"], source.dark["artwork.text"]);
});

test("THEME-06 unresolved references, missing roles/modes and executable aliases fail", () => {
  const missing = { ...colors.light };
  Reflect.deleteProperty(missing, "surface.panel");
  assert.throws(() => resolveTheme({ ...colors, light: missing }, palette), /semantic keys/);
  assert.throws(() => resolveTheme({ light: colors.light }, palette), /schemes/);
  assert.throws(
    () => resolveTheme({ ...colors, dark: { ...colors.dark, extra: "neutral.0" } }, palette),
    /semantic keys/,
  );
  assert.throws(
    () =>
      resolveTheme({ ...colors, light: { ...colors.light, "surface.panel": "missing" } }, palette),
    /unknown palette reference/,
  );
  assert.throws(
    () => resolveTheme(colors, { ...palette, "neutral.150": "neutral.900" }),
    /literal hex/,
  );
  assert.throws(
    () => resolveTheme(colors, { ...palette, "neutral.150": "neutral.150" }),
    /literal hex/,
  );
  const inherited = Object.create(palette);
  assert.throws(() => resolveTheme(colors, inherited), /unknown palette reference/);
});

test("THEME-07 every pre-layer color and alpha value remains exact", () => {
  assert.deepEqual(source.light, {
    "surface.canvas": "#e8e8e8",
    "surface.panel": "#ffffff",
    "text.primary": "#171717",
    "border.default": "#aaaaaa",
    "text.secondary": "#555555",
    "surface.creation": "#ededed",
    "action.secondary.hover": "#ededed",
    "action.secondary.pressed": "#dedede",
    "action.primary.hover": "#353535",
    "action.primary.pressed": "#4a4a4a",
    "artwork.paper": "#ffffff",
    "artwork.text": "#171717",
    "artwork.secondary": "#555555",
    "artwork.control.hover": "#dedede",
    "artwork.border": "#dddddd",
    "artwork.title.overlay": "#ffffffdb",
    "artwork.control.overlay": "#ffffffe0",
    "action.destructive.surface": "#b42332",
    "action.destructive.onSurface": "#ffffff",
    "focus.ring": "#005fcc",
    "action.destructive.foreground": "#b42323",
    "status.error.foreground": "#ba2736",
    "overlay.scrim": "#00000055",
  });
  assert.deepEqual(source.dark, {
    "surface.canvas": "#2d2d2f",
    "surface.panel": "#39393c",
    "text.primary": "#eeeeef",
    "border.default": "#747478",
    "text.secondary": "#c2c2c5",
    "surface.creation": "#343437",
    "action.secondary.hover": "#49494d",
    "action.secondary.pressed": "#57575c",
    "action.primary.hover": "#dedede",
    "action.primary.pressed": "#c6c6c6",
    "artwork.paper": "#eeeeec",
    "artwork.text": "#171717",
    "artwork.secondary": "#555555",
    "artwork.control.hover": "#dedede",
    "artwork.border": "#dddddd",
    "artwork.title.overlay": "#eeeeecdb",
    "artwork.control.overlay": "#eeeeece0",
    "action.destructive.surface": "#b42332",
    "action.destructive.onSurface": "#ffffff",
    "focus.ring": "#005fcc",
    "action.destructive.foreground": "#ff8989",
    "status.error.foreground": "#ff8989",
    "overlay.scrim": "#00000055",
  });
});
