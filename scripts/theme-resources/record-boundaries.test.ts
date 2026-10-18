import assert from "node:assert/strict";
import test from "node:test";
import { resolved } from "../../shared/theme/resolve.ts";
import { validateTheme } from "../theme-validation.ts";
import { generateThemeResources } from "./generate.ts";

test("THEME-RECORD-01 inherited modes cannot replace required own keys", () => {
  const value = { __proto__: { light: resolved.light }, dark: resolved.dark, unexpected: true };
  assert.deepEqual(Object.keys(value), ["dark", "unexpected"]);
  assert.throws(() => validateTheme(value), /schemes/);
  const hidden = { dark: resolved.dark, unexpected: true };
  Object.defineProperty(hidden, "light", { value: resolved.light });
  assert.equal(Object.hasOwn(hidden, "light"), true);
  assert.throws(() => validateTheme(hidden), /schemes/);
});

test("THEME-RECORD-02 nested inherited or nonenumerable tokens cannot mask unknown keys", () => {
  const scheme: Record<string, string> = { ...resolved.light, unexpected: "#ffffff" };
  delete scheme["surface.panel"];
  const inherited = { __proto__: { "surface.panel": resolved.light["surface.panel"] }, ...scheme };
  assert.equal(Object.keys(inherited).length, Object.keys(resolved.light).length);
  assert.throws(() => validateTheme({ ...resolved, light: inherited }), /semantic keys/);
  Object.defineProperty(scheme, "surface.panel", { value: resolved.light["surface.panel"] });
  assert.equal(Object.hasOwn(scheme, "surface.panel"), true);
  assert.throws(() => validateTheme({ ...resolved, light: scheme }), /semantic keys/);
});

test("THEME-RECORD-03 custom prototypes reject even with complete own records", () => {
  assert.throws(() => validateTheme({ __proto__: { extra: true }, ...resolved }), /schemes/);
  for (const mode of ["light", "dark"] as const) {
    const scheme = { __proto__: { extra: true }, ...resolved[mode] };
    assert.throws(() => validateTheme({ ...resolved, [mode]: scheme }), /semantic keys/);
  }
});

test("THEME-RECORD-04 null dictionaries preserve theme resource bytes and input", () => {
  const dictionaries = {
    __proto__: null,
    light: { __proto__: null, ...resolved.light },
    dark: { __proto__: null, ...resolved.dark },
  };
  const before = JSON.stringify(dictionaries);
  validateTheme(resolved);
  validateTheme(dictionaries);
  const reordered = {
    dark: Object.fromEntries(Object.entries(resolved.dark).reverse()),
    light: Object.fromEntries(Object.entries(resolved.light).reverse()),
  };
  validateTheme(reordered);
  assert.deepEqual(generateThemeResources(reordered), generateThemeResources(resolved));
  assert.deepEqual(generateThemeResources(dictionaries), generateThemeResources(resolved));
  assert.equal(JSON.stringify(dictionaries), before);
  assert.equal(Object.getPrototypeOf(dictionaries.light), null);
});
