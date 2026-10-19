import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";
const evidenceRoot = "../../.build-cache/web-memory/worker-checkpoint";
test("WMP-WORKER-01 separate main renderer reference", async ({ page }) => {
  await page.goto("/tests/fixtures/memory/index.html");
  await page.getByRole("button", { name: "Run worker reference", exact: true }).click();
  await expect(page.locator("#result")).toContainText(/"status":"(passed|failed)"/, {
    timeout: 90_000,
  });
  const value = await page.locator("#result").textContent();
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(`${evidenceRoot}/reference.json`, value ?? "");
  expect(JSON.parse(value ?? "{}")).toMatchObject({ status: "passed" });
});
test("WMP-WORKER-02 worker pan and fresh ink feasibility", async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/fixtures/memory/index.html");
  await page.getByRole("button", { name: "Run worker feasibility", exact: true }).click();
  await expect(page.locator("#result")).toContainText(/"status":"(passed|failed)"/, {
    timeout: 90_000,
  });
  const value = await page.locator("#result").textContent();
  const manifest = await readFile("../../.build-cache/web-memory/e2e-site/.vite/manifest.json");
  await writeFile(info.outputPath("evidence.json"), value ?? "");
  await writeFile(
    info.outputPath("identity.json"),
    JSON.stringify(
      {
        browser: browser.version(),
        host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
        manifestSha256: createHash("sha256").update(manifest).digest("hex"),
        runtimeBuild: JSON.parse(
          await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8"),
        ) as unknown,
        timestamp: new Date().toISOString(),
        sourceBase: "24695668ca1310200c89649b0aeca6c457220c85",
        conditions:
          "Serial headless Chrome; separate closed reference page; sole CanvasKit worker in prototype page; no physical refresh/thermal/GPUcompletion measurement",
      },
      null,
      2,
    ),
  );
  await info.attach("single-worker-feasibility", {
    body: value ?? "",
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  const result: unknown = JSON.parse(value ?? "{}");
  expect(result).toMatchObject({ status: "passed" });
  const baseline: unknown = JSON.parse(await readFile(`${evidenceRoot}/reference.json`, "utf8"));
  if (
    !baseline ||
    typeof baseline !== "object" ||
    !("result" in baseline) ||
    !baseline.result ||
    typeof baseline.result !== "object" ||
    !("hash" in baseline.result)
  )
    throw Error("missing-reference");
  expect(result).toMatchObject({
    result: {
      workerUnpaddedHash: baseline.result.hash,
      workerPaddedHash: baseline.result.hash,
      restoredHash: baseline.result.hash,
      performanceVerdict: "incomplete",
    },
  });
});
