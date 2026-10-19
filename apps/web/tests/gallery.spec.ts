import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("WEB-G01 whole tile becomes a single edge-to-edge surface and returns", async ({ page }) => {
  const card = page.locator('[data-id="sample-0"]');
  await expect(card).toBeVisible();
  const start = await card.boundingBox();
  if (!start) throw Error("Visible source card has no geometry");
  await card.getByRole("button", { name: "Open Coastal house" }).click();
  await page.locator(".drawing-surface").evaluate((node) => {
    const motions = node.getAnimations({ subtree: true });
    const geometry = motions.some(
      (motion) =>
        motion.effect instanceof KeyframeEffect &&
        motion.effect.target === node &&
        motion.effect.getKeyframes().some((frame) => "width" in frame),
    );
    if (!geometry) throw Error("Missing surface geometry animation");
    // Shadow is created first; sample every presentation track at the same instant.
    motions.forEach((motion) => {
      motion.pause();
      motion.currentTime = 0;
    });
  });
  const first = await page.locator(".drawing-surface").boundingBox();
  if (!first) throw Error("Missing initial surface geometry");
  for (const key of ["x", "y", "width", "height"] as const)
    expect(first[key]).toBeCloseTo(start[key], 0);
  await page.locator(".drawing-surface").evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((a) => a.finish());
  });
  await expect(page.locator(".back")).toBeFocused();
  const geometry = await page.locator(".drawing-surface").evaluate((node) => {
    const r = node.getBoundingClientRect();
    const image = node.querySelector("img")?.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      viewport: [innerWidth, innerHeight],
      imageWidth: image?.width,
      imageHeight: image?.height,
      padding: getComputedStyle(node).padding,
      border: getComputedStyle(node).borderWidth,
    };
  });
  expect(geometry.left).toBe(0);
  expect(geometry.top).toBe(0);
  expect(geometry.width).toBe(geometry.viewport[0]);
  expect(geometry.height).toBe(geometry.viewport[1]);
  expect(geometry.imageWidth).toBe(geometry.width);
  expect(geometry.imageHeight).toBe(geometry.height);
  expect(geometry.padding).toBe("0px");
  expect(geometry.border).toBe("0px");
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Open Coastal house" })).toBeFocused();
});
test("WEB-G02 anchored menu morph remains opaque until it reaches the button", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Actions for Coastal house" });
  await trigger.focus();
  const anchor = await trigger.boundingBox();
  await trigger.press("Enter");
  const menu = page.getByRole("menu");
  await menu.evaluate((node) => {
    const motion = node.getAnimations()[0];
    motion?.pause();
    if (motion) motion.currentTime = 0;
  });
  expect((await menu.boundingBox())?.width).toBeCloseTo(anchor?.width || 0, 0);
  await menu.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await page.mouse.click(5, 5);
  await menu.evaluate((node) => {
    const motion = node.getAnimations()[0];
    motion?.pause();
    if (motion) motion.currentTime = 260 * 0.72;
  });
  expect(await menu.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  expect((await menu.boundingBox())?.width).toBeCloseTo(anchor?.width || 0, 0);
  await menu.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(menu).toHaveCount(0);
});
test("WEB-G03 removal holds its slot, Undo restores, rename treats input as text", async ({
  page,
}) => {
  const card = page.locator('[data-id="sample-0"]');
  const before = await card.boundingBox();
  await card.locator(".more").focus();
  await card.locator(".more").press("Enter");
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(card.getByRole("button", { name: "Undo" })).toBeVisible();
  expect((await card.boundingBox())?.height).toBe(before?.height);
  await card.getByRole("button", { name: "Undo" }).click();
  await card.locator(".more").focus();
  await card.locator(".more").press("Enter");
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page.getByLabel("Drawing name").fill("<script>alert(1)</script>");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(card.locator(".drawing-name")).toHaveText("<script>alert(1)</script>");
  expect(await card.locator("script").count()).toBe(0);
});
test("WEB-G04 browser theme, narrow artwork cards and distinct New tile", async ({ page }) => {
  await page.goto("/?preview=1");
  const newTile = page.locator(".new-tile");
  const colors = await newTile.evaluate((node) => ({
    tile: getComputedStyle(node).backgroundColor,
    page: getComputedStyle(document.documentElement).backgroundColor,
  }));
  expect(colors.tile).not.toBe(colors.page);
  await page.emulateMedia({ colorScheme: "dark" });
  expect(
    await page.locator("html").evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe("rgb(45, 45, 47)");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-create")).toBeVisible();
  expect(
    await page
      .locator(".drawing-grid")
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length),
  ).toBe(1);
  await expect(page.locator('[data-id="sample-0"] .artwork')).toHaveCSS("aspect-ratio", "4 / 3");
});
test("WEB-G06 reduced motion and browser Back/Forward", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Open Coastal house" }).click();
  expect(
    await page.locator(".drawing-surface").evaluate((node) => node.getAnimations().length),
  ).toBe(0);
  await page.goBack();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.goForward();
  await expect(page.locator(".drawing-surface")).toHaveCount(1);
});
test("WEB-G07 new blank drawing fills viewport", async ({ page }) => {
  await page.locator(".new-tile").click();
  await expect(page.locator(".canvas-title")).toHaveText("Temporary drawing");
  await expect(page.locator(".back")).toBeFocused();
  await expect(page.locator(".drawing-surface img")).toHaveCount(0);
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".drawing-card")).toHaveCount(6);
});
test("WEB-G08 Ukrainian selected from browser language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:65142");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator(".new-tile")).toHaveAccessibleName("Новий малюнок");
  await context.close();
});
