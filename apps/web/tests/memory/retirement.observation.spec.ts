import { traverseDisabled } from "./control-focus.ts";
import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true]) {
  test(`MIG-LIVE-04 held retiring generation fences resize input and replacement allocation (${packed ? "packed" : "R8"})`, async ({
    page,
  }) => {
    if (packed) await forcePackedTargets(page);
    await page.addInitScript(() => {
      const storage = WebGL2RenderingContext.prototype.texStorage2D;
      const remove = WebGL2RenderingContext.prototype.deleteTexture;
      const wait = WebGL2RenderingContext.prototype.clientWaitSync;
      let allocations = 0,
        deletions = 0,
        held = 0;
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
        document.documentElement.dataset.deletions = `${++deletions}`;
        remove.call(this, texture);
      };
      WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
        if (document.documentElement.dataset.holdRetirement === "true") {
          document.documentElement.dataset.held = `${++held}`;
          return this.TIMEOUT_EXPIRED;
        }
        return wait.call(this, sync, flags, timeout);
      };
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
    await complete(page);
    const reset = page.getByRole("button", { name: "Reset canvas rotation", exact: true });
    await expect(reset).toHaveText("15°");
    await page.evaluate(() => {
      document.documentElement.dataset.holdRetirement = "true";
    });
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(400, 350);
    await expect
      .poll(async () => Number(await page.locator("html").getAttribute("data-held")))
      .toBeGreaterThan(0);
    const before = await page
      .locator("html")
      .evaluate((e) => ({ allocations: e.dataset.allocations, deletions: e.dataset.deletions }));
    await clear(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() =>
          window["__linefieldPerfRead"]?.().records.some(
            (r) => r.kind === "input" && r.command === "cancel" && r.outcome === "ok",
          ),
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Undo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(reset).toHaveAttribute("aria-disabled", "true");
    const box = await reset.boundingBox();
    if (!box) throw Error("reset-button");
    await page.mouse.up();
    await traverseDisabled(page, reset);
    await clear(page);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(reset).toHaveText("15°");
    await page.mouse.up();
    await page.mouse.move(500, 400);
    await page.mouse.down();
    await page.mouse.move(700, 450);
    await page.mouse.up();
    const records = await page.evaluate(() => window["__linefieldPerfRead"]?.());
    expect(records?.dropped).toBe(0);
    expect(
      records?.records.filter(
        (r) => r.kind === "input" && r.command === "begin" && r.outcome === "ok",
      ),
    ).toEqual([]);
    expect(
      await page
        .locator("html")
        .evaluate((e) => ({ allocations: e.dataset.allocations, deletions: e.dataset.deletions })),
    ).toEqual(before);
    await page.evaluate(() => {
      document.documentElement.dataset.holdRetirement = "false";
    });
    await expect
      .poll(async () =>
        page.locator("canvas").evaluate((c) => c instanceof HTMLCanvasElement && c.width),
      )
      .toBe(1400);
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await expect(reset).toHaveAttribute("aria-disabled", "false");
    await expect(reset).toHaveText("15°");
    await reset.click();
    await expect(reset).toHaveText("0°");
    await clear(page);
    await page.mouse.move(300, 500);
    await page.mouse.down();
    await page.mouse.move(650, 550);
    await page.mouse.up();
    await complete(page);
    await expect(
      page.getByRole("button", { name: "Undo last action", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
  });
}
