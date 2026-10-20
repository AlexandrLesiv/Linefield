import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";
import { sizes } from "../fixtures/memory/padded/catalogue.ts";

const parent = "6c1fd32c343de1294da1b8ffc7693415b03ffd1a";
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
for (const shape of ["moving", "sparse", "varying"] as const) {
  for (const size of sizes) {
    test(`WMP-R08 baseline ${shape}-${size.id}`, async ({ page, browser }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const bundles: Record<string, string> = {};
      const site = "../../.build-cache/web-memory/e2e-site";
      for (const file of await readdir(`${site}/assets`))
        bundles[file] = hash(await readFile(`${site}/assets/${file}`));
      const unchanged: Record<string, { current: string; parent: string }> = {};
      for (const file of await readdir("tests/fixtures/memory/untiled")) {
        const path = `apps/web/tests/fixtures/memory/untiled/${file}`;
        unchanged[path] = {
          current: hash(await readFile(`tests/fixtures/memory/untiled/${file}`)),
          parent: hash(execFileSync("git", ["show", `${parent}:${path}`])),
        };
      }
      await writeFile(
        info.outputPath("identity.json"),
        JSON.stringify(
          {
            sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
            sourceStatus: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }),
            bundles,
            unchanged,
            runtime: JSON.parse(
              await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8"),
            ),
            shape,
            size,
            backing: 1,
            timestamp: new Date().toISOString(),
            browser: browser.version(),
            node: process.version,
            host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
            conditions: "headless1280x900; display refresh, power and thermal state unmeasured",
            scope: "independent unchanged CPU cold diagnostic; not full-frame or p95 acceptance",
          },
          null,
          2,
        ),
      );
      expect(Object.values(unchanged).every((value) => value.current === value.parent)).toBe(true);
      await page.goto(
        `/tests/fixtures/memory/compaction-baseline/index.html?shape=${shape}&size=${size.id}`,
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
        if (!message.text().startsWith("r07-stage:")) return;
        stage = message.text();
        stageStart = performance.now();
        arm();
      };
      page.on("console", progress);
      arm();
      try {
        await page.getByRole("button", { name: "Run cold baseline", exact: true }).click();
        await Promise.race([
          expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
            timeout: 110_000,
          }),
          timeout,
        ]);
      } catch (error) {
        await writeFile(
          info.outputPath("watchdog.json"),
          JSON.stringify({
            status: "failed",
            shape,
            size,
            stage,
            elapsedSinceStageMs: performance.now() - stageStart,
            configuredDeadlineMs: 5000,
            reason: String(error),
            operationDuration: "unknown if nonreturned",
            nextRow: "independent fresh page; this row remains failed",
          }),
        );
        throw error;
      } finally {
        clearTimeout(timer);
        page.off("console", progress);
      }
      const evidence = (await page.locator("#result").textContent()) ?? "";
      await writeFile(info.outputPath("row.json"), evidence);
      await info.attach(`${shape}-${size.id}`, { body: evidence, contentType: "application/json" });
      const value: unknown = JSON.parse(evidence);
      expect(errors).toEqual([]);
      expect(value).toMatchObject({ status: "completed" });
    });
  }
}
