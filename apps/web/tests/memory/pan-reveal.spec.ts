import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { installPanContinuity, armPanContinuity, panContinuity } from "./pan-continuity.ts";
const crop = (x: number) => ({ x: x - 30, y: 320, width: 60, height: 160 });
const area = { x: 150, y: 280, width: 850, height: 250 };
async function idle(page: Page) {
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
}
async function begin(page: Page, x: number) {
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(x, 700);
  await page.mouse.down();
}
async function end(page: Page) {
  await page.mouse.up();
  await page.keyboard.up("Space");
  await idle(page);
}
async function exact(page: Page, name: string, x: number, reference: Buffer) {
  let actual = await page.screenshot({ clip: crop(x) });
  try {
    await expect
      .poll(async () => {
        actual = await page.screenshot({ clip: crop(x) });
        return actual.equals(reference);
      })
      .toBe(true);
  } finally {
    await test.info().attach(`${name}-expected`, { body: reference, contentType: "image/png" });
    await test.info().attach(`${name}-actual`, { body: actual, contentType: "image/png" });
  }
}
for (const broad of [false, true])
  test(`MIG-PAN-REVEAL-${broad ? "02" : "01"} successive held pan reveals offscreen ink${broad ? " at 5% with large width and rotation" : ""}`, async ({
    page,
    browser,
  }) => {
    await test.info().attach("environment", {
      body: JSON.stringify({
        browser: browser.version(),
        baseURL: test.info().project.use.baseURL,
      }),
      contentType: "application/json",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installPanContinuity(page);
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    if (broad) {
      for (let i = 0; i < 14; i++) {
        await page.getByRole("button", { name: "Zoom out", exact: true }).click();
        await idle(page);
      }
      await expect(page.locator(".canvas-footer")).toContainText("5%");
      await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
      await idle(page);
      await expect(page.getByRole("slider", { name: "Width", exact: true })).toHaveAttribute(
        "max",
        "512",
      );
      await page.getByRole("slider", { name: "Width", exact: true }).fill("512");
    }
    const blank = await page.screenshot({ clip: crop(900) });
    const references: Buffer[] = [];
    for (const x of [300, 600, 900]) {
      await page.mouse.move(x, 350);
      await page.mouse.down();
      await page.mouse.move(x, 450, { steps: 12 });
      await page.mouse.up();
      await idle(page);
      const ink = await page.screenshot({ clip: crop(x) });
      expect(ink.equals(blank), "positive completed ink").toBe(false);
      references.push(ink);
    }
    await begin(page, 1150);
    await page.mouse.move(150, 700, { steps: 12 });
    await end(page);
    const hidden = await page.screenshot({ clip: area });
    await begin(page, 150);
    for (const [index, x] of [450, 750, 1150].entries()) {
      await page.mouse.move(x, 700, { steps: 12 });
      const reference = references[2 - index];
      if (!reference) throw Error("missing source reference");
      // Each successive viewport exposes a source outside the prior captured viewport.
      // Read and compare actual visible pixels while the physical mouse remains down.
      await exact(page, `held-${index}`, index === 2 ? 300 : 200, reference);
      await expect(
        page.getByRole("button", { name: "Undo last action", exact: true }),
      ).toHaveAttribute("aria-disabled", "true");
      await page.waitForTimeout(100);
      await exact(page, `paused-${index}`, index === 2 ? 300 : 200, reference);
    }
    // Reverse twice without ending the gesture; each return must reconstruct the
    // source that fell outside the intervening viewport, including a paused hold.
    await armPanContinuity(page);
    for (const x of [750, 1150, 450, 1150]) {
      await page.mouse.move(x, 700, { steps: 6 });
      const index = x === 1150 ? 0 : x === 750 ? 1 : 2;
      const reference = references[index];
      if (!reference) throw Error("missing reversal reference");
      await exact(page, `reversed-${x}`, x === 1150 ? 300 : 200, reference);
    }
    const continuity = await panContinuity(page);
    await test.info().attach("every-display-reversal", {
      body: JSON.stringify(continuity),
      contentType: "application/json",
    });
    expect(continuity.samples).toBeGreaterThan(3);
    expect(continuity.losses).toBe(0);
    await page.keyboard.press("Escape");
    await end(page);
    await expect
      .poll(async () => (await page.screenshot({ clip: area })).equals(hidden))
      .toBe(true);
    await begin(page, 150);
    await page.mouse.move(1150, 700, { steps: 12 });
    await end(page);
    const last = references[2];
    if (!last) throw Error("missing source");
    await exact(page, "fresh-ended", 900, last);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await idle(page);
    await exact(page, "undo-last-source", 900, blank);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await idle(page);
    await exact(page, "redo-last-source", 900, last);
  });
