import assert from "node:assert/strict";
import { test } from "node:test";
import { outputs, root } from "./generate.ts";
import { renderSourceTask, sourceTasks } from "./source-tasks.ts";

test("TASK-04 all source tasks appear once; packages replace source pages", async () => {
  const tasks = await sourceTasks(root);
  const pages = await outputs();
  const index = pages.get("docs/workflow/task-preview/index.html") ?? "";
  assert.ok(tasks.length > 40);
  for (const task of tasks) {
    assert.equal(index.split(`href="${task.id}.html"`).length - 1, 1, task.id);
    assert.ok(pages.has(`docs/workflow/task-preview/${task.id}.html`));
  }
  assert.ok(!index.includes('href="README.html"'));
  assert.ok(!index.includes('href="_template.html"'));
  assert.ok(
    pages.get("docs/workflow/task-preview/P05-S01.html")?.includes('id="verification-group"'),
  );
  assert.ok(
    pages.get("docs/workflow/task-preview/S00.html")?.includes("Status: planned; not implemented."),
  );
});
test("TASK-04 source task content remains text, without inferred workflow status", () => {
  const html = renderSourceTask(
    {
      id: "S99",
      title: "Example",
      status: "Source task",
      path: "tasks/S99.md",
      source: "<script>alert(1)</script>\n\nStatus: done",
    },
    "",
  );
  assert.ok(html.includes("Source task"));
  assert.ok(html.includes("Status: done"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("TASK-04 source inventory rejects per-file and aggregate overflow without truncation", async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = await mkdtemp(join(tmpdir(), "task-capacity-"));
  try {
    await mkdir(join(directory, "tasks"));
    await writeFile(join(directory, "tasks/S00.md"), "x".repeat(262_145));
    await assert.rejects(sourceTasks(directory), /oversized/);
    for (let i = 0; i < 17; i++) {
      await writeFile(
        join(directory, `tasks/S${String(i).padStart(2, "0")}.md`),
        "x".repeat(262_144),
      );
    }
    await assert.rejects(sourceTasks(directory), /byte budget/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
