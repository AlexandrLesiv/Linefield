import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
export async function synchronize(
  directory: string,
  outputs: Record<string, string>,
  check: boolean,
): Promise<void> {
  async function inventory(path: string): Promise<string[]> {
    const status = await lstat(path).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    });
    if (status && !status.isDirectory())
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
  const extra = (await inventory(directory)).filter((path) => !(path in outputs));
  if (extra.length)
    throw Error(`Unexpected generated files (remove explicitly): ${extra.join(", ")}`);
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
