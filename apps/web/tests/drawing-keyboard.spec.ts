import { testOrigin } from "./origin.ts";
import { test, expect } from "@playwright/test";

test("WEB-D2-04/05 pointer focus does not move a partially clipped range", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/drawing/sample-0");
  await expect(page.locator(".back")).toBeFocused();
  const opacity = page.getByRole("slider", { name: "Opacity", exact: true });
  const bar = page.locator(".drawing-context");
  await opacity.evaluate((input) => {
    const context = input.closest(".drawing-context");
    if (!(context instanceof HTMLElement)) throw new Error("Missing context");
    context.scrollLeft +=
      input.getBoundingClientRect().left - context.getBoundingClientRect().left + 30;
  });
  const before = await bar.evaluate((node) => node.scrollLeft);
  const box = await opacity.boundingBox();
  if (!box) throw new Error("Missing range bounds");
  await page.mouse.move(box.x + 65, box.y + box.height / 2);
  await page.mouse.down();
  await expect(opacity).toBeFocused();
  expect(await bar.evaluate((node) => node.scrollLeft)).toBe(before);
  await page.mouse.move(box.x + 85, box.y + box.height / 2);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(opacity).toHaveValue("100");
  await page.mouse.click(box.x + 65, box.y + box.height / 2);
  expect(Number(await opacity.inputValue())).toBeLessThan(100);
  expect(await bar.evaluate((node) => node.scrollLeft)).toBe(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("WEB-D2-02/05 narrow keyboard traversal skips unavailable controls and restores Pen context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/drawing/sample-0");
  const back = page.locator(".back");
  await expect(back).toBeFocused();
  const artwork = await page.locator(".canvas-art").getAttribute("src");
  const url = page.url();
  const pen = page.getByRole("button", { name: "Pen", exact: true });
  const select = page.getByRole("button", { name: "Select", exact: true });
  await page.keyboard.press("Tab");
  await expect(pen).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(select).toBeFocused();
  await page.keyboard.press("Space");
  await expect(select).toBeFocused();
  await expect(select).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(pen).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(pen).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.drawing-rail [aria-pressed="true"]')).toHaveCount(1);
  const stops = [
    select,
    page.getByRole("button", { name: "Eraser", exact: true }),
    page.getByRole("button", { name: "Line", exact: true }),
    page.getByRole("button", { name: "Shapes", exact: true }),
    page.getByRole("slider", { name: "Width", exact: true }),
    page.getByRole("slider", { name: "Opacity", exact: true }),
    page.getByRole("slider", { name: "Smoothing", exact: true }),
  ];
  for (const control of stops) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    await expect(control).toBeInViewport({ ratio: 1 });
    await expect(control).toHaveCSS("outline-style", "solid");
    await expect(control).toHaveCSS("outline-width", "2px");
  }
  for (const control of [...stops.slice(0, -1).reverse(), pen, back]) {
    await page.keyboard.press("Shift+Tab");
    await expect(control).toBeFocused();
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  await expect(page.locator(".canvas-art")).toHaveAttribute("src", artwork ?? "");
  expect(page.url()).toBe(url);
});

test("WEB-D2-03/05 I18N-UK-002 keyboard values retain Ukrainian names in a German-region fixture", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "de-DE" });
  // Injected language-preference fixture; no system/browser preference is changed.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["uk-UA", "en-US"] });
  });
  const page = await context.newPage();
  try {
    await page.goto(`${testOrigin}/drawing/sample-0`);
    await expect(page.locator(".back")).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    expect(await page.evaluate(() => navigator.language)).toBe("de-DE");
    const artwork = await page.locator(".canvas-art").getAttribute("src");
    const url = page.url();
    const opacity = page.getByRole("slider", { name: "Непрозорість", exact: true });
    for (let stop = 0; stop < 7; stop++) await page.keyboard.press("Tab");
    await expect(opacity).toBeFocused();
    for (const [key, value] of [
      ["Home", "0"],
      ["ArrowRight", "1"],
      ["End", "100"],
    ] as const) {
      await page.keyboard.press(key);
      await expect(opacity).toHaveValue(value);
      await expect(opacity).toHaveAttribute("aria-valuetext", `${value}\u00a0%`);
      await expect(page.locator(".property-opacity .property-value")).toHaveText(`${value}\u00a0%`);
      await expect(page.locator(".stroke-preview svg")).toHaveCSS(
        "opacity",
        String(Number(value) / 100),
      );
    }
    await page.keyboard.press("Tab");
    const smoothing = page.getByRole("slider", { name: "Згладжування", exact: true });
    await expect(smoothing).toBeFocused();
    for (const [key, value] of [
      ["ArrowLeft", "24"],
      ["Home", "0"],
      ["End", "100"],
    ] as const) {
      await page.keyboard.press(key);
      await expect(smoothing).toHaveValue(value);
      await expect(smoothing).toHaveAttribute("aria-valuetext", `${value}\u00a0%`);
      await expect(page.locator(".property-smoothing .property-value")).toHaveText(
        `${value}\u00a0%`,
      );
    }
    await expect(page.getByRole("slider", { name: "Товщина", exact: true })).toHaveValue("8");
    await expect(page.getByRole("button", { name: "Перо", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".stroke-preview svg")).toHaveCSS("opacity", "1");
    await expect(page.locator(".canvas-art")).toHaveAttribute("src", artwork ?? "");
    expect(page.url()).toBe(url);
  } finally {
    await context.close();
  }
});
