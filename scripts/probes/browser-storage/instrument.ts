import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export async function instrumentProxy() {
  const channel = `linefield-synthetic-${randomUUID()}`;
  const root = new URL("../../../quality/browser-storage-v1/", import.meta.url);
  const original = await readFile(
    new URL("sqlite-wasm-3540100/jswasm/sqlite3-opfs-async-proxy.js", root),
    "utf8",
  );
  const target = "await fh.syncHandle.flush();";
  if (original.split(target).length !== 2)
    throw new Error("Expected exactly one xSync flush patch point");
  const prefix = await readFile(new URL("proxy-gate.js", import.meta.url), "utf8");
  const served = `const FIXTURE_CHANNEL = ${JSON.stringify(channel)};\n${prefix}\n${original.replace(target, "await fixtureFlush(fh.syncHandle);")}`;
  const sha = (source: string) => createHash("sha256").update(source).digest("hex");
  await writeFile(
    new URL("proxy-instrumentation.json", root),
    JSON.stringify(
      {
        channel,
        originalSha256: sha(original),
        servedSha256: sha(served),
        prefixSha256: sha(prefix),
        replacementCount: 1,
        patch: { target, replacement: "await fixtureFlush(fh.syncHandle);" },
        point: "before calling real syncHandle.flush, not during already-issued I/O",
        originalBytesModified: false,
      },
      null,
      2,
    ) + "\n",
  );
  return { channel, served };
}
