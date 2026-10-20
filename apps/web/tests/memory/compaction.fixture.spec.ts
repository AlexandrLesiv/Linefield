import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";
import { cases, sizes } from "../fixtures/memory/padded/catalogue.ts";
const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
test("WMP-R08 preliminary static corpus exact CPU parity", async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const site = "../../.build-cache/web-memory/e2e-site";
  const bundles: Record<string, string> = {};
  for (const file of await readdir(`${site}/assets`))
    bundles[file] = hash(await readFile(`${site}/assets/${file}`));
  const sources: Record<string, string> = {};
  for (const directory of [
    "../../crates/contour-preparation/src",
    "preparation-wasm/src",
    "tests/fixtures/memory/compaction",
  ])
    for (const file of await readdir(directory))
      sources[`${directory}/${file}`] = hash(await readFile(`${directory}/${file}`));
  await writeFile(
    info.outputPath("identity.json"),
    JSON.stringify(
      {
        sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        sourceStatus: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }),
        bundles,
        sources,
        runtime: JSON.parse(await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8")),
        corpusHash: hash(await readFile("tests/fixtures/memory/padded/catalogue.ts")),
        cases,
        sizes,
        timestamp: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
        conditions: "headless1280x900; display refresh, power and thermal state unmeasured",
        scope: "preliminary static corpus correctness; not fullGate1 or performance",
      },
      null,
      2,
    ),
  );
  const rows: { key: string; status: string }[] = [];
  for (const size of sizes)
    for (const item of cases) {
      const key = `${item.id}-${size.id}`;
      await page.goto(
        `/tests/fixtures/memory/compaction/index.html?case=${item.id}&size=${size.id}`,
      );
      let stage = "fixture-start";
      let stageStart = performance.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let expire: (error: Error) => void = () => {};
      const timeout = new Promise<never>((_, reject) => {
        expire = reject;
      });
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => expire(Error("external-stage-watchdog")), 5000);
      };
      const progress = (message: import("@playwright/test").ConsoleMessage) => {
        if (!message.text().startsWith("r08-stage:") && !message.text().startsWith("r07-stage:"))
          return;
        stage = message.text();
        stageStart = performance.now();
        arm();
      };
      page.on("console", progress);
      arm();
      try {
        await page.getByRole("button", { name: "Run compaction parity", exact: true }).click();
        await Promise.race([
          expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
            timeout: 110_000,
          }),
          timeout,
        ]);
      } catch (error) {
        await writeFile(
          info.outputPath(`${key}-watchdog.json`),
          JSON.stringify({
            status: "failed",
            stage,
            elapsedMs: performance.now() - stageStart,
            deadlineMs: 5000,
            reason: String(error),
            subsequent: "unrun after first failure",
          }),
        );
        throw error;
      } finally {
        clearTimeout(timer);
        page.off("console", progress);
      }
      const evidence = (await page.locator("#result").textContent()) ?? "";
      await writeFile(info.outputPath(`${key}.json`), evidence);
      await writeFile(
        info.outputPath(`${key}-source.json`),
        (await page.locator("#source").textContent()) ?? "",
      );
      for (const canvas of ["reference", "candidate"])
        if (
          await page
            .locator(`#${canvas}`)
            .evaluate((value) => value instanceof HTMLCanvasElement && value.width > 300)
        )
          await page
            .locator(`#${canvas}`)
            .screenshot({ path: info.outputPath(`${key}-${canvas}.png`) });
      const value: unknown = JSON.parse(evidence);
      const status =
        typeof value === "object" &&
        value !== null &&
        "status" in value &&
        typeof value.status === "string"
          ? value.status
          : "invalid";
      rows.push({ key, status });
      await writeFile(
        info.outputPath("sequence.json"),
        JSON.stringify(
          {
            rows,
            remaining: status === "completed" ? "pending" : "unrun after first failure",
            fullGate1: "additional cases and live capture/history/resource scenarios still unrun",
          },
          null,
          2,
        ),
      );
      expect(errors).toEqual([]);
      expect(value).toMatchObject({ status: "completed" });
    }
});
