import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  test(`MIG-TILE-01 common offset0 integer quad (${packed ? "packed" : "R8"})`, async ({
    page,
    browser,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: "Run prefix seed integer-quad", exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running");
    const result = await page.locator("#result").innerText();
    await info.attach("integer-quad-parity", { body: result, contentType: "application/json" });
    await info.attach("browser-identity", {
      body: JSON.stringify({ version: browser.version(), packed }),
      contentType: "application/json",
    });
    expect(result).toContain('"status":"passed"');
  });
