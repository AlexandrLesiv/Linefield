import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import {
  checkAdmissions,
  coldSource,
  holdColdReplies,
  readCold,
  releaseCold,
  resumeCold,
} from "./cold-observation.ts";
import type { ColdRecord } from "./cold-observation.ts";
test("MIG-WORKER-25 held cold partial replies age before GPU admission and preserve exact output", async ({
  page,
}, info) => {
  await holdColdReplies(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const source = await coldSource(page);
  await complete(page, false, false, (rows) => source.push(...rows));
  await info.attach("source-counts", {
    body: JSON.stringify(source.filter((r) => r.kind === "stroke-count" || r.kind === "input")),
    contentType: "application/json",
  });
  expect(source.some((r) => r.kind === "stroke-count" && r.count === "8193" && !r.active)).toBe(
    true,
  );
  const clip = { x: 200, y: 220, width: 700, height: 400 };
  const original = await page.screenshot({ clip });
  await clear(page);
  await resumeCold(page);
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-cold-held")))
    .toBe(8);
  const records: ColdRecord[] = await readCold(page);
  // Lifecycle identity belongs to the resumed candidate, not an input latency sample.
  const resumed = records.findLast((r) => r.kind === "overlay-submit");
  const previous = source.findLast((r) => r.kind === "input" && r.command === "end");
  expect(resumed).toBeDefined();
  expect(previous).toBeDefined();
  expect(resumed?.owner).toBe(previous?.owner);
  expect(resumed?.content).toBe(previous?.content);
  expect(resumed?.session).not.toBe(previous?.session);
  const input = resumed;
  expect(input).toBeDefined();
  expect(records.filter((r) => r.kind === "frame-batch")).toHaveLength(0);
  await releaseCold(page, 1);
  await expect
    .poll(async () => {
      records.push(...(await readCold(page)));
      return records.some((r) => r.kind === "frame-admission" && r.reason === "age");
    })
    .toBe(true);
  expect(records.some((r) => r.kind === "receipt-ack" && r.mapping === input?.mapping)).toBe(false);
  await releaseCold(page, 8, true);
  await complete(page, false, false, (rows) => records.push(...rows), input);
  checkAdmissions(records);
  expect(records.some((r) => r.kind === "frame-admission" && r.reason === "done")).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
  await info.attach("cold-admission", {
    body: JSON.stringify(records),
    contentType: "application/json",
  });
});
test("MIG-WORKER-26 empty and terminal warm scenes bypass cold timers", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const records = await readCold(page);
  const clip = { x: 200, y: 220, width: 700, height: 400 };
  const blank = await page.screenshot({ clip });
  await clear(page);
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(600, 450);
  await page.mouse.up();
  await complete(page);
  const artwork = await page.screenshot({ clip });
  expect(artwork.equals(blank)).toBe(false);
  for (let i = 0; i < 2; i++) {
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page, true, false, (rows) => records.push(...rows));
    await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true, false, (rows) => records.push(...rows));
    await expect.poll(async () => (await page.screenshot({ clip })).equals(artwork)).toBe(true);
  }
  const gates = checkAdmissions(records);
  expect(gates.some((r) => r.reason === "done" && r.queued === 0)).toBe(true);
  expect(gates.every((r) => r.peakTimers === 0)).toBe(true);
  await info.attach("terminal-admission", {
    body: JSON.stringify(gates),
    contentType: "application/json",
  });
});
