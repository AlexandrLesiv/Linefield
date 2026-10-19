import { test, expect } from "@playwright/test";
test("WMP-05 bounded read-only diagnostics copy and clipboard failure", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await page.mouse.move(250, 300);
  for (let i = 0; i < 52; i++) {
    await page.mouse.down();
    await page.keyboard.press("Escape");
    await page.mouse.up();
  }
  const copy = page.locator("[data-memory-diagnostics]");
  await copy.click();
  await expect(copy).toHaveText("Diagnostics copied");
  const summary: { input: { records: unknown[]; dropped: number } } = JSON.parse(
    await page.evaluate(() => navigator.clipboard.readText()),
  );
  expect(summary.input.records).toHaveLength(100);
  expect(summary.input.dropped).toBeGreaterThan(0);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new DOMException("Fixture denied", "NotAllowedError")),
    });
  });
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy).toHaveText("Could not copy diagnostics");
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
});
