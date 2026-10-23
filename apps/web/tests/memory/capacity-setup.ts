import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { observeHistoryDisplay, releaseHistory } from "./history-display-observation.ts";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
export { releaseHistory };
export async function heldPrefix(page: Page, packed: boolean, observePixels = false) {
  if (packed) await forcePackedTargets(page);
  await observeHistoryDisplay(page, observePixels);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(750, 300, { steps: 32 });
  await complete(page, false, true);
  await page.evaluate(() => {
    document.documentElement.dataset.holdHistory = "true";
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-history-replies")))
    .toBeGreaterThan(0);
  const first = await drainCapacity(page);
  expect(first.some((r) => r.kind === "input" && r.command === "end" && r.outcome === "ok")).toBe(
    true,
  );
  expect(first.some((r) => r.kind === "stroke-count" && r.count === "33" && !r.active)).toBe(true);
  await page.mouse.move(300, 450);
  await page.mouse.down();
  await page.mouse.move(750, 450, { steps: 32 });
  await page.mouse.up();
  if (observePixels) {
    await clear(page);
    await page.evaluate(() => {
      document.documentElement.dataset.historyPixels = "true";
    });
    // Materialize B while A remains cold; cancelling this fresh contact adds no history.
    await page.mouse.move(300, 750);
    await page.mouse.down();
    await page.mouse.move(400, 750);
    const cancelled: Readonly<Record<string, string | number | boolean>>[] = [];
    await expect
      .poll(async () => {
        cancelled.push(...(await drainCapacity(page)));
        return cancelled.some((r) => r.kind === "coverage-transition" && r.phase === "consume");
      })
      .toBe(true);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    cancelled.push(...(await drainCapacity(page)));
    const begin = cancelled.find(
      (r) => r.kind === "input" && r.command === "begin" && r.outcome === "ok",
    );
    const cancel = cancelled.find(
      (r) => r.kind === "input" && r.command === "cancel" && r.outcome === "ok",
    );
    expect(begin).toBeDefined();
    expect(cancel?.content).toBe(begin?.content);
    expect(cancel?.interaction).toBe("0");
    expect(
      cancelled.some((r) => r.kind === "input" && r.command === "end" && r.outcome === "ok"),
    ).toBe(false);
    await expect(
      page.getByRole("button", { name: "Undo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
    await expect(
      page.getByRole("button", { name: "Redo last action", exact: true }),
    ).toBeDisabled();
  }
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
}
export async function drainCapacity(page: Page) {
  const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  if (!snapshot) throw Error("observation required");
  expect(snapshot.dropped).toBe(0);
  return snapshot.records;
}
export async function unfinished(page: Page) {
  const rows = await drainCapacity(page);
  expect(rows.some((r) => r.kind === "receipt-ack")).toBe(false);
  expect(rows.some((r) => r.kind === "overlay-submit" && !r.complete)).toBe(true);
  expect(Number(await page.locator("html").getAttribute("data-history-replies"))).toBeGreaterThan(
    0,
  );
  return rows;
}
