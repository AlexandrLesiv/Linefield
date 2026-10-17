import { test, expect } from "@playwright/test";

for (const platform of ["web", "macos"]) {
  test(`WEB-UR01 ${platform} Undo fades restored artwork with immediate focus`, async ({
    page,
  }) => {
    await page.goto(`/?platform=${platform}`);
    const card = page.locator('[data-id="sample-0"]');
    if (platform === "web") await card.locator(".more").click();
    else await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await expect(page.locator(".gallery-menu")).toHaveCount(0);
    const samples = await card.locator(".undo").evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw Error("Missing Undo");
      node.click();
      const tile = document.querySelector<HTMLElement>('[data-id="sample-0"] .drawing-tile');
      if (!tile) throw Error("Missing restored drawing");
      const contents = [...tile.querySelectorAll<HTMLElement>(".artwork, .drawing-name")];
      const fades = contents
        .flatMap((content) => content.getAnimations())
        .filter((animation) => !(animation instanceof CSSTransition));
      if (fades.length !== 2) throw Error("Missing content fades");
      fades.forEach((fade) => fade.pause());
      return [0, 150, 300].map((time) => {
        fades.forEach((fade) => {
          fade.currentTime = time;
        });
        return {
          contents: contents.map((content) => Number(getComputedStyle(content).opacity)),
          tile: Number(getComputedStyle(tile).opacity),
          focused: tile.closest(".drawing-card")?.contains(document.activeElement),
        };
      });
    });
    for (const sample of samples) {
      expect(sample.tile).toBe(1);
      expect(sample.focused).toBe(true);
    }
    expect(samples[0]?.contents).toEqual([0, 0]);
    for (const opacity of samples[1]?.contents ?? []) {
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThan(1);
    }
    expect(samples[2]?.contents).toEqual([1, 1]);
    await expect(card.locator(platform === "web" ? ".more" : ".drawing-tile")).toBeFocused();
    await page.setViewportSize({ width: 900, height: 700 });
    await expect(card.locator(".drawing-tile")).toHaveCSS("opacity", "1");
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
  });
}

for (const rerender of [false, true]) {
  test(`WEB-UR02 settled mobile Undo returns full rail layer (rerender=${rerender})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?platform=ios");
    const card = page.locator('[data-id="sample-0"]');
    await card.locator(".drawing-tile").focus();
    await page.keyboard.press("ArrowLeft");
    await card.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((animation) => animation.finish()),
    );
    await card.locator(".delete").click();
    await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
    if (rerender) {
      await page.locator("select").selectOption("android");
    }
    const frames = await card.locator(".undo").evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw Error("Missing Undo");
      node.click();
      const ghost = document.querySelector<HTMLElement>("[data-mobile-slide]");
      const artwork = ghost?.querySelector<HTMLElement>(".drawing-tile");
      const rail = ghost?.querySelector<HTMLElement>(".swipe-actions");
      if (!ghost || !artwork || !rail) throw Error("Missing complete returning layer");
      const animations = ghost.getAnimations({ subtree: true });
      animations.forEach((animation) => animation.pause());
      return [0, 120, 300, 320].map((time) => {
        animations.forEach((animation) => {
          animation.currentTime = time;
        });
        return {
          root: new DOMMatrixReadOnly(getComputedStyle(ghost).transform).m41,
          artwork: new DOMMatrixReadOnly(getComputedStyle(artwork).transform).m41,
          rail: Number(getComputedStyle(rail).opacity),
        };
      });
    });
    expect(frames[0]?.root).toBeLessThan(-300);
    expect(frames[1]?.root).toBeGreaterThan(frames[0]?.root ?? 0);
    expect(frames[0]?.artwork).toBe(-160);
    expect(frames[1]?.artwork).toBe(-160);
    expect(frames[1]?.rail).toBe(1);
    expect(frames[2]?.artwork).toBeGreaterThan(-160);
    expect(frames[3]?.artwork).toBe(0);
    await expect(card.locator(".drawing-tile").first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
    await expect(page.locator(".drawing-surface")).toHaveCount(1);
  });
}
