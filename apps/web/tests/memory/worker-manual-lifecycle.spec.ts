import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const ready = (page: Page) =>
  expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
const clip = { x: 100, y: 200, width: 600, height: 350 };
test("WP01 worker-response scheduling fixture preserves ended A when B cancels; worker failure Retry", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const pending: MessageEvent[] = [];
        let release = false;
        this.addEventListener("message", (event) => {
          if (!release && document.documentElement.dataset.holdWorker === "true") {
            event.stopImmediatePropagation();
            pending.push(event);
            document.documentElement.dataset.workerHeld = "true";
          }
        });
        document.addEventListener("test-worker-release", () => {
          release = true;
          document.documentElement.dataset.holdWorker = "false";
          for (const event of pending.splice(0))
            this.dispatchEvent(new MessageEvent("message", { data: event.data }));
          release = false;
        });
        document.addEventListener(
          "test-worker-fail",
          () => this.dispatchEvent(new Event("error")),
          { once: true },
        );
      }
    };
  });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  const blank = await page.screenshot({ clip });
  await page.evaluate(() => {
    document.documentElement.dataset.holdWorker = "true";
  });
  await page.mouse.move(250, 280);
  await page.mouse.down();
  await page.mouse.move(500, 280, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("html")).toHaveAttribute("data-worker-held", "true");
  await page.mouse.move(250, 380);
  await page.mouse.down();
  await page.mouse.move(500, 380, { steps: 12 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.evaluate(() => document.dispatchEvent(new Event("test-worker-release")));
  await ready(page);
  const a = await page.screenshot({ clip });
  expect(a.equals(blank)).toBe(false);
  await page.screenshot({ path: info.outputPath("a-preserved-after-b-cancel.png") });
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  await page.locator("[data-memory-redo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(a)).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event("test-worker-fail")));
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute(
    "data-state",
    "resourceUnavailable",
  );
  await page.getByRole("button", { name: "Retry display" }).click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(a)).toBe(true);
  await page.screenshot({ path: info.outputPath("retry-preserves-history.png") });
});
