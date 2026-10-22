import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import type { Page } from "@playwright/test";
type Observed = Readonly<Record<string, string | number | boolean>>;
async function panFrame(page: Page, accepted?: Observed) {
  let input = accepted,
    published = false;
  await expect
    .poll(async () => {
      const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!snapshot || snapshot.dropped) throw Error("invalid observation");
      let shown = false;
      for (const record of snapshot.records) {
        if (record.kind === "input" && ["ok", "noop"].includes(`${record.outcome}`)) input = record;
        const matching =
          input &&
          ["owner", "session", "content", "mapping"].every((key) => record[key] === input?.[key]);
        if (
          matching &&
          record.kind === "receipt-publish" &&
          record.receiptContent === input?.content &&
          record.receiptMapping === input?.mapping
        )
          published = true;
        if (
          matching &&
          record.kind === "overlay-submit" &&
          (!accepted || (published && record.complete))
        )
          shown = true;
      }
      return shown;
    })
    .toBe(true);
  return input;
}
test("MIG-WORKER-14 integer pan preserves settled AA before and after current receipt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      private held: (() => void)[] = [];
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        document.addEventListener("release-preparation", () => {
          for (const send of this.held) send();
          this.held = [];
        });
      }
      override postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = [],
      ) {
        const send = () => {
          if (Array.isArray(options)) super.postMessage(message, options);
          else super.postMessage(message, options);
        };
        if (
          document.documentElement.dataset.holdPreparation === "true" &&
          message &&
          typeof message === "object" &&
          "kind" in message &&
          message.kind === "start"
        ) {
          this.held.push(send);
          document.documentElement.dataset.heldPreparation = "true";
        } else send();
      }
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  for (const [x, y, endX, endY] of [
    [300, 300, 600, 450],
    [600, 300, 300, 450],
  ]) {
    if (x === undefined || y === undefined || endX === undefined || endY === undefined)
      throw Error("stroke");
    await clear(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 24 });
    await page.mouse.up();
    await complete(page);
  }
  const clip = { x: 250, y: 250, width: 450, height: 250 };
  const settled = await page.screenshot({ clip });
  await page.evaluate(() => {
    document.documentElement.dataset.holdPreparation = "true";
  });
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 600);
  await page.mouse.down();
  await page.mouse.move(550, 650);
  const accepted = await panFrame(page);
  await expect(page.locator("html")).toHaveAttribute("data-held-preparation", "true");
  const shifted = { ...clip, x: clip.x + 150, y: clip.y + 50 };
  const provisional = await page.screenshot({ clip: shifted });
  await page.evaluate(() => {
    document.documentElement.dataset.holdPreparation = "false";
    document.dispatchEvent(new Event("release-preparation"));
  });
  await panFrame(page, accepted);
  const rebuilt = await page.screenshot({ clip: shifted });
  await clear(page);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await complete(page);
  const ended = await page.screenshot({ clip: shifted });
  await test.info().attach("settled", { body: settled, contentType: "image/png" });
  await test.info().attach("provisional-pan", { body: provisional, contentType: "image/png" });
  await test.info().attach("rebuilt-pan", { body: rebuilt, contentType: "image/png" });
  await test.info().attach("ended-pan", { body: ended, contentType: "image/png" });
  expect(provisional.equals(settled), "integer provisional copy").toBe(true);
  expect(rebuilt.equals(settled), "integer current receipt").toBe(true);
  expect(ended.equals(settled), "integer committed pan").toBe(true);
});
