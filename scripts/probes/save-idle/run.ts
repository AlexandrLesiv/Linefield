import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { cpus, totalmem } from "node:os";
const require = createRequire(
  resolve(process.env.LINEFIELD_PLAYWRIGHT_ROOT || "apps/web/package.json"),
);
const { chromium } = require("@playwright/test");
const out = resolve(process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save04-idle");
await mkdir(out, { recursive: true });
const wasm = await readFile(
  resolve(
    process.env.LINEFIELD_CHECKPOINT_WASM ||
      ".build-cache/save04-rust-target/wasm32-unknown-unknown/vector-editor/vector_core.wasm",
  ),
);
const paths: Record<string, string> = {};
for (const [dir, files] of [
  [
    "save-idle",
    [
      "scheduler.js",
      "targets.js",
      "adapter.js",
      "exit.js",
      "input.js",
      "checks.js",
      "performance.js",
      "lifecycle.js",
      "termination.js",
    ],
  ],
  ["save-storage", ["client.js", "storage-worker.js", "admission.js"]],
  ["save-recovery", ["receipts.js", "transport.js", "cases.js"]],
  [
    "save-batch",
    ["fixture.js", "incremental.js", "idle-boundary.js", "idle-checks.js", "idle-performance.js"],
  ],
] as const)
  for (const file of files) paths[file] = `scripts/probes/${dir}/${file}`;
paths["idle-storage.js"] = "scripts/probes/save-idle/storage.js";
const vendor = ".build-cache/browser-storage/sqlite-wasm-3540100/jswasm/";
const server = createServer(async (req, res) => {
  const name = new URL(req.url || "/", "http://localhost").pathname.slice(1);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  if (!name) {
    res.setHeader("Content-Type", "text/html");
    res.end("<!doctype html><title>Isolated SAVE-04</title>");
    return;
  }
  if (name === "engine.wasm") {
    res.setHeader("Content-Type", "application/wasm");
    res.end(wasm);
    return;
  }
  const file =
    paths[name] ||
    (name === "vendor/sqlite3.js" || name === "vendor/sqlite3.wasm"
      ? vendor + name.slice(7)
      : undefined);
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    res.setHeader("Content-Type", file.endsWith("wasm") ? "application/wasm" : "text/javascript");
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const addr = server.address();
if (!addr || typeof addr === "string") throw Error("server");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const fixtureContext = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await fixtureContext.newPage();
  await page.goto(`http://127.0.0.1:${addr.port}/`);
  await page.evaluate(
    `window.loadEngine=async()=>(await WebAssembly.instantiate(await WebAssembly.compile(await(await fetch('/engine.wasm')).arrayBuffer()))).exports`,
  );
  const checks = await page.evaluate(
    "import('/checks.js').then(m=>m.runChecks(window.loadEngine))",
  );
  const boundary = await page.evaluate(
    "import('/idle-checks.js').then(m=>m.idleChecks(window.loadEngine))",
  );
  const lifecycle = await page.evaluate(
    "import('/lifecycle.js').then(m=>m.lifecycle(window.loadEngine))",
  );
  const termination = [];
  for (const mode of ["before-commit", "after-commit"]) {
    const closing = await page.context().newPage();
    await closing.goto(`http://127.0.0.1:${addr.port}/`);
    await closing.evaluate(
      `window.loadEngine=async()=>(await WebAssembly.instantiate(await WebAssembly.compile(await(await fetch('/engine.wasm')).arrayBuffer()))).exports`,
    );
    await closing.evaluate(
      `import('/termination.js').then(m=>m.stageTermination(window.loadEngine,"${mode}"))`,
    );
    await closing.waitForFunction("window.terminationReady===true");
    await closing.close();
    termination.push(
      await page.evaluate(
        `import('/termination.js').then(m=>m.reopenTermination("${mode}",window.loadEngine))`,
      ),
    );
  }
  await page.evaluate("import('/termination.js').then(m=>m.installWarning(window.loadEngine))");
  await page.mouse.click(30, 30);
  const dialogEvent = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const dialog = await dialogEvent;
  if (dialog.type() !== "beforeunload") throw Error("missing native unload warning");
  await dialog.dismiss();
  if (page.isClosed()) throw Error("dismissed close still exited");
  termination.push({ mode: "browser-warning", dismissed: true });
  await page.evaluate("window.removeWarning()");
  const performanceResults =
    process.env.LINEFIELD_PERFORMANCE === "1"
      ? await page.evaluate("import('/performance.js').then(m=>m.measure(window.loadEngine))")
      : null;
  const large = [];
  const modes = ["legacy", "idle", "idle", "legacy", "legacy", "idle"];
  modes.push("legacy-long", "idle-long");
  if (process.env.LINEFIELD_LARGE === "1")
    for (const mode of modes) {
      const context = await browser.newContext(),
        probe = await context.newPage();
      try {
        await probe.goto(`http://127.0.0.1:${addr.port}/`);
        large.push(
          await probe.evaluate(
            `(async()=>{const compiled=await WebAssembly.compile(await(await fetch('/engine.wasm')).arrayBuffer());const load=async()=>(await WebAssembly.instantiate(compiled)).exports;return(await import('/idle-performance.js')).idlePerformance(load,${mode.endsWith("long") ? 1000000 : 100000},"${mode.split("-")[0]}","${mode.endsWith("long") ? "long" : "tiny"}");})()`,
          ),
        );
      } finally {
        await context.close();
      }
    }
  const hashes: Record<string, string> = { wasm: createHash("sha256").update(wasm).digest("hex") };
  for (const file of new Set(Object.values(paths)))
    hashes[file] = createHash("sha256")
      .update(await readFile(file))
      .digest("hex");
  for (const file of await readdir("crates/vector-engine/src"))
    if (file.endsWith(".rs"))
      hashes[`rust/${file}`] = createHash("sha256")
        .update(await readFile(`crates/vector-engine/src/${file}`))
        .digest("hex");
  hashes.manifest = createHash("sha256")
    .update(await readFile("crates/vector-engine/Cargo.toml"))
    .digest("hex");
  hashes.runner = createHash("sha256")
    .update(await readFile(new URL(import.meta.url)))
    .digest("hex");
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        checks,
        boundary,
        lifecycle,
        termination,
        large,
        performanceResults,
        hashes,
        browser: browser.version(),
        cpu: cpus()[0]?.model,
        ram: totalmem(),
        viewport: [1200, 800],
        dpr: 2,
      },
      null,
      2,
    ),
  );
  console.log(`PASS ${checks.length} idle/exit assertions; ${out}/report.json`);
} catch (e) {
  await writeFile(`${out}/failure.txt`, String(e));
  throw e;
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
