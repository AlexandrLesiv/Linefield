import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
}
async function line(page: Page, y = 300) {
  await page.mouse.move(300, y);
  await page.mouse.down();
  await page.mouse.move(600, y + 100, { steps: 24 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
}
const shot = (page: Page) =>
  page.screenshot({ clip: { x: 100, y: 180, width: 1000, height: 500 } });
test("MIG-INK-01 actual mouse renders, immediate next stroke and session history survives gallery", async ({
  page,
}, info) => {
  await open(page);
  const blank = await shot(page);
  await line(page);
  const first = await shot(page);
  expect(first.equals(blank)).toBe(false);
  await line(page, 450);
  const second = await shot(page);
  expect(second.equals(first)).toBe(false);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(first)).toBe(true);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(second)).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await expect.poll(async () => (await shot(page)).equals(first)).toBe(true);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await expect.poll(async () => (await shot(page)).equals(second)).toBe(true);
  }
  await page.locator(".back").click();
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect.poll(async () => (await shot(page)).equals(second)).toBe(true);
  await page.screenshot({ path: info.outputPath("two-strokes-retained.png") });
});
test("MIG-VIEW-01 pan updates before release, Escape restores view, rotation aligns and resets", async ({
  page,
}, info) => {
  await open(page);
  await line(page);
  const original = await shot(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 400);
  await page.mouse.down();
  await page.mouse.move(550, 450, { steps: 12 });
  expect((await shot(page)).equals(original)).toBe(false);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect.poll(async () => (await shot(page)).equals(original)).toBe(true);
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  expect((await shot(page)).equals(original)).toBe(false);
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(original)).toBe(true);
  await page.getByRole("button", { name: "Pan canvas", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pan canvas", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({ path: info.outputPath("pan-mode-keyboard.png") });
});
test("MIG-INK-02 active guards stay visually stable, Escape cancels without history", async ({
  page,
}) => {
  await open(page);
  const blank = await shot(page);
  const pen = page.getByRole("button", { name: "Pen", exact: true });
  const before = await pen.evaluate((n) => getComputedStyle(n).backgroundColor);
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 8 });
  await expect(pen).toHaveAttribute("aria-disabled", "true");
  expect(await pen.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe(before);
  await page.keyboard.press("Meta+z");
  await expect(pen).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect((await shot(page)).equals(blank)).toBe(true);
});
test("MIG-STYLE-01 width and label survive Resume; cancelled adjustment restores Rust style", async ({
  page,
}) => {
  await open(page);
  const width = page.getByRole("slider", { name: "Width", exact: true });
  await width.focus();
  await page.keyboard.press("End");
  await expect(width).toHaveValue("512");
  await page.locator(".back").click();
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect(width).toHaveValue("512");
  await expect(width).toHaveAttribute("aria-valuetext", "512");
  await expect(page.locator(".property-width .property-value")).toHaveText("512");
  await width.focus();
  await page.keyboard.press("Home");
  const box = await width.boundingBox();
  if (!box) throw Error("width range missing");
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(width).toHaveValue("1");
  await page.locator(".back").click();
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect(width).toHaveValue("1");
  await expect(width).toHaveAttribute("aria-valuetext", "1");
});
test("MIG-MOTION-01 normal opening admits first ready stroke without animation remapping", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(600, 400, { steps: 8 });
  await expect(page.getByRole("button", { name: "Pen", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  const stroke = await shot(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(stroke), { timeout: 500 }).toBe(false);
});
