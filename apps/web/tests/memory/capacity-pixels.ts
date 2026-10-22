import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function installCapacityPixels(page: Page) {
  await page.addInitScript(() => {
    const flush = WebGL2RenderingContext.prototype.flush;
    WebGL2RenderingContext.prototype.flush = function () {
      const data = document.documentElement.dataset;
      if (data.capacityProbe && this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) {
        const canvas = this.canvas;
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas required");
        const [x, y] = data.capacityProbe.split(":").map(Number);
        if (x === undefined || y === undefined) throw Error("probe required");
        const rect = canvas.getBoundingClientRect();
        const read = this.getParameter(this.READ_FRAMEBUFFER_BINDING);
        this.bindFramebuffer(this.READ_FRAMEBUFFER, null);
        const pixel = new Uint8Array(4);
        this.readPixels(
          Math.round((x - rect.x) * devicePixelRatio),
          this.drawingBufferHeight - 1 - Math.round((y - rect.y) * devicePixelRatio),
          1,
          1,
          this.RGBA,
          this.UNSIGNED_BYTE,
          pixel,
        );
        this.bindFramebuffer(this.READ_FRAMEBUFFER, read);
        const dark = (pixel[0] ?? 255) < 80;
        if (data.capacitySeen === "true" && !dark)
          data.capacityLosses = `${Number(data.capacityLosses ?? 0) + 1}`;
        if (dark) data.capacitySeen = "true";
        data.capacityFrames = `${Number(data.capacityFrames ?? 0) + 1}`;
      }
      return flush.call(this);
    };
  });
}
export async function probeCapacity(page: Page, x: number, y: number) {
  await page.evaluate(
    (point) => {
      const d = document.documentElement.dataset;
      d.capacityProbe = `${point.x}:${point.y}`;
      d.capacitySeen = "false";
      d.capacityFrames = "0";
      d.capacityLosses = "0";
    },
    { x, y },
  );
}
export async function checkCapacityPixels(page: Page) {
  const result = await page.evaluate(() => {
    const d = document.documentElement.dataset;
    const values = {
      frames: Number(d.capacityFrames),
      seen: d.capacitySeen === "true",
      losses: Number(d.capacityLosses),
    };
    delete d.capacityProbe;
    return values;
  });
  expect(result.seen).toBe(true);
  expect(result.frames).toBeGreaterThan(1);
  expect(result.losses).toBe(0);
  return result;
}
