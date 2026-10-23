import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  for (const mode of ["display-sampling", "sampling-failure"])
    test(`MIG-PAN-REVEAL-07 ${mode} (${packed ? "packed" : "R8"})`, async ({
      page,
      browser,
    }, info) => {
      if (packed) await forcePackedTargets(page);
      await page.goto("/tests/fixtures/memory/index.html");
      await page.getByRole("button", { name: `Run prefix seed ${mode}`, exact: true }).click();
      await expect(page.locator("#result")).not.toHaveText("running");
      const result = await page.locator("#result").innerText();
      await info.attach("opaque-sampling", { body: result, contentType: "application/json" });
      await info.attach("browser-identity", {
        body: JSON.stringify({ version: browser.version(), packed }),
        contentType: "application/json",
      });
      const parsed: { status: string; reason?: string } = JSON.parse(result);
      expect(parsed.status, parsed.reason?.split("{")[0]).toBe("passed");
    });
