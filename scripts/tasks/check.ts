import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadTask } from "./validate.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const entries = await readdir(join(root, "tasks"), { withFileTypes: true });
if (entries.length > 1000) throw new Error("Task inventory limit exceeded");
let count = 0;
for (const entry of entries) {
  if (!entry.isDirectory() || !/^[A-Z0-9-]+$/.test(entry.name)) continue;
  const task = await loadTask(root, `tasks/${entry.name}/task.json`);
  if (task.id !== entry.name) throw new Error("Task ID must match directory");
  count++;
}
console.log(`${count} task records validated; no preview or execution service.`);
