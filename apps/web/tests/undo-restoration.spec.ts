import { test, expect } from "@playwright/test";

for (const platform of ["web", "macos"]) {
  test(`WEB-UR01 ${platform} Undo fades restored artwork with immediate focus`, async ({
    page,
  }) => {
    await page.goto(`/?platform=${platform}`);
    const card = page.locator('[data-id="sample-0"]');
    await card.locator(".more").click();
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
    await expect(card.locator(".more")).toBeFocused();
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
