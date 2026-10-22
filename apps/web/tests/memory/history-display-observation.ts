import type { Page } from "@playwright/test";

export async function observeHistoryDisplay(page: Page, observePixels = true) {
  await page.addInitScript((capturePixels) => {
    const Original = Worker;
    const held: { worker: Worker; data: unknown }[] = [];
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (
            document.documentElement.dataset.holdHistory === "true" &&
            data &&
            typeof data === "object" &&
            "kind" in data &&
            data.kind === "page"
          ) {
            event.stopImmediatePropagation();
            if (held.length >= 32) throw Error("held history reply bound");
            held.push({ worker: this, data });
            document.documentElement.dataset.historyReplies = `${held.length}`;
          }
        });
      }
    };
    document.addEventListener("release-history", () => {
      document.documentElement.dataset.holdHistory = "false";
      for (const { worker, data } of held.splice(0))
        worker.dispatchEvent(new MessageEvent("message", { data }));
    });
    if (!capturePixels) return;
    const clear = WebGL2RenderingContext.prototype.clear;
    const flush = WebGL2RenderingContext.prototype.flush;
    const displayed = new WeakSet<WebGL2RenderingContext>();
    WebGL2RenderingContext.prototype.clear = function (mask) {
      if (this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) displayed.add(this);
      return clear.call(this, mask);
    };
    WebGL2RenderingContext.prototype.flush = function () {
      const dataset = document.documentElement.dataset;
      if (displayed.delete(this) && dataset.historyPixels === "true") {
        const canvas = this.canvas;
        if (!(canvas instanceof HTMLCanvasElement)) throw Error("canvas required");
        const rect = canvas.getBoundingClientRect();
        const draw = this.getParameter(this.DRAW_FRAMEBUFFER_BINDING);
        const read = this.getParameter(this.READ_FRAMEBUFFER_BINDING);
        this.bindFramebuffer(this.FRAMEBUFFER, null);
        const values = [300, 450, 600].map((y) => {
          const pixels = new Uint8Array(16 * 16 * 4);
          const dx = Number(dataset.historyDx ?? 0),
            dy = Number(dataset.historyDy ?? 0);
          this.readPixels(
            Math.round((450 + dx - rect.x) * devicePixelRatio) - 8,
            this.drawingBufferHeight - Math.round((y + dy - rect.y) * devicePixelRatio) - 8,
            16,
            16,
            this.RGBA,
            this.UNSIGNED_BYTE,
            pixels,
          );
          let dark = 0;
          for (let i = 0; i < pixels.length; i += 4) if ((pixels[i] ?? 255) < 200) dark++;
          return dark;
        });
        this.bindFramebuffer(this.DRAW_FRAMEBUFFER, draw);
        this.bindFramebuffer(this.READ_FRAMEBUFFER, read);
        dataset.historyFrames = `${Number(dataset.historyFrames ?? 0) + 1}`;
        dataset.historyMinimum = `${Math.min(Number(dataset.historyMinimum ?? 256), values[0] ?? 0)}`;
        dataset.historyLast = JSON.stringify(values);
      }
      return flush.call(this);
    };
  }, observePixels);
}

export async function releaseHistory(page: Page) {
  await page.evaluate(() => document.dispatchEvent(new Event("release-history")));
}
