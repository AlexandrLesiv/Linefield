import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { observeHistoryDisplay, releaseHistory } from "./history-display-observation.ts";

async function stroke(page: Page, y: number) {
  await clear(page);
  await page.mouse.move(300, y);
  await page.mouse.down();
  await page.mouse.move(750, y, { steps: 32 });
  await page.mouse.up();
  await complete(page);
}
async function setup(page: Page) {
  await observeHistoryDisplay(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await stroke(page, 300);
  await stroke(page, 450);
  await page.evaluate(() => {
    document.documentElement.dataset.holdHistory = "true";
    document.documentElement.dataset.historyPixels = "true";
  });
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-history-replies")))
    .toBeGreaterThan(0);
}
async function pending(page: Page) {
  const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  expect(snapshot?.dropped).toBe(0);
  expect(snapshot?.records.some((r) => r.kind === "receipt-ack")).toBe(false);
  expect(snapshot?.records.some((r) => r.kind === "overlay-submit" && !r.complete)).toBe(true);
  expect(Number(await page.locator("html").getAttribute("data-history-minimum"))).toBeGreaterThan(
    80,
  );
}
test("MIG-WORKER-21 held Undo keeps unaffected artwork every frame and fresh ink is immediate", async ({
  page,
}) => {
  await setup(page);
  await page.mouse.move(300, 600);
  await page.mouse.down();
  await page.mouse.move(750, 600, { steps: 32 });
  await expect
    .poll(async () => await page.locator("html").getAttribute("data-history-last"))
    .toBe("[128,128,128]");
  await pending(page);
  await page.mouse.up();
  await releaseHistory(page);
  await complete(page);
  expect(await page.locator("html").getAttribute("data-history-last")).toBe("[128,0,128]");
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  expect(await page.locator("html").getAttribute("data-history-last")).toBe("[128,0,0]");
  expect(Number(await page.locator("html").getAttribute("data-history-minimum"))).toBeGreaterThan(
    80,
  );
});

test("MIG-WORKER-23 held Undo follows pan and Escape without acknowledging historical pixels", async ({
  page,
}) => {
  await setup(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 700);
  await page.mouse.down();
  await page.evaluate(() => {
    document.documentElement.dataset.historyDx = "100";
    document.documentElement.dataset.historyDy = "20";
  });
  await page.mouse.move(500, 720);
  await expect
    .poll(async () => await page.locator("html").getAttribute("data-history-last"))
    .toBe("[128,128,0]");
  await pending(page);
  await page.evaluate(() => {
    document.documentElement.dataset.historyDx = "0";
    document.documentElement.dataset.historyDy = "0";
  });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await releaseHistory(page);
  await complete(page);
  expect(await page.locator("html").getAttribute("data-history-last")).toBe("[128,0,0]");
  expect(Number(await page.locator("html").getAttribute("data-history-minimum"))).toBeGreaterThan(
    80,
  );
});

test("MIG-WORKER-24 repeated history and cancelled fresh ink cannot resurrect after context recovery", async ({
  page,
}) => {
  await setup(page);
  await page.mouse.move(300, 600);
  await page.mouse.down();
  await page.mouse.move(750, 600, { steps: 32 });
  await expect
    .poll(async () => await page.locator("html").getAttribute("data-history-last"))
    .toBe("[128,128,128]");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect
    .poll(async () => await page.locator("html").getAttribute("data-history-last"))
    .toBe("[128,128,0]");
  await pending(page);
  await page.evaluate(() => {
    document.documentElement.dataset.historyPixels = "false";
  });
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  const loss = await page.locator("canvas").evaluateHandle((canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas missing");
    const extension = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!extension) throw Error("context-loss extension missing");
    extension.loseContext();
    return extension;
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "displayLost");
  await releaseHistory(page);
  await clear(page);
  await page.evaluate(() => {
    document.documentElement.dataset.historyPixels = "true";
  });
  await loss.evaluate((extension) => extension.restoreContext());
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect
    .poll(async () => await page.locator("html").getAttribute("data-history-last"))
    .toBe("[128,0,0]");
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toBeDisabled();
  expect(await page.locator("html").getAttribute("data-history-last")).toBe("[0,0,0]");
  await loss.dispose();
  await page.locator(".back").click();
  await expect(page.locator("canvas")).toHaveCount(0);
});
