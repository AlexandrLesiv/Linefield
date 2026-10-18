import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { revision } from "./revision.ts";
test("DX-ACTION-005 optional revision rejects linked ref ancestors", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-revision-"));
  const hash = "a".repeat(40);
  try {
    await mkdir(join(root, ".git"));
    await mkdir(join(root, "external/heads"), { recursive: true });
    await writeFile(join(root, "external/heads/main"), hash);
    await writeFile(join(root, ".git/HEAD"), "ref: refs/heads/main\n");
    await symlink(join(root, "external"), join(root, ".git/refs"));
    assert.equal(await revision(root), null);
    await rm(join(root, ".git/refs"));
    await mkdir(join(root, ".git/refs/heads"), { recursive: true });
    await writeFile(join(root, ".git/refs/heads/main"), hash);
    assert.equal(await revision(root), hash);
    await writeFile(join(root, ".git/HEAD"), hash);
    assert.equal(await revision(root), hash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
