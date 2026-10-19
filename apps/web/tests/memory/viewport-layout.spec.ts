import { test, expect } from "@playwright/test";
test("WMP-06/11 night viewport controls remain visible at zoom endpoints", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  const ready = () => expect(canvas).toHaveAttribute("data-state", "ready");
  await ready();
  const inward = page.locator('[data-memory-zoom="in"]');
  const outward = page.locator('[data-memory-zoom="out"]');
  for (let i = 0; i < 10; i++) {
    await inward.click();
    await ready();
  }
  await expect(page.locator("[data-memory-zoom-value]")).toHaveText("800%");
  await expect(inward).toBeDisabled();
  await expect(outward).toBeEnabled();
  const style = await outward.evaluate((node) => {
    const css = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      foreground: css.color,
      background: css.backgroundColor,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(style.foreground).not.toBe(style.background);
  expect(style.width).toBeGreaterThanOrEqual(44);
  expect(style.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath("night-zoom-maximum.png") });
  for (let i = 0; i < 20; i++) {
    await outward.click();
    await ready();
  }
  await expect(page.locator("[data-memory-zoom-value]")).toHaveText("10%");
  await expect(outward).toBeDisabled();
  await expect(inward).toBeEnabled();
});
