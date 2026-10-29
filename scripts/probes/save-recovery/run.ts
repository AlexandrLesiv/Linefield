import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { cpus, totalmem } from "node:os";
const require = createRequire(
  resolve(process.env.LINEFIELD_PLAYWRIGHT_ROOT || "apps/web/package.json"),
);
const { chromium } = require("@playwright/test");
const output = resolve(process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save03-recovery");
await mkdir(output, { recursive: true });
const source = new URL("./", import.meta.url),
  storage = new URL("../save-storage/", import.meta.url),
  batch = new URL("../save-batch/", import.meta.url),
  vendor = new URL(
    "../../../.build-cache/browser-storage/sqlite-wasm-3540100/jswasm/",
    import.meta.url,
  );
const artifact = JSON.parse(
  await readFile(
    new URL("../../../.build-cache/browser-storage/artifact.json", import.meta.url),
    "utf8",
  ),
);
const wasmPath = process.env.LINEFIELD_CHECKPOINT_WASM;
const wasm = wasmPath ? await readFile(resolve(wasmPath)) : undefined;
const batchFiles = ["incremental.js", "fixture.js"];
const server = createServer(async (request, response) => {
  const path = new URL(request.url || "/", "http://localhost").pathname;
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'",
  );
  if (path === "/") {
    response.setHeader("Content-Type", "text/html");
    response.end("<!doctype html><title>SAVE-03 disposable receipt checkpoint</title>");
    return;
  }
  if (path === "/engine.wasm" && wasm) {
    response.setHeader("Content-Type", "application/wasm");
    response.end(wasm);
    return;
  }
  const name = path.split("/").at(-1) || "";
  const isVendor = path.startsWith("/vendor/");
  if (
    !(
      isVendor
        ? ["sqlite3.js", "sqlite3.wasm"]
        : [
            "storage-worker.js",
            "admission.js",
            "cases.js",
            "client.js",
            "receipts.js",
            "transport.js",
            "load-checks.js",
            "roundtrips.js",
            ...batchFiles,
          ]
    ).includes(name)
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader(
    "Content-Type",
    name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
  );
  try {
    response.end(
      await readFile(
        new URL(
          name,
          isVendor
            ? vendor
            : ["storage-worker.js", "admission.js", "client.js"].includes(name)
              ? storage
              : batchFiles.includes(name)
                ? batch
                : source,
        ),
      ),
    );
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
if (!address || typeof address === "string") throw Error("no server");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/`);
  const results = await page.evaluate("import('/cases.js').then(module=>module.run())");
  const loadChecks = await page.evaluate(
    "import('/load-checks.js').then(module=>module.runLoadChecks())",
  );
  const integrated = wasm
    ? await page.evaluate("import('/roundtrips.js').then(module=>module.roundtrips())")
    : null;
  const hashes: Record<string, string> = {};
  for (const file of [
    "../save-storage/admission.js",
    "cases.js",
    "../save-storage/storage-worker.js",
    "../save-storage/client.js",
    "receipts.js",
    "transport.js",
    "load-checks.js",
    "roundtrips.js",
    "run.ts",
  ])
    hashes[file] = createHash("sha256")
      .update(await readFile(new URL(file, source)))
      .digest("hex");
  if (wasm) {
    hashes.manifest = createHash("sha256")
      .update(await readFile("crates/vector-engine/Cargo.toml"))
      .digest("hex");
    hashes.wasm = createHash("sha256").update(wasm).digest("hex");
    for (const file of batchFiles)
      hashes[`save-batch/${file}`] = createHash("sha256")
        .update(await readFile(new URL(file, batch)))
        .digest("hex");
    for (const file of await readdir("crates/vector-engine/src"))
      if (file.endsWith(".rs"))
        hashes[`rust/${file}`] = createHash("sha256")
          .update(await readFile(`crates/vector-engine/src/${file}`))
          .digest("hex");
  }
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        results,
        integrated,
        loadChecks,
        hashes,
        artifact,
        browser: browser.version(),
        cpu: cpus()[0]?.model,
        ram: totalmem(),
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${results.checks.length} disposable browser-storage assertions; ${output}/report.json`,
  );
} catch (error) {
  await writeFile(`${output}/failure.txt`, String(error));
  throw error;
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
