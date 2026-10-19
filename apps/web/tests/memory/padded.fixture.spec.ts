import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";
import { cases, sizes, halos } from "../fixtures/memory/padded/catalogue.ts";

test("WMP-R06 frozen padded-tile correctness selection", async ({ page, browser }, info) => {
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
        catalogueSha256: createHash("sha256")
          .update(await readFile("tests/fixtures/memory/padded/catalogue.ts"))
          .digest("hex"),
        catalogue: cases,
        sizes,
        halos,
        runtime: JSON.parse(
          await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8"),
        ) as unknown,
        timestamp: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
        conditions: "headless1280x900; display refresh, power and thermal state unmeasured",
        scope: "Gate1 synthetic correctness only; no physical latency or performance acceptance",
        oracle:
          "unchanged CPU whole exact; repeatability and bitmap exact; CPU/GPU reported separately",
        formats: "CPU sRGB RGBA8888 Unpremul; GPU Premul; opaque white and Unpremul readback",
      },
      null,
      2,
    ),
  );
  const rows: { id: string; outcome: string }[] = [];
  async function runCase(id: string, size: string, halo: number, legacy: boolean) {
    const key = `${id}-${size}-h${halo}-${legacy ? "legacy" : "clipped"}`;
    await page.goto(
      `/tests/fixtures/memory/padded/index.html?case=${id}&size=${size}&halo=${halo}&mode=${legacy ? "legacy" : "clipped"}`,
    );
    await page.getByRole("button", { name: "Run padded checkpoint", exact: true }).click();
    await expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
      timeout: 90_000,
    });
    const evidence = (await page.locator("#result").textContent()) ?? "";
    await writeFile(info.outputPath(`${key}.json`), evidence);
    await info.attach(key, { body: evidence, contentType: "application/json" });
    if (evidence.includes('"referenceParity"'))
      await page.locator("#reference").screenshot({ path: info.outputPath(`${key}-whole.png`) });
    if (evidence.includes('"tileParity"'))
      await page.locator("#candidate-raw").screenshot({ path: info.outputPath(`${key}-raw.png`) });
    if (evidence.includes('"bitmapParity"'))
      await page
        .locator("#candidate")
        .screenshot({ path: info.outputPath(`${key}-submitted.png`) });
    if (evidence.includes('"cpuGpuDifference"'))
      await page.locator("#gpu").screenshot({ path: info.outputPath(`${key}-gpu.png`) });
    expect(errors).toEqual([]);
    const value: unknown = JSON.parse(evidence);
    expect(value).toMatchObject({
      status: "completed",
      observations: { referenceParity: { differentChannels: 0 } },
    });
    if (
      typeof value !== "object" ||
      value === null ||
      !("outcome" in value) ||
      (value.outcome !== "match" && value.outcome !== "mismatch")
    )
      throw Error("invalid-outcome");
    rows.push({ id: key, outcome: value.outcome });
    await writeFile(
      info.outputPath("selection.json"),
      JSON.stringify({ state: "in-progress", rows }, null, 2),
    );
    return { outcome: value.outcome, value };
  }
  for (const size of sizes) {
    const control = await runCase("control-256", size.id, 0, true);
    if (size.id === "small")
      expect(control.value).toMatchObject({ outcome: "mismatch", reason: "tile-whole-mismatch" });
    // A clipping-only fix is distinct from failure to reproduce the historical control.
    await runCase("control-256", size.id, 0, false);
  }
  let selected: number | undefined;
  const candidates: { halo: number; passed: boolean }[] = [];
  for (const halo of halos) {
    let passed = true;
    candidate: for (const size of sizes) {
      for (const item of cases) {
        const result = await runCase(item.id, size.id, halo, false);
        if (result.outcome === "mismatch") {
          passed = false;
          break candidate;
        }
        expect(result.value).toMatchObject({
          bitmapParity: { differentChannels: 0 },
          observations: { tileParity: { differentChannels: 0 } },
        });
      }
    }
    candidates.push({ halo, passed });
    if (passed) {
      selected = halo;
      break;
    }
  }
  await writeFile(
    info.outputPath("selection.json"),
    JSON.stringify(
      {
        state: selected === undefined ? "all-halos-rejected" : "gate1-passed",
        selected,
        candidates,
        rows,
        gate2: "not executed; conditional implementation follows Gate1 review",
        limitation: "finite corpus, not universal raster equivalence proof",
      },
      null,
      2,
    ),
  );
  expect(selected, "No approved halo passed the frozen correctness corpus").toBeDefined();
});
