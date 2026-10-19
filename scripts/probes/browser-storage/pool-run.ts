/// <reference lib="dom" />
import playwright from "../../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch } from "node:os";
import { startServer } from "./server.ts";

const output = new URL("../../../.build-cache/browser-storage/", import.meta.url);
const startedAt = new Date().toISOString();
const profile = await mkdtemp("/private/tmp/linefield-synthetic-pool-");
const server = await startServer();
const context = await playwright.chromium
  .launchPersistentContext(profile, {
    headless: true,
    channel: "chrome",
  })
  .catch((error: unknown) => {
    server.closeAllConnections();
    server.close();
    throw error;
  });
const results: unknown[] = [];
const diagnostics: string[] = [];
let failed = false;
async function bounded<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Pool evaluation deadline")), 90000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
try {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (diagnostics.length < 40) diagnostics.push(message.text().slice(0, 500));
  });
  await page.goto("http://127.0.0.1:65149");
  const cases: unknown = await bounded(
    page.evaluate("import('/pool-scenarios.js').then(m => m.baseline())"),
  );
  results.push(cases);
  if (JSON.stringify(cases).includes('"status":"failed"')) failed = true;
  const canary = await bounded(
    page.evaluate<{ name: string; bytes: number[] }>(
      "import('/pool-scenarios.js').then(m => m.prepareCanary())",
    ),
  );
  if (
    !canary.bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255) ||
    canary.bytes.length > 32768
  )
    throw new Error("Invalid canary bytes");
  await writeFile(new URL("synthetic-canary-before.bin", output), Buffer.from(canary.bytes));
  const after = await bounded(
    page.evaluate<{ id: string; status: string; initialized: unknown; bytes: number[] }>(
      `import('/pool-scenarios.js').then(m => m.damageCanary(${JSON.stringify(canary.name)}))`,
    ),
  );
  await writeFile(new URL("synthetic-canary-after.bin", output), Buffer.from(after.bytes));
  results.push({
    id: after.id,
    status: "finding",
    initialized: after.initialized,
    beforeBytes: canary.bytes.length,
    afterBytes: after.bytes.length,
    beforeSha256: createHash("sha256").update(Buffer.from(canary.bytes)).digest("hex"),
    afterSha256: createHash("sha256").update(Buffer.from(after.bytes)).digest("hex"),
    payloadTruncated: after.bytes.length < canary.bytes.length,
    meaning:
      "Synthetic corrupted pool metadata; initialization may destructively disassociate/truncate despite preserveOnInitFailure:true. NOT safety acceptance.",
  });
} catch (error) {
  failed = true;
  results.push({ status: "failed", error: String(error).slice(0, 6000) });
} finally {
  await context.close();
  server.closeAllConnections();
  server.close();
}
const hashes: Record<string, string> = {};
for (const name of await readdir(new URL("./", import.meta.url)))
  hashes[name] = createHash("sha256")
    .update(await readFile(new URL(name, import.meta.url)))
    .digest("hex");
await writeFile(
  new URL("pool-results.json", output),
  JSON.stringify(
    {
      startedAt,
      completedAt: new Date().toISOString(),
      browser: "Chrome",
      version: context.browser()?.version(),
      host: { platform: platform(), release: release(), arch: arch(), node: process.version },
      baseRevision: "fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7",
      dirtyWorkingTree: true,
      sourceHashes: hashes,
      results,
      diagnostics,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
if (failed) process.exitCode = 1;
