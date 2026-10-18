import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readTaskFile } from "./files.ts";
import { taskFixture } from "./fixture.ts";
import { loadTask, validateTask } from "./validate.ts";

test("TASK-02 file reader enforces byte limit and regular file requirement", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-task-bound-"));
  try {
    await writeFile(join(root, "small"), "1234");
    assert.equal((await readTaskFile(root, "small", 4)).toString(), "1234");
    await assert.rejects(readTaskFile(root, "small", 3), /oversized/);
    await mkdir(join(root, "directory"));
    await assert.rejects(readTaskFile(root, "directory"), /regular file/);
    await writeFile(join(root, "large.json"), " ".repeat(524_289));
    await assert.rejects(loadTask(root, "large.json"), /oversized/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("TASK-02 missing test sources are not treated as discovered tests", async () => {
  const root = await mkdtemp(join(tmpdir(), "linefield-task-test-"));
  try {
    await writeFile(join(root, "task.json"), JSON.stringify(taskFixture()));
    await writeFile(join(root, "brief.md"), "brief");
    await writeFile(join(root, "run.json"), "run");
    await assert.rejects(loadTask(root, "task.json"), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("TASK-02 rejects conflicting byte identity and impossible dates", () => {
  const task = taskFixture();
  task.evidence[0]!.path = "brief.md";
  assert.throws(() => validateTask(task), /Conflicting file hashes/);
  const date = taskFixture();
  date.evidence[0]!.recordedAt = "2026-02-31T12:00:00Z";
  assert.throws(() => validateTask(date), /Invalid evidence date/);
});
test("TASK-01 rejects custom prototypes and branchless executable leaves", () => {
  assert.throws(
    () => validateTask(Object.assign(Object.create({ inherited: true }), taskFixture())),
    /plain object/,
  );
  const task = taskFixture();
  task.ownership.branch = null;
  assert.throws(() => validateTask(task), /Leaf requires branch/);
});
test("TASK-02 separates artifact identity from tested runtime identity", () => {
  const task = validateTask(taskFixture());
  assert.equal(task.documents[0]?.artifactRevision, null);
  assert.equal(task.evidence[0]?.artifactRevision, "b".repeat(40));
  assert.equal(task.evidence[0]?.sourceRevision, "a".repeat(40));
  const invalid = { ...task.evidence[0], artifactRevision: "main" };
  assert.throws(() => validateTask({ ...task, evidence: [invalid] }), /no alternative matches/);
  const missing = { ...task.evidence[0] };
  Reflect.deleteProperty(missing, "artifactRevision");
  assert.throws(() => validateTask({ ...task, evidence: [missing] }), /missing artifactRevision/);
});
