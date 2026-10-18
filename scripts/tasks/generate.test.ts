import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkInventory } from "./generate.ts";
import { agentBrief } from "./markdown.ts";
import { taskFixture } from "./fixture.ts";

test("TASK-04 removed or renamed package cannot leave an unnoticed generated page", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linefield-task-pages-"));
  try {
    await writeFile(join(directory, "OLD.html"), "preserved old output");
    await assert.rejects(
      checkInventory(directory, new Set(["index.html", "NEW.html"])),
      /Unexpected/,
    );
    await checkInventory(directory, new Set(["OLD.html"]));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("TASK-04 generated Markdown escapes HTML and data-authored links", () => {
  const task = taskFixture();
  task.summary = '<img src="https://example.invalid/pixel"> [link](javascript:alert(1))';
  const text = agentBrief(task);
  assert.ok(!text.includes("<img"));
  assert.ok(!text.includes("[link](javascript:"));
  assert.ok(text.includes("&lt;img"));
  assert.ok(text.includes("\\[link\\]\\("));
});
