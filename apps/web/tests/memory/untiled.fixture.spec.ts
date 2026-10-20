import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";
import { cases, sizes } from "../fixtures/memory/padded/catalogue.ts";
import { shapes } from "../fixtures/memory/untiled/catalogue.ts";

test("WMP-R07 retained whole CPU correctness then early falsification", async ({
  page,
  browser,
}, info) => {
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
        runtime: JSON.parse(await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8")),
        generatorSha256: createHash("sha256")
          .update(await readFile("tests/fixtures/memory/untiled/seed.ts"))
          .digest("hex"),
        catalogueSha256: createHash("sha256")
          .update(await readFile("tests/fixtures/memory/padded/catalogue.ts"))
          .digest("hex"),
        cases,
        sizes,
        shapes,
        timestamp: new Date().toISOString(),
        browser: browser.version(),
        node: process.version,
        host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
        conditions: "headless1280x900; display refresh, power and thermal state unmeasured",
        scope:
          "browser-hosted synthetic conformance/performance; no physical latency or native focus evidence",
        canonicalObservation: "accepted sequences/projected pages/history; no raw-sample export",
      },
      null,
      2,
    ),
  );
  const rows: { key: string; status: string }[] = [];
  async function run(lane: string, id: string, size: string) {
    const key = `${lane}-${id}-${size}`;
    await page.goto(
      `/tests/fixtures/memory/untiled/index.html?lane=${lane}&case=${id}&size=${size}`,
    );
    let stage = "fixture-start",
      stageStart = performance.now();
    let timer: ReturnType<typeof setTimeout>;
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
      await page.getByRole("button", { name: "Run untiled checkpoint", exact: true }).click();
      await Promise.race([
        expect(page.locator("#result")).toContainText(/"status":"(completed|failed)"/, {
          timeout: 120_000,
        }),
        timeout,
      ]);
    } catch (error) {
      await writeFile(
        info.outputPath(key + "-watchdog.json"),
        JSON.stringify({
          stage,
          elapsedSinceStageMs: performance.now() - stageStart,
          configuredDeadlineMs: 5000,
          reason: String(error),
          operationDuration: "unknown if nonreturned",
          remaining: "unrun",
        }),
      );
      throw error;
    } finally {
      clearTimeout(timer!);
      page.off("console", progress);
    }
    const evidence = (await page.locator("#result").textContent()) ?? "";
    await writeFile(info.outputPath(`${key}.json`), evidence);
    await info.attach(key, { body: evidence, contentType: "application/json" });
    for (const canvas of ["candidate", "reference", "gpu"])
      if (
        await page
          .locator(`#${canvas}`)
          .evaluate((element) => element instanceof HTMLCanvasElement && element.width > 300)
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
          remaining: status === "completed" ? "pending" : "unrun after decisive failure",
          laterGate2: "not implemented until early rows survive",
          gate3: "not implemented/not run",
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ status: "completed" });
  }
  for (const size of sizes) {
    await run("lifecycle", "controls", size.id);
    for (const item of cases) await run("correctness", item.id, size.id);
  }
  for (const shape of shapes) for (const size of sizes) await run("performance", shape, size.id);
  // Surviving early work is not full Gate2/Gate3 acceptance.
  throw Error("early rows survived: implement remaining approved lanes before complete acceptance");
});
