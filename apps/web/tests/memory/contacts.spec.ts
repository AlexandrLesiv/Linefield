import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { forcePackedTargets } from "./packed-targets.ts";
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
}
const shot = (page: Page) =>
  page.screenshot({ clip: { x: 100, y: 180, width: 1000, height: 500 } });
test("MIG-INPUT-01 rapid mouse release and next contact retain each complete stroke", async ({
  page,
}) => {
  await open(page);
  const blank = await shot(page);
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(220, 220 + i * 30);
    await page.mouse.down();
    await page.mouse.move(650, 225 + i * 30, { steps: 3 });
    await page.mouse.up();
  }
  expect((await shot(page)).equals(blank)).toBe(false);
  for (let i = 0; i < 12; i++) {
    await expect(
      page.getByRole("button", { name: "Undo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect.poll(async () => (await shot(page)).equals(blank), { timeout: 500 }).toBe(true);
});
test("MIG-INPUT-02 CDP pen pressure and rapid lifted endpoint preserve stroke; physical Wacom remains manual", async ({
  page,
}, info) => {
  await open(page);
  const blank = await shot(page),
    cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 250,
    y: 300,
    button: "left",
    buttons: 1,
    pointerType: "pen",
    force: 0.8,
    clickCount: 1,
  });
  for (let i = 1; i <= 24; i++)
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: 250 + i * 12,
      y: 300 + i * 3,
      button: "none",
      buttons: 1,
      pointerType: "pen",
      force: 0.8,
    });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 600,
    y: 380,
    button: "left",
    buttons: 0,
    pointerType: "pen",
    force: 0,
    clickCount: 1,
  });
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  expect((await shot(page)).equals(blank)).toBe(false);
  await page.screenshot({ path: info.outputPath("synthetic-pen.png") });
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(blank), { timeout: 500 }).toBe(true);
  await cdp.detach();
});
test("MIG-RECOVERY-01 context loss cancels unfinished contact and restores completed artwork/history", async ({
  page,
}, info) => {
  await open(page);
  await page.mouse.move(250, 250);
  await page.mouse.down();
  await page.mouse.move(600, 350, { steps: 8 });
  await page.mouse.up();
  const saved = await shot(page);
  const extension = await page.locator("canvas").evaluateHandle((node) => {
    if (!(node instanceof HTMLCanvasElement)) throw Error("canvas");
    const e = node.getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!e) throw Error("context loss missing");
    return e;
  });
  await page.mouse.move(250, 450);
  await page.mouse.down();
  await page.mouse.move(600, 550, { steps: 8 });
  await extension.evaluate((e) => e.loseContext());
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "displayLost");
  await page.mouse.up();
  await extension.evaluate((e) => e.restoreContext());
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  expect((await shot(page)).equals(saved)).toBe(true);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await extension.dispose();
  await page.screenshot({ path: info.outputPath("context-restored-history.png") });
});
for (const packed of [false, true])
  test(`MIG-VIEW-02 rapid two-point stroke at five percent completes and remains drawable (${packed ? "packed" : "R8"})`, async ({
    page,
  }) => {
    if (packed) await forcePackedTargets(page);
    await open(page);
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, 100000);
    await page.waitForFunction(() =>
      document.querySelector(".canvas-footer")?.textContent?.includes("5%"),
    );
    const blank = await shot(page);
    await page.mouse.move(200, 300);
    await page.mouse.down();
    await page.mouse.move(1000, 300);
    await page.mouse.up();
    await expect(
      page.getByRole("button", { name: "Undo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    expect((await shot(page)).equals(blank)).toBe(false);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await expect.poll(async () => (await shot(page)).equals(blank), { timeout: 500 }).toBe(true);
  });
