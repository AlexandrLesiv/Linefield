import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";

test("WMP-R01 compact-union parity and bounded primitive checkpoint", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const site = "../../.build-cache/web-memory/e2e-site";
  const files = await readdir(`${site}/assets`);
  const bundles: Record<string, string> = {};
  for (const file of files)
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
        scope:
          "headless browser experiment, synthetic Rust input, no physical latency or full p95 claim",
        powerThermalAndRefresh:
          "unmeasured; this lane can reject feasibility but cannot certify profile v1",
        oracle: "same geometry and GPU surface; exact RGBA channels; repeated reference must match",
      },
      null,
      2,
    ),
  );
  for (const samples of [256, 1024, 4096, 65_537]) {
    for (const shape of ["coincident", "retraced"]) {
      for (const size of ["small", "large"]) {
        const id = `${samples}-${shape}-${size}`;
        await page.goto(
          `/tests/fixtures/memory/repaint/index.html?samples=${samples}&shape=${shape}&size=${size}`,
        );
        await page.getByRole("button", { name: "Run repaint checkpoint", exact: true }).click();
        await expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
          timeout: 130_000,
        });
        const evidence = (await page.locator("#result").textContent()) ?? "";
        await writeFile(info.outputPath(`${id}.json`), evidence);
        await info.attach(id, { body: evidence, contentType: "application/json" });
        expect(errors).toEqual([]);
        expect(evidence).toContain('"status":"completed"');
        // Screenshots/readback are untimed; preserve the first rejected candidate for review.
        if (!evidence.includes('"candidateVerdict":"feasible-prefix"')) {
          await page
            .locator("#reference")
            .screenshot({ path: info.outputPath(`${id}-reference.png`) });
          await page
            .locator("#candidate")
            .screenshot({ path: info.outputPath(`${id}-candidate.png`) });
        }
        const result: unknown = JSON.parse(evidence);
        expect(result).toMatchObject({
          result: {
            referenceParity: { differentChannels: 0 },
            candidateVerdict: "feasible-prefix",
          },
        });
      }
    }
  }
});
