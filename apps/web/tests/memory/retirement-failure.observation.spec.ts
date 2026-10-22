import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
test("MIG-LIVE-06 failed terminal fence retains its allocation charge without a hot loop and explicit Retry recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawArraysInstanced;
    const fence = WebGL2RenderingContext.prototype.fenceSync;
    const storage = WebGL2RenderingContext.prototype.texStorage2D;
    const remove = WebGL2RenderingContext.prototype.deleteTexture;
    let allocations = 0,
      deletions = 0,
      failures = 0;
    WebGL2RenderingContext.prototype.texStorage2D = function (
      target,
      levels,
      format,
      width,
      height,
    ) {
      const value = storage.call(this, target, levels, format, width, height);
      document.documentElement.dataset.allocations = `${++allocations}`;
      return value;
    };
    WebGL2RenderingContext.prototype.deleteTexture = function (texture) {
      if (failures && document.documentElement.dataset.retireFenceCreated !== "true")
        document.documentElement.dataset.unprovenDelete = "true";
      document.documentElement.dataset.deletions = `${++deletions}`;
      remove.call(this, texture);
    };
    WebGL2RenderingContext.prototype.drawArraysInstanced = function (
      mode,
      first,
      count,
      instances,
    ) {
      draw.call(this, mode, first, count, instances);
      if (document.documentElement.dataset.failDraw === "true") {
        document.documentElement.dataset.failDraw = "false";
        throw Error("injected-submitted-draw");
      }
    };
    WebGL2RenderingContext.prototype.fenceSync = function (condition, flags) {
      if (document.documentElement.dataset.failFence === "true") {
        document.documentElement.dataset.fenceFailures = `${++failures}`;
        return null;
      }
      const result = fence.call(this, condition, flags);
      if (result && failures) document.documentElement.dataset.retireFenceCreated = "true";
      return result;
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 12 });
  await page.mouse.up();
  await complete(page);
  const clip = { x: 200, y: 220, width: 750, height: 450 };
  const completed = await page.screenshot({ clip });
  const before = await page
    .locator("html")
    .evaluate((e) => ({ allocations: e.dataset.allocations, deletions: e.dataset.deletions }));
  await page.evaluate(() => {
    document.documentElement.dataset.failDraw = "true";
    document.documentElement.dataset.failFence = "true";
  });
  await page.mouse.move(300, 500);
  await page.mouse.down();
  await page.mouse.move(700, 550);
  await page.mouse.up();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "resourceUnavailable");
  await expect(page.locator("html")).toHaveAttribute("data-fence-failures", "1");
  await page.evaluate(async () => {
    for (let i = 0; i < 4; i++)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.locator("html")).toHaveAttribute("data-fence-failures", "1");
  expect(
    await page
      .locator("html")
      .evaluate((e) => ({ allocations: e.dataset.allocations, deletions: e.dataset.deletions })),
  ).toEqual(before);
  await page.evaluate(() => {
    document.documentElement.dataset.failFence = "false";
  });
  await page.getByRole("button", { name: "Retry display", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await expect.poll(async () => (await page.screenshot({ clip })).equals(completed)).toBe(true);
  await expect(page.locator("html")).not.toHaveAttribute("data-unproven-delete", "true");
  await clear(page);
  await page.mouse.move(300, 600);
  await page.mouse.down();
  await page.mouse.move(700, 620);
  await page.mouse.up();
  await complete(page);
  expect((await page.screenshot({ clip })).equals(completed)).toBe(false);
});
