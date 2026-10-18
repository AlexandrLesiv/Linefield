import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  realpath,
  mkdir,
  writeFile,
  readFile,
  access,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { synchronize } from "./files.ts";
async function fixture(run: (root: string) => Promise<void>): Promise<void> {
  // Canonicalize only the disposable root, not the configured path being tested.
  const root = await realpath(await mkdtemp(join(tmpdir(), "linefield-output-boundary-")));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
test("LOC-FILES-013 linked ancestors reject existing and missing output without external writes", async () => {
  await fixture(async (root) => {
    const outside = join(root, "outside");
    await mkdir(join(outside, "existing"), { recursive: true });
    await writeFile(join(outside, "existing/canary"), "preserve");
    await symlink(outside, join(root, "alias"));
    for (const check of [true, false]) {
      await assert.rejects(
        synchronize(join(root, "alias/existing"), { canary: "changed" }, check),
        /symlink/,
      );
      await assert.rejects(
        synchronize(join(root, "alias/missing"), { canary: "created" }, check),
        /symlink/,
      );
      assert.equal(await readFile(join(outside, "existing/canary"), "utf8"), "preserve");
      await assert.rejects(access(join(outside, "missing")));
    }
  });
});
test("LOC-FILES-014 malformed last keys reject before earlier valid output changes", async () => {
  await fixture(async (root) => {
    const output = join(root, "generated");
    await mkdir(output);
    await writeFile(join(output, "valid.txt"), "preserve");
    await writeFile(join(root, "outside"), "external");
    for (const path of [
      "",
      ".",
      "..",
      "../outside",
      join(root, "outside"),
      "a/../b",
      "a/./b",
      "a//b",
      "a/",
      "a\\b",
      "a\0b",
      "C:/outside",
      "C:outside",
      "caf\u00e9.json",
      "cafe\u0301.json",
      "file.",
    ]) {
      for (const check of [true, false]) {
        await assert.rejects(
          synchronize(output, { "valid.txt": "changed", [path]: "bad" }, check),
          /relative file path/,
        );
        assert.equal(await readFile(join(output, "valid.txt"), "utf8"), "preserve");
        assert.equal(await readFile(join(root, "outside"), "utf8"), "external");
      }
    }
  });
});
test("LOC-FILES-014 case-alias files and directory prefixes reject before writes", async () => {
  await fixture(async (root) => {
    const output = join(root, "existing");
    await mkdir(output);
    await writeFile(join(output, "valid.txt"), "preserve");
    for (const pair of [
      { web: "file", "WEB/en.json": "nested" },
      { "a.json": "first", "A.json": "second" },
      { "web/en.json": "first", "WEB/uk.json": "second" },
    ]) {
      for (const entries of [Object.entries(pair), Object.entries(pair).reverse()]) {
        const outputs = { "valid.txt": "changed", ...Object.fromEntries(entries) };
        for (const check of [true, false]) {
          await assert.rejects(synchronize(output, outputs, check), /collision/);
          await assert.rejects(synchronize(join(root, "missing"), outputs, check), /collision/);
          assert.equal(await readFile(join(output, "valid.txt"), "utf8"), "preserve");
          await assert.rejects(access(join(root, "missing")));
        }
      }
    }
  });
});
test("LOC-FILES-014 planned prefix collisions reject in either key order without creation", async () => {
  await fixture(async (root) => {
    const output = join(root, "generated");
    for (const entries of [
      [
        ["web", "file"],
        ["web/en.json", "nested"],
      ],
      [
        ["web/en.json", "nested"],
        ["web", "file"],
      ],
    ]) {
      for (const check of [true, false]) {
        await assert.rejects(synchronize(output, Object.fromEntries(entries), check), /collision/);
        await assert.rejects(access(output));
      }
    }
  });
});
test("LOC-FILES-014 existing directory target and file ancestor reject before changes", async () => {
  await fixture(async (root) => {
    const output = join(root, "generated");
    await mkdir(join(output, "occupied"), { recursive: true });
    await writeFile(join(output, "valid.txt"), "preserve");
    for (const check of [true, false]) {
      await assert.rejects(
        synchronize(output, { "valid.txt": "changed", occupied: "file" }, check),
        /regular file/,
      );
      assert.equal(await readFile(join(output, "valid.txt"), "utf8"), "preserve");
      await assert.rejects(
        synchronize(join(output, "valid.txt/nested"), { value: "new" }, check),
        /real directory/,
      );
    }
  });
});
test("LOC-FILES-015 inherited output names never conceal unexpected files", async () => {
  await fixture(async (root) => {
    await writeFile(join(root, "toString"), "preserve");
    const inherited: Record<string, string> = {};
    Object.setPrototypeOf(inherited, { toString: "changed" });
    for (const outputs of [{}, inherited]) {
      for (const check of [true, false]) {
        await assert.rejects(synchronize(root, outputs, check), /Unexpected/);
        assert.equal(await readFile(join(root, "toString"), "utf8"), "preserve");
      }
    }
  });
});
