import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { platform, release, arch, cpus } from "node:os";
import { test, expect } from "@playwright/test";

for (const size of ["small", "large"]) {
  for (const shape of ["dense", "sparse"]) {
    test(`WMP-UNDO-PERF-01 bounded checkpoint ${size} ${shape}`, async ({
      page,
      browser,
    }, info) => {
      test.setTimeout(240_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/tests/fixtures/memory/index.html?size=${size}&shape=${shape}`);
      await page
        .getByRole("button", { name: "Run Undo rendering checkpoint", exact: true })
        .click();
      await expect(page.locator("#result")).toContainText(/"status":"(passed|failed)"/, {
        timeout: 230_000,
      });
      const evidence = await page.locator("#result").textContent();
      const build = await readFile("../../.build-cache/web-memory/e2e/build.json", "utf8");
      const manifest = await readFile("../../.build-cache/web-memory/e2e-site/.vite/manifest.json");
      await writeFile(
        info.outputPath("identity.json"),
        JSON.stringify(
          {
            browser: browser.version(),
            host: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model },
            node: process.version,
            runtimeBuild: JSON.parse(build) as unknown,
            manifestSha256: createHash("sha256").update(manifest).digest("hex"),
            timestamp: new Date().toISOString(),
            measurement:
              "Headless isolated real Rust/Wasm and CanvasKit; no native input or physical presentation claim",
            displayRefresh: "unavailable; headless browser",
            modeOrder: ["rebuild", "retained-full-path", "cull-proxy"],
          },
          null,
          2,
        ),
      );
      await writeFile(info.outputPath("evidence.json"), evidence ?? "");
      await info.attach("bounded-undo-rendering-checkpoint", {
        body: evidence ?? "",
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
      const result: unknown = JSON.parse(evidence ?? "{}");
      expect(result).toMatchObject({
        status: "passed",
        result: { reuseParity: { differentChannels: 0 }, cullingParity: { differentChannels: 0 } },
      });
    });
  }
}
