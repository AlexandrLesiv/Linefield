import assert from "node:assert/strict";
import test from "node:test";
import { loadTokens } from "./tokens.ts";

test("GEN02 resolves inherited types and chained aliases", () => {
  const get = loadTokens({
    space: {
      $type: "dimension",
      base: { $value: { value: 16, unit: "px" } },
      alias: { $value: "{space.base}" },
    },
  });
  assert.equal(get("space.alias", "dimension"), "16");
  assert.throws(() => get("space.base", "color"), /type mismatch/);
});
test("GEN02 rejects missing references, cycles and type mismatch eagerly", () => {
  assert.throws(() => loadTokens({ a: { $type: "number", $value: "{missing}" } }), /Missing token/);
  assert.throws(
    () =>
      loadTokens({ a: { $type: "number", $value: "{b}" }, b: { $type: "number", $value: "{a}" } }),
    /Cyclic/,
  );
  assert.throws(
    () =>
      loadTokens({
        a: { $type: "number", $value: "{b}" },
        b: { $type: "dimension", $value: { value: 1, unit: "px" } },
      }),
    /type mismatch/,
  );
});
test("GEN02 rejects unsupported or malformed values rather than silently converting", () => {
  for (const value of [
    { colorSpace: "srgb", components: [2, 0, 0] },
    { colorSpace: "display-p3", components: [0, 0, 0] },
    "#FFFFFF",
  ]) {
    assert.throws(() => loadTokens({ a: { $type: "color", $value: value } }), /invalid/);
  }
  assert.throws(() => loadTokens({ a: { $type: "number", $value: Infinity } }), /invalid/);
  assert.throws(
    () => loadTokens({ a: { $type: "dimension", $value: { value: 2, unit: "rem" } } }),
    /invalid/,
  );
  assert.throws(
    () => loadTokens({ a: { $type: "fontFamily", $value: ["x;fill:red"] } }),
    /invalid/,
  );
  assert.throws(
    () => loadTokens({ a: { $type: "dimension", $value: { $ref: "#/b/$value" } } }),
    /invalid/,
  );
});
test("GEN02 rejects unsupported directives on groups and tokens", () => {
  const token = { $type: "dimension", $value: { value: 16, unit: "px" } };
  for (const directive of ["$extends", "$ref", "$futureDirective"]) {
    assert.throws(
      () => loadTokens({ group: { [directive]: "#/missing", b: token } }),
      /Unsupported token directive/,
    );
    assert.throws(
      () => loadTokens({ a: { ...token, [directive]: "#/missing" } }),
      /Unsupported token directive/,
    );
  }
  assert.throws(() => loadTokens({ a: { ...token, child: token } }), /Unsupported token/);
  const get = loadTokens({
    $description: "Diagram definitions",
    $extensions: { "org.linefield": { version: 2 } },
    a: { ...token, $description: "Card radius", $extensions: { "org.linefield": {} } },
  });
  assert.equal(get("a", "dimension"), "16");
  assert.throws(() => loadTokens({ a: { ...token, $description: 1 } }), /description/);
  assert.throws(() => loadTokens({ a: { ...token, $extensions: "bad" } }), /extensions/);
});
