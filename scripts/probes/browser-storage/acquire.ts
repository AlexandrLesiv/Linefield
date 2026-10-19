import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const root = new URL("../../../.build-cache/browser-storage/", import.meta.url);
const url = "https://sqlite.org/2026/sqlite-wasm-3540100.zip";
const expected = "87e24f6a4588692310b7942dc2fa7c7275bb9ba2e01d553e4115aa4a904a0050";
await mkdir(root, { recursive: true });
const archive = new URL("sqlite-wasm-3540100.zip", root);
let bytes: Buffer;
try {
  bytes = await readFile(archive);
} catch {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
const digest = createHash("sha3-256").update(bytes).digest("hex");
if (digest !== expected) throw new Error(`Pinned artifact mismatch: ${digest}`);
await writeFile(archive, bytes);
const result = spawnSync("/usr/bin/unzip", ["-o", archive.pathname, "-d", root.pathname], {
  encoding: "utf8",
  timeout: 30_000,
  maxBuffer: 128 * 1024,
});
if (result.status !== 0) throw new Error("Verified upstream archive extraction failed");
await writeFile(
  new URL("artifact.json", root),
  JSON.stringify(
    {
      url,
      expectedSha3_256: expected,
      actualSha3_256: digest,
      bytes: bytes.length,
      verifiedAt: new Date().toISOString(),
      installedAsProductDependency: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Verified and extracted ${bytes.length} upstream bytes (${digest})`);
