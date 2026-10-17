import { expect, test } from "@playwright/test";

for (const source of [".new-tile", '[data-id="sample-0"] .drawing-tile']) {
  test(`WEB-SE01 ${source} carries actual hover elevation through detached travel`, async ({
    page,
  }) => {
    await page.goto("/");
    const tile = page.locator(source).first();
    await tile.hover();
    await expect
      .poll(() =>
        tile.evaluate((node) => getComputedStyle(node.closest(".drawing-card") ?? node).boxShadow),
      )
      .toContain("0.12");
    const shadow = await tile.evaluate(
      (node) => getComputedStyle(node.closest(".drawing-card") ?? node).boxShadow,
    );
    await tile.click();
    const surface = page.locator(".drawing-surface");
    const samples = await surface.evaluate((node) => {
      const motions = node.getAnimations();
      motions.forEach((animation) => animation.pause());
      return [0, 180, 320, 360].map((time) => {
        motions.forEach((animation) => {
          animation.currentTime = time;
        });
        return getComputedStyle(node).boxShadow;
      });
    });
    expect(samples[0]).toBe(shadow);
    expect(samples[1]).toBe(shadow);
    expect(samples[2]).not.toBe(shadow);
    expect(samples[3]).toContain("rgba(0, 0, 0, 0)");
    await surface.evaluate((node) =>
      node.getAnimations().forEach((animation) => animation.finish()),
    );
    await expect(surface).toHaveCSS("box-shadow", "none");
    await page.getByRole("button", { name: "← Back", exact: true }).click();
    const collapse = await surface.evaluate((node) => {
      const motions = node.getAnimations();
      motions.forEach((animation) => {
        animation.pause();
        animation.currentTime = 180;
      });
      return getComputedStyle(node).boxShadow;
    });
    expect(collapse).toBe(shadow);
    await surface.evaluate((node) =>
      node.getAnimations().forEach((animation) => animation.finish()),
    );
    await expect(surface).toHaveCount(0);
  });
}

test("WEB-SE02 interrupted expansion keeps sampled shadow and resize settles cleanly", async ({
  page,
}) => {
  await page.goto("/");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.hover();
  await tile.click();
  const surface = page.locator(".drawing-surface");
  const initial = await surface.evaluate((node) => {
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 320;
    });
    return getComputedStyle(node).boxShadow;
  });
  await page.evaluate(() => history.back());
  await expect
    .poll(() =>
      surface.evaluate((node) =>
        node.getAnimations().some((motion) => motion.playState === "running"),
      ),
    )
    .toBe(true);
  const reversed = await surface.evaluate((node) => {
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    return getComputedStyle(node).boxShadow;
  });
  expect(reversed).toBe(initial);
  await page.setViewportSize({ width: 1100, height: 850 });
  await expect(surface).toHaveCount(0);
});
