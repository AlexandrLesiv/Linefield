import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
test("MIG-WORKER-12 navigation disposes confirmed pending frame prefetch and Resume preserves source", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const Original = Worker;
    let starts = 0,
      terminated = 0;
    window.Worker = class extends Original {
      override postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        const hold = document.documentElement.dataset.holdPreparation === "true";
        if (
          hold &&
          message &&
          typeof message === "object" &&
          "kind" in message &&
          message.kind === "start"
        ) {
          document.documentElement.dataset.pendingStarts = `${++starts}`;
          // Withhold until navigation terminates this worker: a timeout cannot prove
          // the request is still pending at the cancellation boundary.
          return;
        }
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
      override terminate() {
        document.documentElement.dataset.terminatedWorkers = `${++terminated}`;
        return super.terminate();
      }
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const clip = { x: 200, y: 220, width: 750, height: 450 };
  const blank = await page.screenshot({ clip });
  await clear(page);
  await page.mouse.move(260, 300);
  await page.mouse.down();
  await page.mouse.move(800, 450, { steps: 384 });
  await page.mouse.up();
  await complete(page);
  const artwork = await page.screenshot({ clip });
  expect(artwork.equals(blank)).toBe(false);
  await page.evaluate(() => {
    document.documentElement.dataset.holdPreparation = "true";
  });
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-pending-starts")))
    .toBeGreaterThanOrEqual(2);
  await page.locator(".back").click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect
    .poll(async () => Number(await page.locator("html").getAttribute("data-terminated-workers")))
    .toBeGreaterThanOrEqual(1);
  await page.evaluate(() => {
    document.documentElement.dataset.holdPreparation = "false";
  });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(artwork)).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
});
