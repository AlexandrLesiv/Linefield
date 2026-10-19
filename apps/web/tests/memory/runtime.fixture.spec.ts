import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch } from "node:os";
import { test, expect } from "@playwright/test";
for (const label of [
  "Run render target boundary",
  "Run render target failure",
  "Run viewport boundary",
  "Run rotation boundary",
  "Run boundary matrix",
  "Run resource lifetimes",
  "Run bounded calibration",
  "Run cleanup failure",
]) {
  test(`WMR-03/04/06 isolated browser evidence: ${label}`, async ({ page, browser }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 150_000 });
    await expect(page.locator("#result")).toContainText('"status":"passed"', { timeout: 150_000 });
    const result = await page.locator("#result").textContent();
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
        },
        null,
        2,
      ),
    );
    await writeFile(info.outputPath("evidence.json"), result ?? "");
    await info.attach("synthetic-browser-evidence", {
      body: result ?? "",
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
    if (label === "Run bounded calibration") {
      const report: {
        result: {
          results: {
            scene?: { name: string };
            width: number;
            digest?: string;
            disposed?: { live: Record<string, number>; deletionFailures: number };
          }[];
        };
      } = JSON.parse(result ?? "{}");
      const groups = new Map<string, Set<string>>();
      for (const row of report.result.results) {
        if (row.disposed) {
          expect(Object.values(row.disposed.live)).toEqual([0, 0, 0, 0, 0, 0]);
          expect(row.disposed.deletionFailures).toBe(0);
        } else if (row.scene && row.digest) {
          const key = `${row.width}:${row.scene.name}`;
          const hashes = groups.get(key) ?? new Set<string>();
          hashes.add(row.digest);
          groups.set(key, hashes);
        }
      }
      expect(groups.size).toBe(8);
      for (const hashes of groups.values()) expect(hashes.size).toBe(1);
    }
  });
}
