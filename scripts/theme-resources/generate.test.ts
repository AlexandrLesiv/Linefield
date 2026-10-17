import assert from "node:assert/strict";
import test from "node:test";
import { resolved } from "../../shared/theme/resolve.ts";
import { tokens } from "../../shared/theme/types.ts";
import { channels, generateThemeResources, resourceNames } from "./generate.ts";

test("THEME-10 native outputs preserve every role, mode and alpha byte", () => {
  const outputs = generateThemeResources(resolved);
  const names = resourceNames(tokens);
  assert.equal(Object.keys(outputs).length, tokens.length + 6);
  for (const role of tokens) {
    const asset = JSON.parse(
      outputs[`apple/LinefieldColors.xcassets/${names[role]}.colorset/Contents.json`]!,
    );
    assert.equal(asset.colors.length, 2);
    assert.equal(asset.colors[0].appearances, undefined);
    assert.deepEqual(asset.colors[1].appearances, [{ appearance: "luminosity", value: "dark" }]);
    for (const [index, mode] of (["light", "dark"] as const).entries()) {
      const expected = channels(resolved[mode][role]);
      const components = asset.colors[index].color.components;
      assert.equal(asset.colors[index].color["color-space"], "srgb");
      assert.deepEqual(
        ["red", "green", "blue", "alpha"].map((key) => Math.round(Number(components[key]) * 255)),
        expected,
      );
      const android =
        outputs[`android/${mode === "light" ? "values" : "values-night"}/colors.xml`]!;
      const match = android.match(
        new RegExp(`<color name="${names[role]}">#([A-F0-9]{8})</color>`),
      );
      assert.ok(match);
      const bytes = match[1]!.match(/../g)!.map((part) => Number.parseInt(part, 16));
      assert.deepEqual([...bytes.slice(1), bytes[0]], expected);
      const windows = outputs["windows/LinefieldColors.xaml"]!.match(
        new RegExp(
          `<ResourceDictionary x:Key="${mode === "light" ? "Light" : "Dark"}">([\\s\\S]*?)</ResourceDictionary>`,
        ),
      );
      assert.ok(windows);
      assert.ok(windows[1]!.includes(`<Color x:Key="${names[role]}">#${match[1]}</Color>`));
      const gtk = outputs[`gtk/${mode}.css`]!.match(
        new RegExp(`@define-color ${names[role]} rgba\\(([^)]+)\\);`),
      );
      assert.ok(gtk);
      const values = gtk[1]!.split(", ").map(Number);
      assert.deepEqual([...values.slice(0, 3), Math.round(values[3]! * 255)], expected);
    }
  }
  for (const mode of ["light", "dark"])
    assert.equal(outputs[`gtk/${mode}.css`]!.match(/@define-color/g)!.length, tokens.length);
});

test("THEME-11 generation is deterministic and rejects ambiguous resource names", () => {
  assert.deepEqual(
    generateThemeResources(resolved),
    generateThemeResources(structuredClone(resolved)),
  );
  assert.throws(() => resourceNames(["a.bC", "a.b.c"]), /collision/);
  assert.throws(() => resourceNames(["../bad"]), /Invalid semantic/);
  assert.throws(() => channels("red"), /Invalid resource/);
  const malformed = structuredClone(resolved);
  malformed.light["artwork.paper"] = "red";
  assert.throws(() => generateThemeResources(malformed), /invalid hex/);
});
