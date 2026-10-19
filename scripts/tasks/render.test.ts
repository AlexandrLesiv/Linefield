import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { outputs, root } from "./generate.ts";
import { taskFixture } from "./fixture.ts";
import { renderTask } from "./render.ts";
import { loadTask } from "./validate.ts";

test("TASK-04 deterministic outputs preserve linked source bytes", async () => {
  const task = await loadTask(root, "tasks/P05-S01/task.json");
  const source = task.documents.find((item) => item.id === "original-task");
  assert.ok(source);
  const before = await readFile(new URL(`../../${source.path}`, import.meta.url));
  assert.deepEqual(await outputs(), await outputs());
  assert.equal(createHash("sha256").update(before).digest("hex"), source.sha256);
  assert.deepEqual(await readFile(new URL(`../../${source.path}`, import.meta.url)), before);
});
test("TASK-04 renderer escapes source HTML and keeps executable behavior absent", async () => {
  const task = taskFixture();
  task.documents = [];
  task.evidence = [];
  task.acceptance = [];
  task.summary = '<script>alert("injection")</script><img src="https://example.org">';
  const html = await renderTask(root, task, "");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("Read-only review snapshot"));
});
test("TASK-03 blocked pilot never substitutes healthy evidence for implementation", async () => {
  const task = await loadTask(root, "tasks/S02L/task.json");
  const html = await renderTask(root, task, "");
  assert.equal(task.stage, "blocked");
  assert.ok(task.tests.every((item) => item.status === "planned"));
  assert.ok(html.includes("Blocked"));
  assert.ok(html.includes("Recorded mixed"));
  assert.ok(html.includes("Recorded failed"));
  assert.ok(html.includes("current-code freshness not assessed"));
  assert.ok(html.includes("No executable test source recorded"));
});
