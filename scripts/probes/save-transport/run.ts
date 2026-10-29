import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { cpus, totalmem, platform, release } from "node:os";
const require = createRequire(
  resolve(process.env.LINEFIELD_PLAYWRIGHT_ROOT || "apps/web/package.json"),
);
const { chromium } = require("@playwright/test");
const output = resolve(process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save01");
await mkdir(output, { recursive: true });
const root = new URL("./", import.meta.url);
const server = createServer(async (request, response) => {
  const file = request.url === "/" ? "index.html" : request.url?.slice(1);
  if (
    !file ||
    !["index.html", "probe.js", "worker.js", "transport.js", "recovery.js"].includes(file)
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", file.endsWith("html") ? "text/html" : "text/javascript");
  try {
    response.end(await readFile(new URL(file, root)));
  } catch {
    response.writeHead(500);
    response.end();
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
if (!address || typeof address === "string") throw Error("missing address");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.waitForFunction("!!window.checkpoint");
  const environment = await page.evaluate(
    "({isolated:crossOriginIsolated,dpr:devicePixelRatio,userAgent:navigator.userAgent})",
  );
  if (!environment.isolated) throw Error("shared-memory isolation missing");
  const sourceHashes: Record<string, string> = {};
  for (const name of ["probe.js", "transport.js", "worker.js", "recovery.js", "run.ts"])
    sourceHashes[name] = createHash("sha256")
      .update(await readFile(new URL(name, root)))
      .digest("hex");
  const runs = [];
  await page.evaluate("checkpoint.compare(1000)");
  for (const count of [1000, 100000, 1000000]) {
    for (let repeat = 0; repeat < 6; repeat++) {
      const result = await page.evaluate(`checkpoint.compare(${count},${repeat})`);
      runs.push({ count, repeat, result });
      await writeFile(`${output}/runs.json`, JSON.stringify(runs, null, 2));
    }
  }
  const recovery = await page.evaluate("checkpoint.recovery()");
  if (errors.length) throw Error(errors.join("\n"));
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        sourceHashes,
        hardware: {
          cpu: cpus()[0]?.model,
          ramBytes: totalmem(),
          platform: platform(),
          release: release(),
        },
        browser: browser.version(),
        environment,
        runs,
        recovery,
        limitations: [
          "Synthetic browser transport, not actual editor or SQLite saving",
          "Canonical payload generation excluded and reported separately",
          "No Rust module/allocator or native adapter exercised",
          "No GPU or physical input latency claim",
          "Allocation counts exclude browser/worker/runtime overhead",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${runs.length * 3} comparisons and ${recovery.variants.reduce((n: number, v: { checks: string[] }) => n + v.checks.length, 0)} recovery assertions. ${output}/report.json`,
  );
} finally {
  await browser.close();
  server.close();
}
