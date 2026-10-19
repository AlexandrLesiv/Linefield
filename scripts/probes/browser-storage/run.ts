/// <reference lib="dom" />
import playwright from "../../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { platform, release, arch } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { startServer } from "./server.ts";

const output = new URL("../../../.build-cache/browser-storage/", import.meta.url);
const filter = process.argv[2];
if (filter !== undefined && filter !== "firefox")
  throw new Error("Only optional firefox filter is supported");
const startedAt = new Date().toISOString();
const server = await startServer();
const results: unknown[] = [];
const diagnostics: string[] = [];
let failed = false;
const { chromium, firefox, webkit } = playwright;
async function bounded<T>(operation: Promise<T>, milliseconds = 90000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Fixture evaluation deadline exceeded")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
try {
  for (const browserType of filter === "firefox" ? [firefox] : [chromium, firefox, webkit]) {
    const profile = await mkdtemp(join("/private/tmp", "linefield-synthetic-storage-"));
    const name = browserType.name();
    try {
      const options =
        name === "chromium" ? { headless: true, channel: "chrome" } : { headless: true };
      const context = await browserType.launchPersistentContext(profile, options);
      try {
        const page = await context.newPage();
        page.on("console", (message) => {
          if (diagnostics.length < 80) diagnostics.push(`${name}: ${message.text().slice(0, 500)}`);
        });
        page.on("pageerror", (error) => {
          if (diagnostics.length < 80) diagnostics.push(`${name}: ${String(error).slice(0, 500)}`);
        });
        await page.goto("http://127.0.0.1:65149");
        const capabilities = await page.evaluate(
          "({isolated:crossOriginIsolated,secure:isSecureContext,opfs:!!navigator.storage.getDirectory,locks:!!navigator.locks,userAgent:navigator.userAgent})",
        );
        const cases: unknown = await bounded(
          page.evaluate(`import('/scenarios.js').then(m => m.baseline(${name === "chromium"}))`),
        );
        if (JSON.stringify(cases).includes('"status":"failed"')) failed = true;
        results.push({ browser: name, version: context.browser()?.version(), capabilities, cases });
        if (name === "chromium" && !failed) {
          for (const terminate of [false, true]) {
            const fault: unknown = await bounded(
              page.evaluate(`import('/fault.js').then(m => m.proxyBarrier(${terminate}))`),
              45000,
            );
            if (JSON.stringify(fault).includes('"status":"failed"')) failed = true;
            results.push({ browser: name, fault });
            if (failed) break;
          }
        }
      } finally {
        await context.close();
      }
      if (name === "chromium") {
        const restarted = await browserType.launchPersistentContext(profile, options);
        try {
          const page = await restarted.newPage();
          await page.goto("http://127.0.0.1:65149");
          results.push({
            browser: name,
            restart: await bounded(
              page.evaluate("import('/scenarios.js').then(m => m.reopened())"),
              30000,
            ),
          });
        } finally {
          await restarted.close();
        }
      }
    } catch (error) {
      const unavailable = String(error).includes("Executable doesn't exist");
      if (!unavailable) failed = true;
      results.push({
        browser: name,
        status: unavailable ? "unrun_browser_not_installed" : "failed",
        error: String(error).slice(0, 6000),
      });
    }
  }
} finally {
  server.closeAllConnections();
  server.close();
}
const sources: Record<string, string> = {};
for (const file of await readdir(new URL("./", import.meta.url))) {
  sources[file] = createHash("sha256")
    .update(await readFile(new URL(file, import.meta.url)))
    .digest("hex");
}
const vendor: Record<string, string> = {};
for (const file of ["sqlite3.js", "sqlite3.wasm", "sqlite3-opfs-async-proxy.js"]) {
  vendor[file] = createHash("sha256")
    .update(await readFile(new URL(`sqlite-wasm-3540100/jswasm/${file}`, output)))
    .digest("hex");
}
await writeFile(
  new URL(filter === "firefox" ? "firefox-results.json" : "results.json", output),
  JSON.stringify(
    {
      startedAt,
      completedAt: new Date().toISOString(),
      revision: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
      dirtyWorkingTree: true,
      host: { platform: platform(), release: release(), arch: arch(), node: process.version },
      sources,
      vendor,
      results,
      diagnostics,
      limits:
        "Synthetic fixture only; no power-loss, product bridge, native E2E or universal proxy-fencing proof.",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
if (failed) process.exitCode = 1;
