import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  for (const name of [
    "pixels",
    "matrix",
    "capability",
    "failure placement",
    "failure source",
    "submission failure",
    "alpha exhaustion",
    "phases",
    "held fold",
    "release failure",
    "context loss",
    "provenance",
  ])
    test(`MIG-TILE-02/05/06 region ${name} ${packed ? "packed" : "normal"}`, async ({
      page,
      browser,
    }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("requestfailed", (request) =>
        errors.push(request.failure()?.errorText ?? "request failed"),
      );
      if (packed) await forcePackedTargets(page);
      await page.goto("/tests/fixtures/memory/index.html");
      const action = page.getByRole("button", { name: `Run region ${name}`, exact: true });
      await expect(action, `fixture initialization: ${errors.join("; ")}`).toBeVisible({
        timeout: 10000,
      });
      await action.click();
      await expect(page.locator("#result")).not.toHaveText("running", { timeout: 150000 });
      const result = await page.locator("#result").innerText();
      await info.attach("region-reuse", {
        body: JSON.stringify({
          version: browser.version(),
          packed,
          errors,
          result,
          evidence:
            "generated Rust/Wasm and production host GL boundary fixture; actual-route interaction remains separate",
        }),
        contentType: "application/json",
      });
      expect(result).toContain('"status":"passed"');
    });
