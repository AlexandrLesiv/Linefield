import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  test(`MIG-TILE-01/04 isolated one-page sparse atlas (${packed ? "packed" : "R8"})`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(180000);
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: "Run prefix seed sparse-proof", exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 150000 });
    const raw = await page.locator("#result").innerText();
    await info.attach("sparse-proof", { body: raw, contentType: "application/json" });
    await info.attach("browser-identity", {
      body: JSON.stringify({ browser: browser.version(), packed }),
      contentType: "application/json",
    });
    const result: {
      status: string;
      error?: string;
      reason?: string;
      result?: { rows: unknown[]; productionEnabled: boolean };
    } = JSON.parse(raw);
    expect(result.status, (result.reason ?? result.error)?.slice(0, 2000)).toBe("passed");
    expect(result.result?.productionEnabled).toBe(false);
    expect(result.result?.rows).toHaveLength(12);
  });
