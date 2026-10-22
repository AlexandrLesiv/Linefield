import type { Page } from "@playwright/test";

// Functional readback only: this synchronizes the GPU and must not be used for timings.
export async function observeActiveDisplay(page: Page) {
  await page.addInitScript(() => {
    const displayed = new WeakSet<WebGL2RenderingContext>();
    const clear = WebGL2RenderingContext.prototype.clear;
    const flush = WebGL2RenderingContext.prototype.flush;
    const seen = new Set<string>();
    const visiblePoints = new Set<string>();
    const losses: { frame: number; point: readonly number[] }[] = [];
    let frames = 0;
    WebGL2RenderingContext.prototype.clear = function (mask) {
      if (this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) displayed.add(this);
      return clear.call(this, mask);
    };
    WebGL2RenderingContext.prototype.flush = function () {
      if (displayed.delete(this) && document.documentElement.dataset.activeProbe === "true") {
        const canvas = this.canvas;
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas");
        const rect = canvas.getBoundingClientRect();
        const draw: unknown = this.getParameter(this.DRAW_FRAMEBUFFER_BINDING);
        const read: unknown = this.getParameter(this.READ_FRAMEBUFFER_BINDING);
        if (draw !== null && !(draw instanceof WebGLFramebuffer)) throw Error("draw target");
        if (read !== null && !(read instanceof WebGLFramebuffer)) throw Error("read target");
        this.bindFramebuffer(this.FRAMEBUFFER, null);
        const pixels = new Uint8Array(8 * 8 * 4);
        const points: readonly (readonly number[])[] = JSON.parse(
          document.documentElement.dataset.activeProbePoints ?? "[]",
        );
        if (++frames > 1000 || points.length > 16 || losses.length > 1000)
          throw Error("display observation bound");
        for (const point of points) {
          const [x, y] = point;
          if (x === undefined || y === undefined) throw Error("probe point");
          this.readPixels(
            Math.round((x - rect.x) * devicePixelRatio) - 4,
            this.drawingBufferHeight - Math.round((y - rect.y) * devicePixelRatio) - 4,
            8,
            8,
            this.RGBA,
            this.UNSIGNED_BYTE,
            pixels,
          );
          let visible = 0;
          for (let i = 0; i < pixels.length; i += 4) if ((pixels[i] ?? 255) < 200) visible++;
          const key = point.join(":");
          if (visible > 60) {
            seen.add(key);
            visiblePoints.add(key);
            if (visiblePoints.size > 64) throw Error("visible point bound");
          } else if (seen.has(key) && visible === 0) losses.push({ frame: frames, point });
        }
        for (const key of seen)
          if (!points.some((point) => point.join(":") === key)) seen.delete(key);
        document.documentElement.dataset.activeProbeResult = JSON.stringify({
          frames,
          losses,
          visiblePoints: visiblePoints.size,
        });
        this.bindFramebuffer(this.DRAW_FRAMEBUFFER, draw);
        this.bindFramebuffer(this.READ_FRAMEBUFFER, read);
      }
      return flush.call(this);
    };
  });
}
