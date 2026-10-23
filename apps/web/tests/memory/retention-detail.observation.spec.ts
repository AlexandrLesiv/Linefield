import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import {
  installRetentionObservation,
  records,
  control,
  settleFrame,
  stroke,
} from "./retention-route-observation.ts";
import type { RecordValue } from "./retention-route-observation.ts";

test("MIG-WORKER-02/18 accepted mapping restarts quiet detail while actual display RAF is held", async ({
  page,
}, info) => {
  await page.clock.install();
  await installRetentionObservation(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await complete(page);
  await clear(page);
  await stroke(page, 380);
  await complete(page);
  await page.clock.pauseAt(new Date());
  const start = await page.evaluate(() => performance.now());
  await clear(page);
  await control(page, "Zoom out");
  const log: RecordValue[] = await records(page);
  const lower = log.find((r) => r.kind === "retention-detail" && r.phase === "accepted");
  expect(lower?.minimum).toBe(1);
  expect(lower?.retained).toBe(2);
  await settleFrame(page, log);
  // Centered inverse zooms restore the default camera; Reset view has a canonical Noop
  // branch. Reset rotation always advances mapping, including an already-zero angle.
  await expect(page.locator(".canvas-footer")).toContainText("100%");
  await expect(page.getByRole("button", { name: "Reset canvas rotation", exact: true })).toHaveText(
    "0°",
  );
  await control(page, "Reset view");
  const noop = await records(page);
  await info.attach("noop-control", {
    body: JSON.stringify(noop),
    contentType: "application/json",
  });
  expect(
    noop.some((r) => r.kind === "input" && r.outcome === "noop" && r.mapping === lower?.mapping),
  ).toBe(true);
  expect(noop.filter((r) => r.kind === "retention-detail")).toEqual([]);
  const elapsed = (await page.evaluate(() => performance.now())) - start;
  expect(elapsed).toBeLessThan(240);
  await page.clock.runFor(240 - elapsed);
  await page.evaluate(() => {
    document.documentElement.dataset.holdRetentionFrames = "true";
  });
  await control(page, "Rotate canvas right 15°");
  log.push(...(await records(page)));
  const changed = log.findLast((r) => r.kind === "retention-detail" && r.phase === "accepted");
  expect(changed?.mapping).not.toBe(lower?.mapping);
  expect(changed?.retained).toBe(2);
  await page.clock.runFor(30);
  expect(Number(await page.locator("html").getAttribute("data-retention-frames"))).toBeGreaterThan(
    0,
  );
  log.push(...(await records(page)));
  expect(log.filter((r) => r.kind === "retention-detail" && r.phase === "settled")).toEqual([]);
  await page.evaluate(() => window.dispatchEvent(new Event("release-retention-frames")));
  await settleFrame(page, log);
  await page.evaluate(() => {
    document.documentElement.dataset.retentionDetails = "";
  });
  const held: RecordValue[] = [];
  await stroke(page, 430);
  held.push(...(await records(page)));
  await settleFrame(page, held);
  expect(await page.locator("html").getAttribute("data-retention-details")).toContain("2");
  // A real content edit must not restart mapping quiet time.
  expect(held.filter((r) => r.kind === "retention-detail" && r.phase === "accepted")).toEqual([]);
  const now = await page.evaluate(() => performance.now());
  const deadline = Number(changed?.time) + 250;
  expect(now).toBeLessThan(deadline);
  await page.clock.runFor(deadline - now + 1);
  const settled = await records(page);
  expect(
    settled.some((r) => r.kind === "retention-detail" && r.phase === "settled" && r.retained === 1),
  ).toBe(true);
  await page.clock.resume();
  await page.evaluate(() => {
    document.documentElement.dataset.retentionDetails = "";
  });
  await clear(page);
  await stroke(page, 480);
  await complete(page);
  expect(await page.locator("html").getAttribute("data-retention-details")).toContain("1");
  const clip = { x: 300, y: 300, width: 450, height: 250 };
  const visible = await page.screenshot({ clip });
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await clear(page);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await complete(page, true);
  expect((await page.screenshot({ clip })).equals(visible)).toBe(true);
  await info.attach("controlled-mapping-timing", {
    body: JSON.stringify({ log, noop, held, settled }),
    contentType: "application/json",
  });
});
