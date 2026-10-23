import { test, expect } from "@playwright/test";
for (const name of [
  "slots",
  "reservation",
  "lifecycle",
  "deadline",
  "progress",
  "progress hidden",
  "progress retire",
])
  test(`MIG-GPU-WAKE-01/02/03 ${name} actual render boundary`, async ({ page, browser }, info) => {
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run GPU wake ${name}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running", { timeout: 20000 });
    const result = await page.locator("#result").innerText();
    await info.attach("gpu-wake-controlled-boundary", {
      body: result,
      contentType: "application/json",
    });
    await info.attach("browser-identity", {
      body: JSON.stringify({
        version: browser.version(),
        ...(await page.evaluate(() => ({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          visibility: document.visibilityState,
          readiness: document.readyState,
        }))),
      }),
      contentType: "application/json",
    });
    expect(result).toContain('"status":"passed"');
  });
