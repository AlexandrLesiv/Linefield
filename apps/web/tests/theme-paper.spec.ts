import { test, expect } from "@playwright/test";

for (const mode of ["light", "dark"] as const) {
  test(`THEME-05 ${mode} paper and artwork compositing match throughout navigation`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: mode });
    await page.goto("/");
    const paper = mode === "dark" ? "rgb(238, 238, 236)" : "rgb(255, 255, 255)";
    const card = page.locator('[data-id="sample-0"]');
    await expect(card.locator(".drawing-tile")).toHaveCSS("background-color", paper);
    await expect(card.locator(".artwork")).toHaveCSS("background-color", paper);
    await expect(card.locator(".artwork")).toHaveCSS("isolation", "isolate");
    await expect(card.locator("img")).toHaveCSS("mix-blend-mode", "darken");
    const source = await card.locator("img").getAttribute("src");
    await card.locator(".drawing-tile").click();
    const surface = page.locator(".drawing-surface");
    const frames = async () => {
      for (const time of [0, 180, 359.99]) {
        await surface.evaluate((node, at) => {
          node.getAnimations({ subtree: true }).forEach((animation) => {
            animation.pause();
            animation.currentTime = at;
          });
        }, time);
        await expect(surface).toHaveCSS("background-color", paper);
        await expect(surface).toHaveCSS("isolation", "isolate");
        await expect(surface.locator(".canvas-art")).toHaveCSS("mix-blend-mode", "darken");
        await expect(surface.locator(".canvas-art")).toHaveCSS("filter", "none");
        await expect(surface.locator(".canvas-art")).toHaveAttribute("src", source!);
      }
    };
    const finish = () =>
      surface.evaluate((node) => {
        node.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
      });
    await frames();
    await finish();
    await expect(page.locator(".back")).toBeFocused();
    await expect(surface).toHaveCSS("background-color", paper);
    await page.locator(".back").click();
    await frames();
    await finish();
    await expect(surface).toHaveCount(0);
    await expect(card.locator(".drawing-tile")).toHaveCSS("background-color", paper);
    await expect(card.locator("img")).toHaveAttribute("src", source!);
  });
}
