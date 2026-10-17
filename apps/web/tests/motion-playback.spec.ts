import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function playing(surface: Locator) {
  return surface.evaluate(async (node) => {
    const shell = node.getAnimations()[0];
    const art = node.querySelector("img")?.getAnimations()[0];
    if (!shell || !art) throw Error("Missing shell/artwork animation");
    await Promise.all([shell.ready, art.ready]);
    // Let the browser clock advance naturally: do not assign currentTime or finish().
    await new Promise<void>((resolve) => {
      const inspect = () => {
        if (Number(shell.currentTime) >= 100) resolve();
        else requestAnimationFrame(inspect);
      };
      inspect();
    });
    return {
      shellState: shell.playState,
      artState: art.playState,
      shellTime: Number(shell.currentTime),
      artTime: Number(art.currentTime),
      width: node.querySelector("img")?.getBoundingClientRect().width ?? 0,
    };
  });
}

test("WEB-M04 artwork advances with the shell during real opening and closing playback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 844 });
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  const sourceWidth = (await card.locator("img").boundingBox())?.width ?? 0;
  await card.locator(".drawing-tile").click();
  const surface = page.locator(".drawing-surface");
  const opening = await playing(surface);
  expect(opening.shellState).toBe("running");
  expect(opening.artState).toBe("running");
  expect(Math.abs(opening.artTime - opening.shellTime)).toBeLessThan(2);
  expect(opening.width).toBeGreaterThan(sourceWidth + 50);
  expect(opening.width).toBeLessThan(1100);
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  const closing = await playing(surface);
  expect(closing.artState).toBe("running");
  expect(Math.abs(closing.artTime - closing.shellTime)).toBeLessThan(2);
  expect(closing.width).toBeLessThan(1050);
  expect(closing.width).toBeGreaterThan(sourceWidth);
  await expect(surface).toHaveCount(0);
  expect((await card.locator("img").boundingBox())?.width).toBe(sourceWidth);
});
