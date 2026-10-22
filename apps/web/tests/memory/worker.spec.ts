import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
}
async function line(page: Page, y: number) {
  await page.mouse.move(300, y);
  await page.mouse.down();
  await page.mouse.move(650, y + 40, { steps: 32 });
  await page.mouse.up();
}
const shot = (page: Page) => page.screenshot({ clip: { x: 200, y: 200, width: 600, height: 400 } });
test("MIG-WORKER-01 pending preparation admits another stroke and fences Undo/rebranch", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      override postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        setTimeout(() => {
          if (Array.isArray(options)) super.postMessage(message, options);
          else super.postMessage(message, options);
        }, 60);
      }
    };
  });
  await open(page);
  const blank = await shot(page);
  await line(page, 280);
  const a = await shot(page);
  expect(a.equals(blank)).toBe(false);
  await line(page, 400);
  expect((await shot(page)).equals(a)).toBe(false);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await line(page, 500);
  await expect(page.getByRole("button", { name: "Redo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const branch = await shot(page);
  // Delayed old-source results must not resurrect the undone middle stroke.
  await page.waitForTimeout(300);
  expect((await shot(page)).equals(branch)).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
});
test("MIG-WORKER-03 worker loss recovers through bounded local preparation", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      override postMessage() {
        document.documentElement.dataset.workerFaultFired = "true";
        queueMicrotask(() => this.dispatchEvent(new ErrorEvent("error")));
      }
    };
  });
  await open(page);
  const blank = await shot(page);
  await line(page, 300);
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const drawn = await shot(page);
  expect(drawn.equals(blank)).toBe(false);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  expect((await shot(page)).equals(blank)).toBe(true);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(drawn)).toBe(true);
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-worker-fault-fired", "true");
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await expect.poll(async () => (await shot(page)).equals(drawn)).toBe(true);
});
test("MIG-WORKER-05 packed RGBA fallback preserves exact artwork", async ({ browser, baseURL }) => {
  if (!baseURL) throw Error("test base URL missing");
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } });
  const normal = await context.newPage();
  await open(normal);
  await line(normal, 300);
  await line(normal, 420);
  const expected = await shot(normal);
  const fallback = await context.newPage();
  await fallback.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.texStorage2D;
    WebGL2RenderingContext.prototype.texStorage2D = function (
      target,
      levels,
      format,
      width,
      height,
    ) {
      if (format === this.R8 || format === this.RGB8) throw Error("injected-optional-format");
      return original.call(this, target, levels, format, width, height);
    };
  });
  await open(fallback);
  await line(fallback, 300);
  await line(fallback, 420);
  await expect.poll(async () => (await shot(fallback)).equals(expected)).toBe(true);
  await fallback.locator("canvas").focus();
  await fallback.keyboard.down("Space");
  await fallback.mouse.move(400, 400);
  await fallback.mouse.down();
  await fallback.mouse.move(550, 450, { steps: 8 });
  await fallback.keyboard.press("Escape");
  await fallback.mouse.up();
  await fallback.keyboard.up("Space");
  await expect.poll(async () => (await shot(fallback)).equals(expected)).toBe(true);
  await context.close();
});
