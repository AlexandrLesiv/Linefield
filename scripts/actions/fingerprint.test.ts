import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprint, freshness, sourcePaths } from "./fingerprint.ts";
const signal = () => new AbortController().signal;
test("DX-ACTION-006 endpoint hashes detect source changes and are deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-snapshot-"));
  try {
    await writeFile(join(root, "source.ts"), "export const value = 1;");
    const first = await fingerprint(root, ["source.ts"], signal());
    assert.ok(first);
    assert.equal(freshness(first, await fingerprint(root, ["source.ts"], signal())), "fresh");
    await writeFile(join(root, "source.ts"), "export const value = 2;");
    assert.equal(freshness(first, await fingerprint(root, ["source.ts"], signal())), "stale");
    assert.equal(freshness(first, null), "unavailable");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("DX-ACTION-006 nested configured paths reject linked ancestors", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-ancestor-"));
  try {
    await mkdir(join(root, "outside/web/src"), { recursive: true });
    await writeFile(join(root, "outside/web/src/a.ts"), "private");
    await symlink(join(root, "outside"), join(root, "apps"));
    assert.equal(await fingerprint(root, ["apps/web/src"], signal()), null);
    await rm(join(root, "apps"));
    await mkdir(join(root, "apps"));
    await symlink(join(root, "outside/web"), join(root, "apps/web"));
    assert.equal(await fingerprint(root, ["apps/web/src"], signal()), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("DX-ACTION-006 checked web configuration changes invalidate snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-config-"));
  try {
    await mkdir(join(root, "apps/web"), { recursive: true });
    for (const path of ["apps/web/vite.config.ts", "apps/web/playwright.config.ts"]) {
      assert.ok(sourcePaths.includes(path));
      await writeFile(join(root, path), "export default {};");
      const before = await fingerprint(root, [path], signal());
      await writeFile(join(root, path), "export default { changed: true };");
      assert.equal(freshness(before, await fingerprint(root, [path], signal())), "stale");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("DX-ACTION-006 scan rejects symlink, byte/count/time bounds and missing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-snapshot-"));
  try {
    await writeFile(join(root, "source.ts"), "private".repeat(20));
    await symlink(join(root, "source.ts"), join(root, "link.ts"));
    assert.equal(await fingerprint(root, ["link.ts"], signal()), null);
    assert.equal(await fingerprint(root, ["source.ts"], signal(), { bytes: 1 }), null);
    assert.equal(await fingerprint(root, ["source.ts"], signal(), { files: 0 }), null);
    assert.equal(await fingerprint(root, ["source.ts"], signal(), { durationMs: -1 }), null);
    assert.equal(await fingerprint(root, ["missing"], signal()), null);
    const controller = new AbortController();
    controller.abort();
    assert.equal(await fingerprint(root, ["source.ts"], controller.signal), null);
    await mkdir(join(root, "many"));
    for (let i = 0; i < 4; i++) await writeFile(join(root, "many", `${i}.ts`), "");
    assert.equal(await fingerprint(root, ["many"], signal(), { files: 2 }), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
