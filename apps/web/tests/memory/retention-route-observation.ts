import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export type RecordValue = Readonly<Record<string, string | number | boolean>>;
export async function installRetentionObservation(page: Page) {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame;
    const held = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = (callback) => {
      const id = raf((time) => {
        if (document.documentElement.dataset.holdRetentionFrames === "true") {
          held.set(id, callback);
          document.documentElement.dataset.retentionFrames = String(held.size);
        } else callback(time);
      });
      return id;
    };
    const cancel = window.cancelAnimationFrame;
    window.cancelAnimationFrame = (id) => {
      held.delete(id);
      cancel(id);
    };
    window.addEventListener("release-retention-frames", () => {
      document.documentElement.dataset.holdRetentionFrames = "false";
      for (const callback of held.values()) raf(callback);
      held.clear();
    });
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message: unknown,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      if (
        message &&
        typeof message === "object" &&
        "kind" in message &&
        message.kind === "start" &&
        "parameters" in message &&
        message.parameters instanceof Float64Array
      ) {
        const element = document.documentElement;
        const details = (element.dataset.retentionDetails ?? "").split(",").filter(Boolean);
        details.push(String(message.parameters[2]));
        element.dataset.retentionDetails = details.slice(-64).join(",");
      }
      post.call(this, message, Array.isArray(options) ? { transfer: options } : options);
    };
  });
}
export async function records(page: Page) {
  const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  expect(snapshot?.dropped).toBe(0);
  return snapshot?.records ?? [];
}
// Generated control events deliberately remove Playwright actionability/RAF waits from this
// controlled scheduling experiment; actual host handlers and canonical commands still run.
export async function control(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw Error("button");
    if (button.disabled || button.getAttribute("aria-disabled") === "true")
      throw Error("controlled button is unavailable");
    button.click();
  });
}
export async function settleFrame(page: Page, log: RecordValue[], budget = 120) {
  for (let i = 0; i < budget; i++) {
    await page.clock.runFor(1);
    await page.waitForTimeout(2);
    log.push(...(await records(page)));
    const input = log.findLast((r) => r.kind === "input" && r.outcome === "ok");
    if (
      input &&
      log.some(
        (r) =>
          r.kind === "receipt-ack" &&
          ["owner", "session", "content", "mapping"].every((key) => r[key] === input[key]),
      )
    )
      return;
  }
  throw Error("actual frame did not settle inside controlled virtual-time budget");
}
export async function stroke(page: Page, y: number) {
  await page.mouse.move(430, y);
  await page.mouse.down();
  await page.mouse.move(650, y, { steps: 4 });
  await page.mouse.up();
}
