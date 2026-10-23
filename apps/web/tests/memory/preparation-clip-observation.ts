import type { Page } from "@playwright/test";
export async function observeClippedPreparation(page: Page) {
  await page.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message: unknown,
      options?: Transferable[] | StructuredSerializeOptions,
    ) {
      if (
        message &&
        typeof message === "object" &&
        "kind" in message &&
        message.kind === "start" &&
        "parameters" in message &&
        message.parameters instanceof Float64Array &&
        message.parameters[3] === 1
      ) {
        const data = document.documentElement.dataset;
        data.coverageClippedStarts = String(Number(data.coverageClippedStarts ?? 0) + 1);
      }
      post.call(this, message, Array.isArray(options) ? { transfer: options } : options);
    };
  });
}
