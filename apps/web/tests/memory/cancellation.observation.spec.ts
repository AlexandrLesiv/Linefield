import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { holdPreparationReplies } from "./held-preparation.ts";
import { clear, complete } from "./observed-frame.ts";
import { drainCapacity } from "./capacity-setup.ts";

async function stroke(page: Page, y: number, hold = false) {
  await clear(page);
  await page.mouse.move(300, y);
  await page.mouse.down();
  await page.mouse.move(750, y + 70, { steps: 32 });
  if (hold)
    await page.evaluate(() => {
      document.documentElement.dataset.holdReplies = "true";
    });
  await page.mouse.up();
  if (!hold) await complete(page);
  else {
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    await expect
      .poll(async () => {
        rows.push(...(await drainCapacity(page)));
        const source = rows.find((r) => r.kind === "live-owner")?.stroke;
        return (
          !!source &&
          rows.some(
            (r) =>
              r.kind === "stroke-count" && r.stroke === source && r.count === "33" && !r.active,
          )
        );
      })
      .toBe(true);
    expect(rows.some((r) => r.kind === "input" && r.command === "end" && r.outcome === "ok")).toBe(
      true,
    );
  }
}
async function rotation(page: Page, reset = false) {
  await clear(page);
  await page
    .getByRole("button", {
      name: reset ? "Reset canvas rotation" : "Rotate canvas right 15°",
      exact: true,
    })
    .click();
}
test("MIG-WORKER-15 held worker Undo retires candidate before exact recovery and rejects late replies", async ({
  page,
}) => {
  await holdPreparationReplies(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 200, y: 200, width: 750, height: 450 };
  await stroke(page, 300);
  for (let cycle = 0; cycle < 2; cycle++) {
    await rotation(page);
    await complete(page);
    const baseline = await page.screenshot({ clip });
    await rotation(page, true);
    await complete(page);
    await stroke(page, 450 + cycle * 40, true);
    await rotation(page);
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-held-replies")))
      .toBeGreaterThan(0);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    let accepted = 0,
      acknowledged = 0,
      retired = false;
    await complete(page, false, false, (records) => {
      for (const record of records) {
        if (record.kind === "input" && record.command === "undo" && record.outcome === "ok")
          accepted = Number(record.time);
        if (record.kind === "receipt-ack") acknowledged = Number(record.time);
        if (record.kind === "frame-retired" && record.cancelled) {
          expect([
            record.queue,
            record.active,
            record.readyBytes,
            record.preparationCopies,
          ]).toEqual([0, 0, 0, 0]);
          expect(record.failures).toBe(0);
          retired = true;
        }
      }
    });
    expect(accepted).toBeGreaterThan(0);
    expect(retired).toBe(true);
    expect(acknowledged - accepted).toBeGreaterThanOrEqual(0);
    expect(acknowledged - accepted).toBeLessThanOrEqual(500);
    expect(Number(await page.locator("html").getAttribute("data-terminated-workers"))).toBe(
      cycle + 1,
    );
    expect((await page.screenshot({ clip })).equals(baseline)).toBe(true);
    await page.evaluate(() => document.dispatchEvent(new Event("release-held-preparation")));
    await page.waitForTimeout(100);
    expect((await page.screenshot({ clip })).equals(baseline)).toBe(true);
    await stroke(page, 350 + cycle * 40);
    await expect(
      page.getByRole("button", { name: "Redo last action", exact: true }),
    ).toBeDisabled();
    const branched = await page.screenshot({ clip });
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(baseline)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(branched)).toBe(true);
    await rotation(page, true);
    await complete(page);
  }
  await page.locator(".back").click();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
