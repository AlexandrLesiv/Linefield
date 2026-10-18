import { catalog as sourceCatalog } from "../../shared/localization/catalog.ts";
import { en } from "../../shared/localization/en.ts";
import { uk } from "../../shared/localization/uk.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "./schema.ts";
import { generate } from "./generate.ts";
import { synchronize } from "./files.ts";
test("LOC-05 deterministic generation and stale/missing/unexpected output rejection", async () => {
  const valid = parse(sourceCatalog, { en, uk });
  const first = generate(valid.catalog, valid.translations);
  const reversed = {
    ...valid.catalog,
    messages: Object.fromEntries(Object.entries(valid.catalog.messages).reverse()),
  };
  assert.deepEqual(first, generate(reversed, valid.translations));
  const directory = await realpath(await mkdtemp(join(tmpdir(), "linefield-locales-")));
  try {
    await synchronize(directory, first, false);
    await synchronize(directory, first, true);
    await writeFile(join(directory, "web/en.json"), "stale");
    await assert.rejects(synchronize(directory, first, true), /Stale/);
    await synchronize(directory, first, false);
    await rm(join(directory, "web/en.json"));
    await assert.rejects(synchronize(directory, first, true), /Stale/);
    await synchronize(directory, first, false);
    await writeFile(join(directory, "extra"), "unexpected");
    await assert.rejects(synchronize(directory, first, true), /Unexpected/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("LOC-11 generation rejects symlink files, subdirectories and root without touching target", async () => {
  const { mkdir, symlink } = await import("node:fs/promises");
  const directory = await realpath(await mkdtemp(join(tmpdir(), "linefield-locale-links-")));
  const target = join(directory, "outside.json");
  const output = join(directory, "generated");
  try {
    await writeFile(target, "unchanged");
    await mkdir(join(output, "web"), { recursive: true });
    await symlink(target, join(output, "web/en.json"));
    await assert.rejects(synchronize(output, { "web/en.json": "overwritten" }, false), /symlink/);
    assert.equal(await readFile(target, "utf8"), "unchanged");
    await rm(output, { recursive: true });
    await mkdir(output);
    await symlink(directory, join(output, "web"));
    await assert.rejects(synchronize(output, { "web/en.json": "overwritten" }, false), /symlink/);
    await rm(output, { recursive: true });
    await symlink(directory, output);
    await assert.rejects(
      synchronize(output, { "outside.json": "overwritten" }, false),
      /real directory/,
    );
    assert.equal(await readFile(target, "utf8"), "unchanged");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("LOC-12 unchanged generation preserves files so preparation does not reload the preview", async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "linefield-locales-stable-")));
  try {
    const outputs = { "web/en.json": '{"name":"Linefield"}\n' };
    await synchronize(directory, outputs, false);
    const file = join(directory, "web/en.json");
    await utimes(file, 100000, 100000);
    const before = await stat(file);
    await synchronize(directory, outputs, false);
    assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
    await synchronize(directory, { "web/en.json": "updated" }, false);
    assert.equal(await readFile(file, "utf8"), "updated");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
