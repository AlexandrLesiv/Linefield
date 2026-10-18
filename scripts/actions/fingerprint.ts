import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, opendir } from "node:fs/promises";
import { join, sep } from "node:path";
export interface Snapshot {
  sha256: string;
  files: number;
  bytes: number;
}
interface Limits {
  files?: number;
  bytes?: number;
  durationMs?: number;
}
export const sourcePaths = [
  "scripts",
  "shared",
  "apps/web/src",
  "apps/web/tests",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  ".zed/tasks.json",
  "apps/web/package.json",
  "apps/web/tsconfig.json",
  "apps/web/vite.config.ts",
  "apps/web/playwright.config.ts",
];
export async function fingerprint(
  root: string,
  paths: readonly string[],
  signal: AbortSignal,
  limits: Limits = {},
): Promise<Snapshot | null> {
  const hash = createHash("sha256");
  const started = performance.now();
  let files = 0;
  let entries = 0;
  let bytes = 0;
  const check = () => {
    if (
      signal.aborted ||
      entries > (limits.files ?? 5000) ||
      bytes > (limits.bytes ?? 33_554_432) ||
      performance.now() - started > (limits.durationMs ?? 10_000)
    )
      throw Error("snapshot-unavailable");
  };
  async function visit(relative: string): Promise<void> {
    entries++;
    check();
    const path = join(root, relative);
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw Error("snapshot-unavailable");
    if (info.isDirectory()) {
      const names: string[] = [];
      for await (const entry of await opendir(path)) {
        check();
        if (names.length + entries >= (limits.files ?? 5000)) throw Error("snapshot-unavailable");
        names.push(entry.name);
      }
      for (const name of names.sort()) await visit(join(relative, name));
      return;
    }
    if (!info.isFile() || info.size > (limits.bytes ?? 33_554_432) - bytes)
      throw Error("snapshot-unavailable");
    hash.update(`${relative}\0${info.size}\0`);
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const buffer = Buffer.alloc(65_536);
      let read = 0;
      do {
        check();
        read = (await file.read(buffer)).bytesRead;
        bytes += read;
        check();
        hash.update(buffer.subarray(0, read));
      } while (read > 0);
    } finally {
      await file.close();
    }
    files++;
  }
  try {
    for (const path of [...paths].sort()) {
      let ancestor = root;
      for (const segment of path.split(sep).slice(0, -1)) {
        check();
        ancestor = join(ancestor, segment);
        const info = await lstat(ancestor);
        if (!info.isDirectory() || info.isSymbolicLink()) throw Error("snapshot-unavailable");
      }
      await visit(path);
    }
    check();
    return { sha256: hash.digest("hex"), files, bytes };
  } catch {
    return null;
  }
}
export function freshness(
  before: Snapshot | null,
  after: Snapshot | null,
): "fresh" | "stale" | "unavailable" {
  return !before || !after ? "unavailable" : before.sha256 === after.sha256 ? "fresh" : "stale";
}
