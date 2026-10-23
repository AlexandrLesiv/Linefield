import { test, expect } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true])
  test(`MIG-TILE-01/05/06 reusable sparse screen parity (${packed ? "packed" : "R8"})`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(180000);
    if (packed) await forcePackedTargets(page);
    await page.goto("/tests/fixtures/memory/index.html");
    await page
      .getByRole("button", { name: "Run prefix seed sparse-cost-correctness", exact: true })
      .click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 150000 });
    const raw = await page.locator("#result").innerText();
    await info.attach("sparse-screen-parity", { body: raw, contentType: "application/json" });
    await info.attach("browser-identity", {
      body: JSON.stringify({ version: browser.version(), packed }),
      contentType: "application/json",
    });
    const result: {
      status: string;
      reason?: string;
      result?: { timed: boolean; rows: unknown[] };
    } = JSON.parse(raw);
    expect(result.status, result.reason?.slice(0, 2500)).toBe("passed");
    expect(result.result?.timed).toBe(false);
    expect(result.result?.rows).toHaveLength(10);
  });
