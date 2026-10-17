import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function frame(surface: Locator, time: number) {
  return surface.evaluate((node, at) => {
    node.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = at;
    });
    const visual = node.querySelector<HTMLElement>(".creation-visual");
    if (!visual) throw Error("Missing creation content");
    return {
      color: getComputedStyle(node).backgroundColor,
      opacity: Number(getComputedStyle(visual).opacity),
      text: visual.textContent,
      width: node.getBoundingClientRect().width,
    };
  }, time);
}

for (const scheme of ["light", "dark"] as const) {
  test(`WEB-C01 New tile color and content fade both ways in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const create = page.locator(".new-tile");
    const paper = scheme === "dark" ? "rgb(238, 238, 236)" : "rgb(255, 255, 255)";
    const color = await create.evaluate((node) => getComputedStyle(node).backgroundColor);
    await create.focus();
    await create.press("Enter");
    const surface = page.locator(".drawing-surface");
    const start = await frame(surface, 0);
    expect(start.color).toBe(color);
    expect(start.opacity).toBe(1);
    expect(start.text).toContain("New drawing");
    const middle = await frame(surface, 80);
    expect(middle.color).not.toBe(color);
    expect(middle.color).not.toBe(paper);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);
    const end = await frame(surface, 359.99);
    expect(end.color).toBe(paper);
    expect(end.opacity).toBe(0);
    await surface.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(page.locator(".back")).toBeFocused();
    await page.locator(".back").click();
    expect((await frame(surface, 0)).color).toBe(paper);
    const returning = await frame(surface, 80);
    expect(returning.color).not.toBe(color);
    expect(returning.color).not.toBe(paper);
    const last = await frame(surface, 359.99);
    expect(last.color).toBe(color);
    expect(last.opacity).toBeCloseTo(1, 3);
    await surface.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(surface).toHaveCount(0);
    await expect(create).toHaveCSS("visibility", "visible");
    expect(await create.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      last.color,
    );
    await expect(page.locator(".drawing-card")).toHaveCount(6);
  });
}

test("WEB-C02 creation fade progresses in real playback and reverses an interrupted opening", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.locator(".new-tile").focus();
  await page.locator(".new-tile").press("Enter");
  const surface = page.locator(".drawing-surface");
  const progress = await surface.evaluate(async (node) => {
    const shell = node.getAnimations()[0];
    const visual = node.querySelector(".creation-visual");
    const fade = visual?.getAnimations()[0];
    if (!shell || !fade || !visual) throw Error("Missing creation animations");
    await Promise.all([shell.ready, fade.ready]);
    await new Promise<void>((resolve) => {
      const tick = () =>
        Number(shell.currentTime) >= 70 ? resolve() : requestAnimationFrame(tick);
      tick();
    });
    return {
      state: fade.playState,
      opacity: Number(getComputedStyle(visual).opacity),
      delta: Math.abs(Number(shell.currentTime) - Number(fade.currentTime)),
    };
  });
  expect(progress.state).toBe("running");
  expect(progress.delta).toBeLessThan(2);
  expect(progress.opacity).toBeGreaterThan(0);
  expect(progress.opacity).toBeLessThan(1);
  const interrupted = await frame(surface, 70);
  await page.goBack();
  const reverse = await frame(surface, 0);
  expect(reverse.color).toBe(interrupted.color);
  expect(reverse.opacity).toBeCloseTo(interrupted.opacity, 3);
  await surface.evaluate((node) =>
    node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
  );
  await expect(surface).toHaveCount(0);
  await expect(page.locator(".new-tile")).toBeVisible();
});

test("WEB-C03 reduced motion leaves no creation animation or hidden source", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator(".back")).toBeFocused();
  await expect(page.locator(".drawing-surface")).toHaveCSS(
    "background-color",
    "rgb(238, 238, 236)",
  );
  await expect(page.locator(".creation-visual")).toHaveCSS("opacity", "0");
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toBeVisible();
});
