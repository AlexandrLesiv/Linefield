import { test, expect } from "@playwright/test";
for (const [id, name] of [
  ["01", "latch"],
  ["02", "validity"],
])
  test(`MIG-QUERY-${id} placement/coverage read boundary ${name}`, async ({ page }, info) => {
    await page.goto("/tests/fixtures/memory/index.html");
    await page.getByRole("button", { name: `Run query ${name}`, exact: true }).click();
    await expect(page.locator("#result")).not.toHaveText("running");
    const result = await page.locator("#result").innerText();
    expect(result).toContain('"status":"passed"');
    await info.attach("typed-query-boundary", { body: result, contentType: "application/json" });
  });
