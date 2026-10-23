import { test, expect } from "@playwright/test";
import { complete, clear } from "./observed-frame.ts";
import { checkAdmissions } from "./cold-observation.ts";
test("MIG-WORKER-11 warm painter-order replay refills bounded submission slices", async ({
  page,
}, info) => {
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
  const admissions: Readonly<Record<string, string | number | boolean>>[] = [];
  const rounds: { jobs: number; uploads: number; first: number; last: number }[] = [];
  for (let i = 0; i < 2; i++) {
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await clear(page);
    const before = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    if (!before) throw Error("observation build required");
    const first = admissions.length;
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true, false, (records) => {
      batches.push(...records.filter((record) => record.kind === "frame-batch"));
      admissions.push(...records.filter((record) => record.kind === "frame-admission"));
    });
    const after = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    if (!after) throw Error("observation build required");
    rounds.push({
      jobs: after.jobs - before.jobs,
      uploads: after.gpuUploads - before.gpuUploads,
      first,
      last: admissions.length,
    });
    await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
  }
  expect(batches.length).toBeGreaterThan(0);
  expect(batches.some((batch) => Number(batch.commands) > 32)).toBe(true);
  const gates = checkAdmissions(admissions);
  await info.attach("warm-admissions", {
    body: JSON.stringify({ gates, rounds }),
    contentType: "application/json",
  });
  expect(gates.some((gate) => gate.reason === "full")).toBe(true);
  // The first replay may still prepare/upload the most recent completed stroke.
  const warm = rounds.at(-1);
  expect(warm).toMatchObject({ jobs: 0, uploads: 0 });
  expect(admissions.slice(warm?.first, warm?.last).every((gate) => gate.peakTimers === 0)).toBe(
    true,
  );
  for (const batch of batches) {
    expect(Number(batch.commands)).toBeLessThanOrEqual(256);
    expect(Number(batch.queued)).toBeLessThanOrEqual(32);
    expect(Number(batch.readyBytes)).toBeLessThanOrEqual(1024 ** 2);
    expect(Number(batch.slotWait)).toBeGreaterThanOrEqual(0);
  }
});
