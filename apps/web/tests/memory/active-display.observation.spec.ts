import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { observeActiveDisplay } from "./active-display-observation.ts";

test.use({ viewport: { width: 1750, height: 1000 }, deviceScaleFactor: 2 });
for (const packed of [false, true]) {
  test(`MIG-LIVE-03 wide minified rotated stroke retains accepted regions on every active display (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    await observeActiveDisplay(page);
    if (packed)
      await page.addInitScript(() => {
        const storage = WebGL2RenderingContext.prototype.texStorage2D;
        WebGL2RenderingContext.prototype.texStorage2D = function (
          target,
          levels,
          format,
          width,
          height,
        ) {
          if (format === this.R8 || format === this.RGB8) throw Error("injected-format");
          return storage.call(this, target, levels, format, width, height);
        };
      });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.locator("input[type=range]").focus();
    await page.keyboard.press("End");
    for (let i = 0; i < 19; i++) await page.keyboard.press("ArrowLeft");
    await expect(page.locator("input[type=range]")).toHaveValue("493");
    for (let i = 0; i < 12; i++)
      await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
    await clear(page);
    await page.mouse.move(900, 550);
    await page.mouse.wheel(0, 100000);
    await expect(page.locator(".canvas-footer")).toContainText("5%");
    await complete(page);
    await page.mouse.move(250, 350);
    await page.mouse.down();
    await complete(page, false, true);
    await page.evaluate(() => {
      document.documentElement.dataset.activeProbe = "true";
    });
    const points: number[][] = [];
    let sourceCount = 0;
    const published = new Set<string>();
    let stableThrough = 0,
      provisional = 0;
    for (let i = 1; i <= 256; i++) {
      const x = 900 + Math.sin(i * 0.055) * 600;
      const y = 600 + Math.sin(i * 0.11) * 300;
      await page.mouse.move(x, y);
      if (i % 8 === 0) {
        points.push([x, y]);
        if (points.length > 16) points.shift();
        await page.evaluate((current) => {
          document.documentElement.dataset.activeProbePoints = JSON.stringify(current);
        }, points);
      }
      if (i % 16 === 0) {
        const observation = await page.evaluate(() => window["__linefieldPerfRead"]?.());
        if (!observation || observation.dropped) throw Error("invalid observation ring");
        for (const record of observation.records) {
          if (record.kind === "stroke-count" && record.active)
            sourceCount = Math.max(sourceCount, Number(record.count));
          if (record.kind === "live-tail" && record.phase === "publish") {
            published.add(`${record.count}`);
            if (!record.exact) provisional++;
          }
          if (record.kind === "live-tail" && record.phase === "stable")
            stableThrough = Math.max(stableThrough, Number(record.through));
        }
      }
    }
    const result: { frames: number; losses: unknown[]; visiblePoints: number } = JSON.parse(
      (await page.locator("html").getAttribute("data-active-probe-result")) ?? "{}",
    );
    await info.attach("active-display", {
      body: JSON.stringify({ ...result, published: [...published], stableThrough, provisional }),
      contentType: "application/json",
    });
    await page.screenshot({ path: info.outputPath("active.png") });
    await page.evaluate(() => {
      document.documentElement.dataset.activeProbe = "false";
    });
    await clear(page);
    await page.mouse.up();
    await complete(page);
    await page.screenshot({ path: info.outputPath("completed.png") });
    expect(result.frames).toBeGreaterThan(100);
    expect(sourceCount).toBe(257);
    expect(published.size, "front generations progress during continuous input").toBeGreaterThan(2);
    expect(stableThrough, "canonical prefix also receives service").toBeGreaterThanOrEqual(128);
    expect(provisional, "a frozen capture finishes after further accepted input").toBeGreaterThan(
      0,
    );
    expect(result.visiblePoints).toBeGreaterThanOrEqual(24);
    expect(result.losses, "previously visible accepted sample regions cannot disappear").toEqual(
      [],
    );
  });
}
