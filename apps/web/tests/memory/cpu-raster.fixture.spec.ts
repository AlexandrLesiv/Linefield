import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";

test("WMP-R05 CPU raster parity and bounded operation checkpoint", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const site = "../../.build-cache/web-memory/e2e-site";
  const bundles: Record<string, string> = {};
  for (const file of await readdir(`${site}/assets`))
    bundles[file] = createHash("sha256")
      .update(await readFile(`${site}/assets/${file}`))
      .digest("hex");
  await writeFile(
    info.outputPath("identity.json"),
    JSON.stringify(
      {
        sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        sourceStatus: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }),
        bundles,
        runtime: JSON.parse(
          await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8"),
        ) as unknown,
        timestamp: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
        scope: "headless browser experiment; no physical latency or profile-v1 p95 acceptance",
        conditions:
          "1280x900 headless viewport; display refresh, power and thermal state unmeasured",
        oracle: "CPU whole/tiled exact RGBA; CPU/GPU differences reported separately, not accepted",
        formats:
          "CPU sRGB RGBA8888 Unpremul; GPU Premul; both read back Unpremul over opaque white",
      },
      null,
      2,
    ),
  );
  const early = [
    [2, "thin"],
    [256, "coincident"],
    [1024, "coincident"],
    [65_537, "coincident"],
  ] as const;
  for (const size of ["small", "large"]) {
    for (const [samples, shape] of early) {
      const id = `${samples}-${shape}-${size}`;
      await page.goto(
        `/tests/fixtures/memory/cpu-raster/index.html?samples=${samples}&shape=${shape}&size=${size}`,
      );
      await page.getByRole("button", { name: "Run CPU checkpoint", exact: true }).click();
      await expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
        timeout: 130_000,
      });
      const evidence = (await page.locator("#result").textContent()) ?? "";
      await writeFile(info.outputPath(`${id}.json`), evidence);
      await info.attach(id, { body: evidence, contentType: "application/json" });
      // Capture available images outside timings; default blank canvases are not pixel evidence.
      if (evidence.includes('"cpuReferenceMs"'))
        await page
          .locator("#cpu-reference")
          .screenshot({ path: info.outputPath(`${id}-cpu-whole.png`) });
      if (evidence.includes('"tileParity"'))
        await page
          .locator("#candidate")
          .screenshot({ path: info.outputPath(`${id}-cpu-tiled.png`) });
      if (evidence.includes('"cpuGpuDifference"'))
        await page.locator("#reference").screenshot({ path: info.outputPath(`${id}-gpu.png`) });
      expect(errors).toEqual([]);
      const result: unknown = JSON.parse(evidence);
      expect(result).toMatchObject({
        status: "completed",
        verdict: "feasible-prefix",
        bitmapParity: { differentChannels: 0 },
        observations: {
          tileParity: { differentChannels: 0 },
          revisitParity: { differentChannels: 0 },
        },
      });
    }
  }
});
