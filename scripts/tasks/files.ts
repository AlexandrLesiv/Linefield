import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join } from "node:path";

export function safePath(path: string): string {
  if (
    path.length > 500 ||
    /[\\:?#%*]/u.test(path) ||
    [...path].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  )
    throw new Error(`Unsafe repository path: ${path}`);
  return path;
}
/** Bounded local repository reader; rejects links, not a hostile concurrent-filesystem sandbox. */
export async function readTaskFile(root: string, path: string, limit = 8_388_608): Promise<Buffer> {
  safePath(path);
  let absolute = root;
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink())
    throw new Error("Invalid repository root");
  const parts = path.split("/");
  for (const [index, part] of parts.entries()) {
    absolute = join(absolute, part);
    const info = await lstat(absolute);
    if (info.isSymbolicLink() || (index < parts.length - 1 && !info.isDirectory()))
      throw new Error(`Symbolic link or invalid directory: ${path}`);
    if (index === parts.length - 1 && !info.isFile())
      throw new Error(`Not a regular file: ${path}`);
  }
  const file = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit) throw new Error(`Invalid or oversized file: ${path}`);
    const content = Buffer.alloc(info.size + 1);
    let size = 0;
    while (size < content.length) {
      const read = await file.read(content, size, content.length - size, null);
      if (read.bytesRead === 0) break;
      size += read.bytesRead;
    }
    if (size !== info.size) throw new Error(`File changed while reading: ${path}`);
    return content.subarray(0, size);
  } finally {
    await file.close();
  }
}
