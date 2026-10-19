import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch } from "node:os";
import { test, expect } from "@playwright/test";
test("WMP-09 early real Rust pen checkpoint (measurement, not acceptance pass)", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/fixtures/memory/index.html");
  await page.getByRole("button", { name: "Run real pen checkpoint", exact: true }).click();
  await expect(page.locator("#result")).toContainText('"status":"passed"', { timeout: 150_000 });
  const evidence = await page.locator("#result").textContent();
  const build = await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8");
  const manifest = await readFile("../../.build-cache/web-memory/e2e-site/.vite/manifest.json");
  await writeFile(
    info.outputPath("identity.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        host: { platform: platform(), release: release(), arch: arch() },
        node: process.version,
        runtimeBuild: JSON.parse(build) as unknown,
        manifestSha256: createHash("sha256").update(manifest).digest("hex"),
        timestamp: new Date().toISOString(),
        measurement:
          "Isolated browser executes actual checked Rust/Wasm pen and generated scene pages; not UI input latency or GPU completion",
      },
      null,
      2,
    ),
  );
  await writeFile(info.outputPath("evidence.json"), evidence ?? "");
  await info.attach("real-pen-checkpoint-measurement", {
    body: evidence ?? "",
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});
