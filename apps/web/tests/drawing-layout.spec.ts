import { test, expect, webkit } from "@playwright/test";
const variants = [
  { name: "desktop-light-en", width: 1440, height: 1000, locale: "en-US", scheme: "light" },
  { name: "desktop-dark-uk", width: 1280, height: 900, locale: "uk-UA", scheme: "dark" },
  { name: "narrow-light-uk", width: 320, height: 700, locale: "uk-UA", scheme: "light" },
  { name: "phone-dark-en", width: 390, height: 844, locale: "en-US", scheme: "dark" },
  { name: "landscape-en", width: 740, height: 320, locale: "en-US", scheme: "light" },
] as const;
for (const variant of variants) {
  test(`WEB-D2-05 ${variant.name} controls remain reachable`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: variant,
      locale: variant.locale,
      colorScheme: variant.scheme,
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:65142/drawing/sample-0");
    await expect(page.locator(".back")).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", variant.locale.slice(0, 2));
    for (const control of await page
      .locator(".drawing-rail button:not(:disabled), .drawing-context input")
      .all()) {
      await control.focus();
      await expect(control).toBeInViewport();
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    await page.locator(".back").focus();
    await page.locator(".drawing-context").evaluate((node) => {
      node.scrollLeft = 0;
    });
    await page.locator(".drawing-rail").evaluate((node) => {
      node.scrollTop = 0;
    });
    await page.screenshot({ path: `quality/web-drawing-v2/${variant.name}.png` });
    await context.close();
  });
}

test("WEB-D2-05 expanded RTL and forced colors preserve controls and artwork", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/drawing/sample-0");
  await expect(page.locator(".back")).toBeFocused();
  // Explicit pseudo-layout fixture, not a supported language or user preference switch.
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.style.fontSize = "32px";
    const title = document.querySelector(".canvas-title");
    if (title) title.textContent = "[Expanded drawing title · Український малюнок · مثال]";
  });
  const art = await page.locator(".canvas-art").boundingBox();
  expect(art?.x).toBe(0);
  expect(art?.width).toBe(320);
  for (const control of await page
    .locator(".drawing-chrome button:not(:disabled), .drawing-chrome input")
    .all()) {
    await control.focus();
    await expect(control).toBeInViewport();
  }
  const notice = await page.locator(".canvas-notice").boundingBox();
  const zoom = await page.locator(".canvas-zoom").boundingBox();
  const back = await page.locator(".back").boundingBox();
  const header = await page.locator(".canvas-toolbar").boundingBox();
  if (!notice || !zoom || !back || !header) throw Error("Missing adaptive chrome");
  expect(
    Math.min(notice.x + notice.width, zoom.x + zoom.width) - Math.max(notice.x, zoom.x),
  ).toBeLessThanOrEqual(0);
  expect(back.y + back.height).toBeLessThanOrEqual(header.y + header.height);
  await expect(page.locator(".back")).toHaveCSS("white-space", "nowrap");
  await page.screenshot({ path: "quality/web-drawing-v2/expanded-rtl-forced.png" });
  await page.emulateMedia({ forcedColors: "none" });
  await page.evaluate(() => {
    document.documentElement.dir = "ltr";
  });
  await page.screenshot({ path: "quality/web-drawing-v2/expanded-ltr.png" });
});

test("WEB-D2-02/06 WebKit touch and blur/resize cancellation", async () => {
  const browser = await webkit.launch({ headless: true, channel: "" });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    locale: "uk-UA",
  });
  await page.goto("http://127.0.0.1:65142/drawing/preview-new");
  await expect(page.locator(".back")).toBeFocused();
  await page.getByRole("button", { name: "Лінія", exact: true }).tap();
  await expect(page.getByRole("slider")).toHaveCount(2);
  const width = page.getByRole("slider", { name: "Товщина", exact: true });
  const box = await width.boundingBox();
  if (!box) throw Error("Missing width range");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(width).not.toHaveValue("8");
  // Synthetic lifecycle signal, explicitly not physical window automation.
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await expect(width).toHaveValue("8");
  await page.mouse.up();
  await page.setViewportSize({ width: 740, height: 320 });
  await page.locator(".back").tap();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await browser.close();
});
