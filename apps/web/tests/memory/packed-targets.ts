import type { Page } from "@playwright/test";
export async function forcePackedTargets(page: Page) {
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
}
