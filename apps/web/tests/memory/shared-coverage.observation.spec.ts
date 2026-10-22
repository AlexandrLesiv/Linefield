import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";

test("MIG-WORKER-18 broad completed pages reject insufficient current-view coverage", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  for (let i = 0; i < 16; i++)
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await complete(page);
  for (const [x, end, y] of [
    [600, 620, 450],
    [200, 1200, 470],
  ]) {
    if (x === undefined || end === undefined || y === undefined) throw Error("source");
    await clear(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(end, y);
    await page.mouse.up();
    await complete(page);
  }
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  const clip = { x: 240, y: 250, width: 700, height: 400 };
  const original = await page.screenshot({ clip });
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 600);
  await page.mouse.down();
  await page.mouse.move(850, 600);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await complete(page);
  const before = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await complete(page, true);
  const after = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
  expect(after?.preparedCoverageMisses).toBeGreaterThan(before?.preparedCoverageMisses ?? 0);
  expect(after?.jobs).toBeGreaterThan(before?.jobs ?? 0);
  expect(after?.workerPages).toBeGreaterThan(before?.workerPages ?? 0);
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
});
