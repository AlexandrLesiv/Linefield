import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { actionIds } from "./catalog.ts";
test("DX-ZED-001 launchers expose only fixed background action arguments", async () => {
  const value: unknown = JSON.parse(
    await readFile(new URL("../../.zed/tasks.json", import.meta.url), "utf8"),
  );
  assert.ok(Array.isArray(value));
  assert.equal(value.length, actionIds.length);
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const item of value) {
    const entry: unknown = item;
    assert.ok(typeof entry === "object" && entry !== null);
    assert.ok("label" in entry && typeof entry.label === "string");
    assert.ok("args" in entry && Array.isArray(entry.args));
    const id: unknown = entry.args[1];
    assert.ok(typeof id === "string" && actionIds.some((known) => known === id));
    assert.deepEqual(entry, {
      label: entry.label,
      command: "node",
      args: ["scripts/action.ts", id],
      cwd: "$ZED_WORKTREE_ROOT",
      reveal: "never",
      allow_concurrent_runs: false,
      use_new_terminal: false,
      save: "none",
    });
    assert.ok(entry.label.startsWith("Linefield: "));
    ids.add(id);
    labels.add(entry.label);
  }
  assert.equal(ids.size, actionIds.length);
  assert.equal(labels.size, actionIds.length);
});
