import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { validateCatalogSource, validateCatalogSources } from "../catalog-source.ts";

test("CAT-01 authoring modules contain only literal serializable exports", async () => {
  await validateCatalogSources();
  validateCatalogSource(
    '/* context */ export const data = { url: "https://example.invalid", /* note */ count: 2 }; // note',
  );
  validateCatalogSource(
    String.raw`export const data = { text: "escaped \\\" /* literal */ // literal" }; /* actual */`,
  );
  for (const source of [
    "export const value = Date.now();",
    "export const value = { ...other };",
    'export const value = { ["computed"]: true };',
    'import "node:fs"; export const value = {};',
    "export const value = { get x() { return 1; } };",
    "export const value = `interpolated ${Date.now()}`;",
  ])
    assert.throws(() => validateCatalogSource(source));
});

test("CAT-02 TypeScript rejects missing locale IDs and missing theme roles", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linefield-catalog-types-"));
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const imports = [
    `import type { Translation } from "${root}shared/localization/catalog.ts";`,
    `import type { Catalog } from "${root}shared/theme/types.ts";`,
  ].join("\n");
  try {
    for (const [type, value] of [
      ["Translation", "{}"],
      ["Catalog", "{ light: {}, dark: {} }"],
    ]) {
      const file = join(directory, "invalid.mts");
      await writeFile(file, `${imports}\nexport const invalid = ${value} satisfies ${type};\n`);
      const result = spawnSync(
        process.execPath,
        [
          join(root, "node_modules/typescript/bin/tsc"),
          "--ignoreConfig",
          "--noEmit",
          "--strict",
          "--skipLibCheck",
          "--module",
          "nodenext",
          "--allowImportingTsExtensions",
          file,
        ],
        { encoding: "utf8", timeout: 30_000 },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /missing the following properties/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
