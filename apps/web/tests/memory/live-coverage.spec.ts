import { test, expect } from "@playwright/test";
const clip = { x: 150, y: 220, width: 850, height: 450 };
test("MIG-LIVE-01 immutable live prefix crosses chunks, cancels and retains immediate next stroke", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const blank = await page.screenshot({ clip });
  await page.mouse.move(250, 300);
  await page.mouse.down();
  for (let i = 0; i < 12; i++)
    await page.mouse.move(i % 2 ? 250 : 850, 300 + i * 12, { steps: 32 });
  expect((await page.screenshot({ clip })).equals(blank)).toBe(false);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  for (let i = 0; i < 12; i++)
    await page.mouse.move(i % 2 ? 250 : 850, 300 + i * 12, { steps: 32 });
  await page.mouse.up();
  await page.mouse.move(250, 550);
  await page.mouse.down();
  await page.mouse.move(850, 570, { steps: 16 });
  await page.mouse.up();
  const both = await page.screenshot({ clip });
  expect(both.equals(blank)).toBe(false);
  const undo = page.getByRole("button", { name: "Undo last action", exact: true });
  await undo.click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(both)).toBe(false);
  await undo.click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
  const redo = page.getByRole("button", { name: "Redo last action", exact: true });
  await redo.click();
  await redo.click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(both)).toBe(true);
});
test("MIG-GPU-01 failed GPU fence retries once and retains completed source/history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.clientWaitSync;
    let polls = 0;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (++polls === 35) {
        document.documentElement.dataset.gpuFaultFired = "true";
        return this.WAIT_FAILED;
      }
      return original.call(this, sync, flags, timeout);
    };
  });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  const blank = await page.screenshot({ clip });
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(850, 350, { steps: 16 });
  await page.mouse.up();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  // A backend failure can cancel an unfinished contact; fresh contact must recover.
  await page.mouse.move(250, 500);
  await page.mouse.down();
  await page.mouse.move(850, 550, { steps: 16 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("data-gpu-fault-fired", "true");
});
