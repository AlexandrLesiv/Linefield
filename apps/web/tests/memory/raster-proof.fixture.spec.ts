import { test, expect } from "@playwright/test";
for (const mode of ["matrix", "state"]) {
  test(`MIG-TILE-02/05/06 compiled raster proof ${mode}`, async ({ page, browser }, info) => {
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run raster proof ${mode}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running");
    const result = await page.locator("#result").innerText();
    await info.attach("compiled-raster-proof", { body: result, contentType: "application/json" });
    await info.attach("browser-identity", {
      body: JSON.stringify({
        version: browser.version(),
        ...(await page.evaluate(() => ({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }))),
      }),
      contentType: "application/json",
    });
    expect(result).toContain('"status":"passed"');
  });
}
