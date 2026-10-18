import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { actionIds, commandFor, parseAction } from "./catalog.ts";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("DX-ACTION-001 invalid IDs, extra operands and shell syntax reject", () => {
  for (const input of [
    [],
    [""],
    ["lint;echo secret"],
    ["lint", "--fix"],
    ["--cwd=/tmp"],
    ["$(echo secret)"],
    ["format-check"],
  ])
    assert.equal(parseAction(input), null);
  for (const id of actionIds) assert.equal(parseAction([id]), id);
});
test("DX-ACTION-002 compiler uses pinned native executable without Node fallback", async () => {
  const command = await commandFor(root, "root-typecheck");
  assert.ok(command.executable.endsWith("/lib/tsc"));
  assert.notEqual(command.executable, process.execPath);
  assert.deepEqual(command.arguments, ["--noEmit"]);
  assert.equal(command.version, "7.0.2");
  assert.deepEqual((await commandFor(root, "web-typecheck")).arguments, [
    "--noEmit",
    "-p",
    "apps/web/tsconfig.json",
  ]);
});
test("DX-ACTION-002/009 generators are check-only and never bootstrap", async () => {
  for (const id of ["locales-check", "theme-resources-check"] as const) {
    const command = await commandFor(root, id);
    assert.equal(command.executable, process.execPath);
    assert.equal(command.arguments.at(-1), "--check");
  }
  await assert.rejects(commandFor("/nonexistent-linefield-root", "root-typecheck"));
});
test("DX-ACTION-002 missing or mismatched native compiler cannot fall back", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "linefield-native-"));
  try {
    const wrapper = join(fixture, "node_modules/typescript");
    await mkdir(wrapper, { recursive: true });
    await writeFile(join(wrapper, "package.json"), JSON.stringify({ version: "7.0.2" }));
    await assert.rejects(commandFor(fixture, "root-typecheck"));
    const native = join(
      fixture,
      `node_modules/@typescript/typescript-${process.platform}-${process.arch}`,
    );
    await mkdir(native, { recursive: true });
    await writeFile(join(native, "package.json"), JSON.stringify({ version: "0.0.0" }));
    await assert.rejects(commandFor(fixture, "root-typecheck"), /tool-unavailable/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
