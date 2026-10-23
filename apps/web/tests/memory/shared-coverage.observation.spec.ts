import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { observeClippedPreparation } from "./preparation-clip-observation.ts";
import { records } from "./retention-route-observation.ts";
import type { RecordValue } from "./retention-route-observation.ts";

test("MIG-WORKER-18 broad completed pages reject insufficient current-view coverage", async ({
  page,
}) => {
  await observeClippedPreparation(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  for (let i = 0; i < 16; i++)
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  const detail: RecordValue[] = [];
  await complete(page, false, false, (value) => detail.push(...value));
  // Build coarse source only after the final zoom-out quiet deadline. A still-retained
  // finer entry clipped to the broad view can legitimately cover every later narrow view.
  await expect
    .poll(async () => {
      detail.push(...(await records(page)));
      const accepted = detail.findLast(
        (r) => r.kind === "retention-detail" && r.phase === "accepted",
      );
      return (
        !!accepted &&
        detail.some(
          (r) =>
            r.kind === "retention-detail" &&
            r.phase === "settled" &&
            r.mapping === accepted.mapping &&
            r.retained === accepted.minimum,
        )
      );
    })
    .toBe(true);
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
  await page.evaluate(() => {
    document.documentElement.dataset.coverageClippedStarts = "0";
  });
  const coarse = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  expect(
    Number(await page.locator("html").getAttribute("data-coverage-clipped-starts")),
  ).toBeGreaterThan(0);
  const refined = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
  expect(refined?.preparedMisses).toBeGreaterThan(coarse?.preparedMisses ?? 0);
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
