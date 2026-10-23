import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
import { observeEditorCalls } from "./editor-call-observation.ts";
for (const packed of [false, true])
  for (const mode of ["capacity", "release", "submit"])
    test(`MIG-PAN-REVEAL-03 view union ${mode} ${packed ? "packed" : "normal"}`, async ({
      page,
      browser,
    }, info) => {
      if (packed) await forcePackedTargets(page);
      await observeEditorCalls(page);
      await page.goto("/tests/fixtures/memory/index.html");
      await page.getByRole("button", { name: `Run view union ${mode}`, exact: true }).click();
      await expect(page.locator("#result")).not.toHaveText("running", { timeout: 20000 });
      const result = await page.locator("#result").innerText();
      await info.attach("actual-engine-renderer-fault", {
        body: JSON.stringify({
          browser: browser.version(),
          result,
          packed,
          mode,
          evidence: "controlled generated-engine/renderer boundary; not app gesture timing",
        }),
        contentType: "application/json",
      });
      expect(result).toContain('"status":"passed"');
    });
