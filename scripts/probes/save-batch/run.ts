import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { cpus, platform, release } from "node:os";
const require = createRequire(
  resolve(process.env.LINEFIELD_PLAYWRIGHT_ROOT || "apps/web/package.json"),
);
const { chromium } = require("@playwright/test");
const output = resolve(process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save02-batch");
await mkdir(output, { recursive: true });
const wasm = await readFile(
  resolve(
    process.env.LINEFIELD_CHECKPOINT_WASM ||
      ".build-cache/save02-rust-target/wasm32-unknown-unknown/vector-editor/vector_core.wasm",
  ),
);
const root = new URL("./", import.meta.url);
const allowed = [
  "probe.js",
  "checks.js",
  "fixture.js",
  "worker.js",
  "limits.js",
  "incremental.js",
  "incremental-checks.js",
];
const server = createServer(async (request, response) => {
  const file = request.url?.slice(1);
  response.setHeader("Cache-Control", "no-store");
  if (!file) {
    response.setHeader("Content-Type", "text/html");
    response.end('<script type="module" src="/probe.js"></script>');
  } else if (file === "engine.wasm") {
    response.setHeader("Content-Type", "application/wasm");
    response.end(wasm);
  } else if (allowed.includes(file)) {
    response.setHeader("Content-Type", "text/javascript");
    response.end(await readFile(new URL(file, root)));
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
if (!address || typeof address === "string") throw Error("server unavailable");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.waitForFunction("!!window.checkpoint");
  const incremental = process.env.LINEFIELD_INCREMENTAL === "1";
  const checks = await page.evaluate(
    incremental ? "checkpoint.incrementalChecks()" : "checkpoint.checks()",
  );
  const limits =
    process.env.LINEFIELD_LIMITS === "1" ? await page.evaluate("checkpoint.limits()") : null;
  const runs = [];
  const incrementalRuns = [];
  if (incremental && process.env.LINEFIELD_CHECKS_ONLY !== "1") {
    for (const count of [1000, 10000, 100000])
      incrementalRuns.push(await page.evaluate(`checkpoint.incrementalMeasure(${count})`));
  }
  if (!incremental && process.env.LINEFIELD_CHECKS_ONLY !== "1") {
    await page.evaluate("checkpoint.measure(1000)");
    for (const count of [1000, 100000, 1000000]) {
      for (let repeat = 0; repeat < 5; repeat++) {
        runs.push({ repeat, result: await page.evaluate(`checkpoint.measure(${count})`) });
      }
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  const sourceHashes: Record<string, string> = {};
  const rustSources = [
    "lib.rs",
    "slice.rs",
    "layers.rs",
    "selection.rs",
    "regional.rs",
    "save_metadata.rs",
    "save_checkpoint.rs",
    "save_delta.rs",
    "save_delta_wire.rs",
    "save_delta_transport.rs",
    "save_decode.rs",
    "save_replay.rs",
    "save_replay_model.rs",
  ];
  const sources = [
    ...allowed,
    "run.ts",
    "../../../crates/vector-engine/Cargo.toml",
    ...rustSources.map((name) => `../../../crates/vector-engine/src/${name}`),
  ];
  for (const source of sources) {
    sourceHashes[source] = createHash("sha256")
      .update(await readFile(new URL(source, root)))
      .digest("hex");
  }
  const report = {
    sourceHashes,
    checks,
    incrementalRuns,
    limits,
    runs,
    wasmSha256: createHash("sha256").update(wasm).digest("hex"),
    browser: browser.version(),
    hardware: { cpu: cpus()[0]?.model, platform: platform(), release: release() },
  };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    `PASS ${incremental ? checks.checks.length : checks.length} browser assertions; ${runs.length + incrementalRuns.length} measured captures. ${output}/report.json`,
  );
} finally {
  await browser.close();
  server.close();
}
