import { test, expect } from "@playwright/test";
test("WMR-04 production has narrow Wasm CSP and no isolated fixture entry", async ({ page }) => {
  await page.goto("/fixtures/memory/index.html");
  await expect(page.getByRole("button", { name: "Run boundary matrix" })).toHaveCount(0);
  await page.goto("/");
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(policy).not.toContain("'unsafe-eval'");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
});
test("WMR-02 gallery scroll and native field focus survive retained temporary owner", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 500));
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(0);
  await page.locator(".mobile-create").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.locator(".mobile-create")).toBeFocused();
});
