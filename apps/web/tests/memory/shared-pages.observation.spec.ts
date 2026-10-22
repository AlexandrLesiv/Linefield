import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";

test("MIG-WORKER-18 completed secondary overlay reuses prepared pages across historical replay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  for (let i = 0; i < 24; i++) {
    await clear(page);
    await page.mouse.move(260 + i * 18, 280);
    await page.mouse.down();
    await page.mouse.move(300 + i * 18, 470, { steps: 4 });
    await page.mouse.up();
    await complete(page);
  }
  const clip = { x: 220, y: 220, width: 650, height: 350 };
  const original = await page.screenshot({ clip });
  for (let cycle = 0; cycle < 2; cycle++) {
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    const before = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    const after = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    if (cycle === 1) {
      expect(after?.preparedHits).toBeGreaterThan(before?.preparedHits ?? 0);
      expect(after?.immediatePreparations).toBe(before?.immediatePreparations);
      expect(after?.gpuUploads).toBe(before?.gpuUploads);
    }
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  }
  await clear(page);
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  await complete(page);
  await clear(page);
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await complete(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
});
