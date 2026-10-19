import { test, expect } from "@playwright/test";
test("WMR-01 real Wasm and CanvasKit empty canvas retains page owner through gallery", async ({
  page,
}) => {
  const wasm: string[] = [];
  const errors: string[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith(".wasm")) wasm.push(response.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await expect(page.locator(".canvas-title")).toHaveText("Temporary drawing");
  await expect(page.locator(".canvas-notice")).toContainText("Not saved");
  await expect(page.locator(".canvas-notice")).toContainText("not available yet");
  for (const control of await page
    .locator(".drawing-rail button, .drawing-context button, .drawing-context input")
    .all()) {
    await expect(control).toBeDisabled();
  }
  expect(wasm.some((url) => url.includes("linefield_web_memory"))).toBe(true);
  expect(wasm.some((url) => url.includes("canvaskit"))).toBe(true);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toHaveAccessibleName("Resume temporary drawing");
  await expect(page.locator(".prototype-label")).toContainText("only in this tab’s memory");
  await page.goForward();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await page.setViewportSize({ width: 740, height: 500 });
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  expect(errors).toEqual([]);
});
