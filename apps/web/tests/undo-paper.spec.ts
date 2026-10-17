import { test, expect } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  for (const platform of ["web", "macos"]) {
    test(`WEB-UP01 ${platform} ${colorScheme} Undo blends opaque paper continuously`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`/?platform=${platform}`);
      const card = page.locator('[data-id="sample-0"]');
      if (platform === "web") await card.locator(".more").click();
      else await card.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      await expect(page.locator(".gallery-menu")).toHaveCount(0);
      const result = await card.locator(".undo").evaluate((node) => {
        if (!(node instanceof HTMLElement)) throw Error("Missing Undo");
        const removal = node.closest(".removal");
        if (!removal) throw Error("Missing removal surface");
        const previous = getComputedStyle(removal).backgroundColor;
        node.click();
        const tile = document.querySelector<HTMLElement>('[data-id="sample-0"] .drawing-tile');
        if (!tile) throw Error("Missing restored tile");
        const motion = tile
          .getAnimations()
          .find((animation) => !(animation instanceof CSSTransition));
        if (!motion) throw Error("Missing paper blend");
        const fades = tile
          .getAnimations({ subtree: true })
          .filter((animation) => !(animation instanceof CSSTransition));
        fades.forEach((animation) => animation.pause());
        const samples = [0, 150, 300].map((time) => {
          fades.forEach((animation) => {
            animation.currentTime = time;
          });
          return {
            color: getComputedStyle(tile).backgroundColor,
            opacity: getComputedStyle(tile).opacity,
            artwork: getComputedStyle(tile.querySelector(".artwork")!).backgroundColor,
          };
        });
        const endpoint =
          motion.effect instanceof KeyframeEffect
            ? motion.effect.getKeyframes().at(-1)?.backgroundColor
            : undefined;
        return { previous, samples, endpoint };
      });
      expect(result.samples[0]?.color).toBe(result.previous);
      expect(result.samples[2]?.color).toBe(result.endpoint);
      for (const sample of result.samples) {
        expect(sample.opacity).toBe("1");
        expect(sample.artwork).toBe(sample.color);
      }
      if (colorScheme === "dark") {
        expect(result.samples[1]?.color).not.toBe(result.previous);
        expect(result.samples[1]?.color).not.toBe(result.endpoint);
      }
      if (platform === "web") await page.setViewportSize({ width: 1000, height: 800 });
      else await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          card
            .locator(".drawing-tile")
            .evaluate(
              (node) =>
                node
                  .getAnimations({ subtree: true })
                  .filter((animation) => !(animation instanceof CSSTransition)).length,
            ),
        )
        .toBe(0);
      await expect(card.locator(".drawing-tile")).toHaveCSS(
        "background-color",
        String(result.endpoint),
      );
    });
  }
}

test("WEB-UP02 reduced motion restores paper immediately without animation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/?platform=web");
  const card = page.locator('[data-id="sample-0"]');
  const paper = await card
    .locator(".drawing-tile")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await card.locator(".more").click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await card.locator(".undo").click();
  await expect(card.locator(".drawing-tile")).toHaveCSS("background-color", paper);
  expect(
    await card
      .locator(".drawing-tile")
      .evaluate(
        (node) =>
          node
            .getAnimations({ subtree: true })
            .filter((animation) => !(animation instanceof CSSTransition)).length,
      ),
  ).toBe(0);
});

test("WEB-UP03 appearance change settles Undo to current paper without stale visuals", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/?platform=web");
  const card = page.locator('[data-id="sample-0"]');
  await card.locator(".more").click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.locator(".gallery-menu")).toHaveCount(0);
  await card.locator(".undo").evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw Error("Missing Undo");
    node.click();
    document.getAnimations().forEach((animation) => {
      if (!(animation instanceof CSSTransition)) {
        animation.pause();
        animation.currentTime = 120;
      }
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("[data-undo-motion]")).toHaveCount(0);
  await expect
    .poll(() =>
      card
        .locator(".drawing-tile")
        .evaluate(
          (node) =>
            node
              .getAnimations({ subtree: true })
              .filter((animation) => !(animation instanceof CSSTransition)).length,
        ),
    )
    .toBe(0);
  const neighbor = page.locator('[data-id="sample-1"] .drawing-tile');
  const currentPaper = await neighbor.evaluate((node) => getComputedStyle(node).backgroundColor);
  await expect(card.locator(".drawing-tile")).toHaveCSS("background-color", currentPaper);
  await expect(card.locator(".more")).toBeFocused();
});
