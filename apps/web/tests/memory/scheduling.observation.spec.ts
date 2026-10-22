import { test, expect } from "@playwright/test";
import { complete, clear } from "./observed-frame.ts";
test("MIG-WORKER-11 warm painter-order replay refills bounded submission slices", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  for (let i = 0; i < 40; i++) {
    await clear(page);
    await page.mouse.move(240 + i * 14, 300);
    await page.mouse.down();
    await page.mouse.move(246 + i * 14, 450);
    await page.mouse.up();
    await complete(page);
  }
  const clip = { x: 200, y: 250, width: 700, height: 250 };
  const original = await page.screenshot({ clip });
  const batches: Readonly<Record<string, string | number | boolean>>[] = [];
  for (let i = 0; i < 2; i++) {
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true, false, (records) => {
      batches.push(...records.filter((record) => record.kind === "frame-batch"));
    });
    await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
  }
  expect(batches.length).toBeGreaterThan(0);
  expect(batches.some((batch) => Number(batch.commands) > 32)).toBe(true);
  for (const batch of batches) {
    expect(Number(batch.commands)).toBeLessThanOrEqual(256);
    expect(Number(batch.queued)).toBeLessThanOrEqual(32);
    expect(Number(batch.readyBytes)).toBeLessThanOrEqual(1024 ** 2);
    expect(Number(batch.slotWait)).toBeGreaterThanOrEqual(0);
  }
});
