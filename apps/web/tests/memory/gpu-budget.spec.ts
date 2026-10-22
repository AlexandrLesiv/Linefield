import { test, expect } from "@playwright/test";
for (const packed of [false, true]) {
  test(`MIG-WORKER-04 maximum backing uses bounded owned targets (${packed ? "RGBA fallback" : "R8/RGB"})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 4096, height: 2048 });
    await page.addInitScript((fallback) => {
      const storage = WebGL2RenderingContext.prototype.texStorage2D,
        bind = WebGL2RenderingContext.prototype.bindTexture,
        remove = WebGL2RenderingContext.prototype.deleteTexture;
      const bytes = new Map<WebGLTexture, number>();
      let texture: WebGLTexture | null = null,
        peak = 0;
      const report = () => {
        const total = [...bytes.values()].reduce((a, b) => a + b, 0);
        peak = Math.max(peak, total);
        document.documentElement.dataset.textureLive = `${total}`;
        document.documentElement.dataset.texturePeak = `${peak}`;
      };
      WebGL2RenderingContext.prototype.bindTexture = function (target, value) {
        if (target === this.TEXTURE_2D) texture = value;
        return bind.call(this, target, value);
      };
      WebGL2RenderingContext.prototype.texStorage2D = function (
        target,
        levels,
        format,
        width,
        height,
      ) {
        if (fallback && (format === this.R8 || format === this.RGB8))
          throw Error("injected-format");
        storage.call(this, target, levels, format, width, height);
        if (texture)
          bytes.set(
            texture,
            width * height * (format === this.R8 ? 1 : format === this.RGB8 ? 3 : 4),
          );
        report();
      };
      WebGL2RenderingContext.prototype.deleteTexture = function (value) {
        if (value) bytes.delete(value);
        remove.call(this, value);
        report();
      };
    }, packed);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    const size = await page.locator("canvas").evaluate((c) => {
      if (!(c instanceof HTMLCanvasElement)) throw Error("canvas missing");
      return { width: c.width, height: c.height };
    });
    expect(size.width * size.height).toBe(8_388_608);
    const bytesPerPixel = packed ? 12 : 9;
    await expect(page.locator("html")).toHaveAttribute(
      "data-texture-live",
      `${8_388_608 * bytesPerPixel}`,
    );
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(900, 500, { steps: 24 });
    await page.mouse.up();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await expect(page.locator("html")).toHaveAttribute(
      "data-texture-live",
      `${1280 * 900 * bytesPerPixel}`,
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-texture-peak",
      `${8_388_608 * bytesPerPixel}`,
    );
    await page.locator(".back").click();
    await expect(page.locator("html")).toHaveAttribute("data-texture-live", "0");
    // These are requested texture payloads, not physical driver allocation or total GPU use.
  });
}
