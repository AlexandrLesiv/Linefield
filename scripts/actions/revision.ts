import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
export async function revision(root: string): Promise<string | null> {
  try {
    const directory = join(root, ".git");
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) return null;
    const headInfo = await lstat(join(directory, "HEAD"));
    if (!headInfo.isFile() || headInfo.isSymbolicLink() || headInfo.size > 1024) return null;
    const head = (
      await readFile(join(directory, "HEAD"), {
        encoding: "utf8",
        signal: AbortSignal.timeout(1000),
      })
    ).trim();
    if (/^[a-f0-9]{40}$/.test(head)) return head;
    const ref = /^ref: (refs\/[a-zA-Z0-9_./-]+)$/.exec(head)?.[1];
    if (!ref || ref.includes("..")) return null;
    let ancestor = directory;
    for (const segment of ref.split("/").slice(0, -1)) {
      ancestor = join(ancestor, segment);
      const entry = await lstat(ancestor);
      if (!entry.isDirectory() || entry.isSymbolicLink()) return null;
    }
    const refPath = join(directory, ref);
    const refInfo = await lstat(refPath);
    if (!refInfo.isFile() || refInfo.isSymbolicLink() || refInfo.size > 64) return null;
    const value = (
      await readFile(refPath, { encoding: "utf8", signal: AbortSignal.timeout(1000) })
    ).trim();
    return /^[a-f0-9]{40}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}
