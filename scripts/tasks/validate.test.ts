import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { taskFixture } from "./fixture.ts";
import { loadTask, validateTask } from "./validate.ts";
import { validateAgainstSchema } from "./schema-validation.ts";
import { safePath } from "./files.ts";

test("TASK-01 validates leaf and planned milestone without inventing execution", () => {
  assert.equal(validateTask(taskFixture()).stage, "owner-review");
  const task = taskFixture();
  task.kind = "milestone";
  task.stage = "blocked";
  task.ownership.branch = null;
  task.tests = [
    {
      id: "check",
      kind: "native",
      status: "planned",
      path: null,
      selector: null,
      description: "Not implemented",
    },
  ];
  assert.equal(validateTask(task).tests[0]?.status, "planned");
});
test("TASK-01 rejects unsupported schema keywords even in unused alternatives", () => {
  assert.throws(
    () => validateAgainstSchema("x", { anyOf: [{ type: "string" }, { format: "uri" }] }),
    /unsupported keyword/,
  );
  assert.throws(
    () => validateAgainstSchema("x", { type: "string", maxLength: -1 }),
    /invalid maxLength/,
  );
});
test("TASK-01 rejects unknown fields, missing fields, overlong and invalid values", () => {
  assert.throws(() => validateTask({ ...taskFixture(), surprise: true }), /unknown property/);
  assert.throws(() => validateTask({ ...taskFixture(), title: undefined }), /expected string/);
  assert.throws(() => validateTask({ ...taskFixture(), title: "x".repeat(16001) }), /too long/);
  assert.throws(() => validateTask({ ...taskFixture(), stage: "green" }), /unknown value/);
  assert.throws(
    () => validateTask({ ...taskFixture(), evidence: Array(257).fill(null) }),
    /too many items/,
  );
});
test("TASK-02 rejects duplicate IDs, dangling links and unbound source manifests", () => {
  const task = taskFixture();
  task.documents.push({ ...task.documents[0]! });
  assert.throws(() => validateTask(task), /Duplicate document/);
  const dangling = taskFixture();
  dangling.authority.refs = ["absent"];
  assert.throws(() => validateTask(dangling), /Dangling authority/);
  const source = taskFixture();
  source.evidence[0]!.sourceManifest = "missing.json";
  assert.throws(() => validateTask(source), /hashed reference/);
});
test("TASK-03 rejects unknown tests, missing selectors and inconsistent PR identity", () => {
  const task = taskFixture();
  task.acceptance[0]!.testIds = ["missing"];
  assert.throws(() => validateTask(task), /Dangling test/);
  const selector = taskFixture();
  selector.tests[0]!.selector = null;
  assert.throws(() => validateTask(selector), /path and selector/);
  const pr = taskFixture();
  pr.pr = {
    repository: "owner/repo",
    number: 3,
    url: "https://github.com/other/repo/pull/3",
    observedState: "open",
    observedAt: "2026-10-19T12:00:00Z",
    headRevision: null,
    baseBranch: "main",
    mergeRevision: null,
  };
  assert.throws(() => validateTask(pr), /PR identity mismatch/);
});
test("TASK-03 done needs matching merged identity and integration evidence", () => {
  const task = taskFixture();
  task.stage = "done";
  assert.throws(() => validateTask(task), /Done requires/);
  task.pr = {
    repository: "owner/repo",
    number: 3,
    url: "https://github.com/owner/repo/pull/3",
    observedState: "merged",
    observedAt: "2026-10-19T12:00:00Z",
    headRevision: "a".repeat(40),
    baseBranch: "main",
    mergeRevision: "a".repeat(40),
  };
  task.integration = { revision: "a".repeat(40), evidenceId: "run" };
  assert.equal(validateTask(task).stage, "done");
  task.evidence[0]!.outcome = "failed";
  assert.throws(() => validateTask(task), /Done requires/);
  task.kind = "milestone";
  assert.throws(() => validateTask(task), /milestone aggregation/);
});
test("TASK-02 rejects traversal, absolute paths and link-like locations", () => {
  for (const path of [
    "../secret",
    "/secret",
    "a//b",
    "a/./b",
    "C:\\secret",
    "https://site",
    "a%2fb",
    "a\0b",
  ])
    assert.throws(() => safePath(path), /Unsafe repository path/);
});
test("TASK-02 verifies artifact bytes and rejects missing, changed and symlink sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-task-"));
  try {
    await writeFile(join(root, "task.json"), JSON.stringify(taskFixture()));
    await writeFile(join(root, "brief.md"), "brief");
    await writeFile(join(root, "run.json"), "run");
    await writeFile(join(root, "check.ts"), "// check");
    assert.equal((await loadTask(root, "task.json")).id, "DX-T02");
    await writeFile(join(root, "run.json"), "changed");
    await assert.rejects(loadTask(root, "task.json"), /Hash mismatch/);
    await rm(join(root, "run.json"));
    await assert.rejects(loadTask(root, "task.json"), /ENOENT/);
    await symlink("brief.md", join(root, "run.json"));
    await assert.rejects(loadTask(root, "task.json"), /Symbolic link/);
    await symlink(root, join(root, "linked"));
    await assert.rejects(loadTask(root, "linked/task.json"), /Symbolic link/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
