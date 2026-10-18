import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
async function status(path: string) {
  return lstat(path).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
}
function validatePaths(outputs: Record<string, string>): void {
  const paths = new Set(Object.keys(outputs));
  const spellings = new Map<string, string>();
  for (const path of paths) {
    const parts = path.split("/");
    if (parts.some((part) => !/^[A-Za-z0-9_-](?:[A-Za-z0-9_.-]*[A-Za-z0-9_-])?$/.test(part)))
      throw Error("Generated output path must be an ASCII relative file path");
    for (let end = 1; end <= parts.length; end++) {
      const prefix = parts.slice(0, end).join("/");
      const folded = prefix.toLowerCase();
      const previous = spellings.get(folded);
      if (previous !== undefined && previous !== prefix)
        throw Error("Generated output path collision");
      spellings.set(folded, prefix);
    }
    for (let end = 1; end < parts.length; end++)
      if (paths.has(parts.slice(0, end).join("/"))) throw Error("Generated output path collision");
  }
}
async function validateAncestors(directory: string): Promise<void> {
  const ancestors = [];
  for (let path = directory; ; path = dirname(path)) {
    ancestors.push(path);
    if (dirname(path) === path) break;
  }
  for (const path of ancestors.reverse()) {
    const entry = await status(path);
    if (entry && (!entry.isDirectory() || entry.isSymbolicLink()))
      throw Error("Generated directory must be a real directory without symlink ancestors");
  }
}
export async function synchronize(
  directory: string,
  outputs: Record<string, string>,
  check: boolean,
): Promise<void> {
  validatePaths(outputs);
  directory = resolve(directory);
  await validateAncestors(directory);
  async function inventory(path: string): Promise<string[]> {
    const entryStatus = await status(path);
    if (entryStatus && !entryStatus.isDirectory())
      throw Error("Generated directory must be a real directory");
    const entries = await readdir(path, { withFileTypes: true }).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    });
    const files: string[] = [];
    for (const entry of entries) {
      const location = join(path, entry.name);
      if (!entry.isDirectory() && !entry.isFile())
        throw Error("Generated output must not contain symlinks or special files");
      if (entry.isDirectory()) files.push(...(await inventory(location)));
      else files.push(relative(directory, location));
    }
    return files;
  }
  const extra = (await inventory(directory)).filter((path) => !Object.hasOwn(outputs, path));
  if (extra.length)
    throw Error(`Unexpected generated files (remove explicitly): ${extra.join(", ")}`);
  for (const path of Object.keys(outputs)) {
    const entry = await status(join(directory, path));
    if (entry && (!entry.isFile() || entry.isSymbolicLink()))
      throw Error("Generated output target must be a regular file");
  }
  for (const [path, content] of Object.entries(outputs)) {
    const location = join(directory, path);
    const actual = await readFile(location, "utf8").catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    });
    if (check && actual !== content) throw Error(`Stale generated resource: ${path}`);
    if (check || actual === content) continue;
    await mkdir(dirname(location), { recursive: true });
    await writeFile(location, content);
  }
}
