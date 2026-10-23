import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";

test("MIG-WORKER-18 completed-page reuse preserves prepared geometry across historical replay", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 220, y: 220, width: 650, height: 350 };
  const blank = await page.screenshot({ clip });
  for (let i = 0; i < 24; i++) {
    await clear(page);
    await page.mouse.move(260 + i * 18, 280);
    await page.mouse.down();
    await page.mouse.move(300 + i * 18, 470, { steps: 4 });
    await page.mouse.up();
    await complete(page);
  }
  const original = await page.screenshot({ clip });
  expect(original.equals(blank)).toBe(false);
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
      expect(after?.completeFrames).toBeGreaterThan(before?.completeFrames ?? 0);
      expect(after?.jobs).toBe(before?.jobs);
      expect(after?.workerPages).toBe(before?.workerPages);
      expect(after?.fallbackPages).toBe(before?.fallbackPages);
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
