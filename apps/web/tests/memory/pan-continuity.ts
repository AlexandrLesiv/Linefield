import type { Page } from "@playwright/test";
// Controlled actual-route observation: inspect three synthetic source centers at each
// submitted visible display, before the non-preserved framebuffer may be discarded.
export async function installPanContinuity(page: Page) {
  await page.addInitScript(() => {
    let dx = 0;
    const seen = new Set([300, 600, 900]);
    document.addEventListener(
      "pointermove",
      (event) => {
        if (document.documentElement.dataset.panContinuity === "true") {
          dx = event.clientX - 1150;
          for (const source of seen)
            if (source + dx < 150 || source + dx > 1100) seen.delete(source);
        }
      },
      true,
    );
    const flush = WebGL2RenderingContext.prototype.flush;
    WebGL2RenderingContext.prototype.flush = function () {
      const d = document.documentElement.dataset;
      if (d.panContinuity === "true" && this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) {
        const canvas = this.canvas;
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas required");
        const rect = canvas.getBoundingClientRect();
        const read = this.getParameter(this.READ_FRAMEBUFFER_BINDING);
        this.bindFramebuffer(this.READ_FRAMEBUFFER, null);
        const pixel = new Uint8Array(4);
        for (const source of [300, 600, 900]) {
          const x = source + dx;
          if (x < 150 || x > 1100) continue;
          this.readPixels(
            Math.floor((x - rect.x) * devicePixelRatio),
            this.drawingBufferHeight - 1 - Math.floor((400 - rect.y) * devicePixelRatio),
            1,
            1,
            this.RGBA,
            this.UNSIGNED_BYTE,
            pixel,
          );
          if ((pixel[0] ?? 255) <= 200) seen.add(source);
          else if (seen.has(source)) {
            d.panLosses = String(Number(d.panLosses ?? 0) + 1);
            d.panLastLoss = JSON.stringify({ source, dx, pixel: Array.from(pixel) });
          }
          d.panSamples = String(Number(d.panSamples ?? 0) + 1);
        }
        this.bindFramebuffer(this.READ_FRAMEBUFFER, read);
      }
      return flush.call(this);
    };
  });
}
export async function armPanContinuity(page: Page) {
  await page.evaluate(() => {
    const d = document.documentElement.dataset;
    d.panContinuity = "true";
    d.panLosses = "0";
    d.panSamples = "0";
    delete d.panLastLoss;
  });
}
export async function panContinuity(page: Page) {
  return page.evaluate(() => {
    const d = document.documentElement.dataset;
    d.panContinuity = "false";
    return { samples: Number(d.panSamples), losses: Number(d.panLosses), last: d.panLastLoss };
  });
}
