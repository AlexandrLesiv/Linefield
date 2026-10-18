import { lstat, mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokens } from "../diagrams/tokens.ts";
import { readTaskFile } from "./files.ts";
import { agentBrief } from "./markdown.ts";
import { previewStyle } from "./preview-style.ts";
import { renderIndex, renderTask } from "./render.ts";
import { loadTask } from "./validate.ts";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export async function outputs(): Promise<Map<string, string>> {
  const entries = await readdir(join(root, "tasks"), { withFileTypes: true });
  if (entries.length > 1000) throw new Error("Task directory limit exceeded");
  const directories = entries.filter(
    (item) => item.isDirectory() && /^[A-Z0-9-]+$/.test(item.name),
  );
  const tasks = [];
  for (const directory of directories) {
    const path = `tasks/${directory.name}/task.json`;
    const task = await loadTask(root, path);
    if (task.id !== directory.name) throw new Error("Task ID must match package directory");
    tasks.push(task);
  }
  if (tasks.length > 100) throw new Error("Pilot task limit exceeded");
  tasks.sort((a, b) => a.id.localeCompare(b.id, "en"));
  const tokens: unknown = JSON.parse(
    (await readTaskFile(root, "shared/diagrams/style.tokens.json")).toString("utf8"),
  );
  const style = previewStyle(loadTokens(tokens));
  const files = new Map<string, string>();
  for (const task of tasks) {
    files.set(`tasks/${task.id}/TASK.generated.md`, agentBrief(task));
    files.set(`docs/workflow/task-preview/${task.id}.html`, await renderTask(root, task, style));
  }
  files.set("docs/workflow/task-preview/index.html", renderIndex(tasks, style));
  return files;
}
async function safeDirectory(path: string): Promise<void> {
  const parts = relative(root, path).split("/");
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    await mkdir(current, { recursive: true });
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("Unsafe output directory");
  }
}
export async function checkInventory(
  directory: string,
  expected: ReadonlySet<string>,
): Promise<void> {
  const entries = await readdir(directory);
  for (const name of entries) {
    if (name.endsWith(".html") && !expected.has(name))
      throw new Error(`Unexpected generated task page: ${name}`);
  }
}
export async function generate(check: boolean): Promise<void> {
  const files = await outputs();
  const directory = join(root, "docs/workflow/task-preview");
  await safeDirectory(directory);
  await checkInventory(
    directory,
    new Set(
      [...files.keys()]
        .filter((path) => path.endsWith(".html"))
        .map((path) => path.split("/").at(-1) ?? ""),
    ),
  );
  for (const [path, content] of files) {
    if (check) {
      const current = await readTaskFile(root, path);
      if (current.toString("utf8") !== content) throw new Error(`Stale task output: ${path}`);
    } else {
      const absolute = join(root, path);
      await safeDirectory(dirname(absolute));
      const existing = await lstat(absolute).catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
        throw error;
      });
      if (existing && (!existing.isFile() || existing.isSymbolicLink()))
        throw new Error("Unsafe output file");
      const staged = `${absolute}.${process.pid}.tmp`;
      await writeFile(staged, content, { flag: "wx" });
      await rename(staged, absolute);
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((value) => value !== "--check"))
    throw new Error("Unknown argument");
  await generate(process.argv.includes("--check"));
  console.log("Task packages, preserved references and generated previews verified.");
}
