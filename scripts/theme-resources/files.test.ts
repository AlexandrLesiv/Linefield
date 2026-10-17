import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolved } from "../../shared/theme/resolve.ts";
import { synchronize } from "../localization/files.ts";
import { generateThemeResources } from "./generate.ts";

test("THEME-12 clean generation, no-op timestamps, stale rejection and explicit extras", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linefield-theme-"));
  try {
    const outputs = generateThemeResources(resolved);
    await assert.rejects(synchronize(directory, outputs, true), /Stale/);
    await synchronize(directory, outputs, false);
    await synchronize(directory, outputs, true);
    const file = join(directory, "windows/LinefieldColors.xaml");
    const before = await stat(file);
    await synchronize(directory, outputs, false);
    assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
    await writeFile(file, "stale");
    await assert.rejects(synchronize(directory, outputs, true), /Stale/);
    assert.equal(await readFile(file, "utf8"), "stale");
    await synchronize(directory, outputs, false);
    await synchronize(directory, outputs, true);
    await writeFile(join(directory, "extra.txt"), "preserve");
    await assert.rejects(synchronize(directory, outputs, false), /Unexpected/);
    await assert.rejects(synchronize(directory, outputs, true), /Unexpected/);
    assert.equal(await readFile(join(directory, "extra.txt"), "utf8"), "preserve");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
