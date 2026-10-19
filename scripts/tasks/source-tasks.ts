import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { readTaskFile } from "./files.ts";
import { escape as e, prose, shell, sourceLink } from "./presentation.ts";

export interface TaskEntry {
  id: string;
  title: string;
  status: string;
}
export interface SourceTask extends TaskEntry {
  path: string;
  source: string;
}
export async function sourceTasks(root: string): Promise<SourceTask[]> {
  const entries = await readdir(join(root, "tasks"));
  const names = entries.filter(
    (name) => /^[A-Z][A-Z0-9-]*\.md$/.test(name) && name !== "README.md",
  );
  if (names.length > 1000) throw new Error("Source task limit exceeded");
  const tasks: SourceTask[] = [];
  let bytes = 0;
  for (const name of names.sort()) {
    const id = name.slice(0, -3);
    const path = `tasks/${name}`;
    const content = await readTaskFile(root, path, 262_144);
    bytes += content.length;
    if (bytes > 4_194_304) throw new Error("Source task byte budget exceeded");
    const source = content.toString("utf8");
    const heading = source.match(/^# (.+)$/m)?.[1] ?? id;
    const title = heading.replace(new RegExp(`^${id}\\s*(?:—\\s*)?`), "") || id;
    tasks.push({ id, title, status: "Source task", path, source });
  }
  return tasks;
}
export function renderSourceTask(task: SourceTask, style: string): string {
  return shell(
    task.title,
    style,
    `<a class="back" href="index.html">← Tasks</a>
<main id="main"><h1>${e(task.title)}</h1><p class="status">${e(task.id)} · Source task</p>
<p class="lead">Original task document. Status and evidence have not yet been reconciled into a structured package.</p>
<details class="group"><summary>Task details</summary><div class="group-content">${prose(task.source)}</div></details>
<p class="meta source-link"><a href="${e(sourceLink(task.path))}" rel="noreferrer">View source ↗</a></p></main>`,
  );
}
