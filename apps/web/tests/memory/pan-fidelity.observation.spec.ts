import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import type { Page } from "@playwright/test";
type Observed = Readonly<Record<string, string | number | boolean>>;
async function panFrame(page: Page, records: Observed[], accepted?: Observed) {
  let input = accepted,
    rebuilt = records.some(
      (r) =>
        accepted &&
        ["owner", "session", "content", "mapping"].every((key) => r[key] === accepted[key]) &&
        (r.kind === "receipt-publish" ||
          (r.kind === "coverage-transition" && r.phase === "view-consume")),
    );
  await expect
    .poll(async () => {
      const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!snapshot || snapshot.dropped) throw Error("invalid observation");
      records.push(...snapshot.records);
      let shown = false;
      for (const record of snapshot.records) {
        if (record.kind === "input" && ["ok", "noop"].includes(`${record.outcome}`)) input = record;
        const matching =
          input &&
          ["owner", "session", "content", "mapping"].every((key) => record[key] === input?.[key]);
        if (
          matching &&
          (record.kind === "receipt-publish" ||
            (record.kind === "coverage-transition" && record.phase === "view-consume"))
        )
          rebuilt = true;
        if (
          matching &&
          record.kind === "overlay-submit" &&
          (!accepted || (rebuilt && !record.complete))
        )
          shown = true;
      }
      expect(
        snapshot.records.some((r) => r.kind === "receipt-ack" && r.mapping === input?.mapping),
      ).toBe(false);
      return shown;
    })
    .toBe(true);
  return input;
}
test("MIG-WORKER-14 integer pan preserves settled AA through held reconstruction and ended current receipt", async ({
  page,
}) => {
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
  const records: Observed[] = [];
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 600);
  await page.mouse.down();
  await page.mouse.move(550, 650);
  const accepted = await panFrame(page, records);
  const shifted = { ...clip, x: clip.x + 150, y: clip.y + 50 };
  const provisional = await page.screenshot({ clip: shifted });
  await panFrame(page, records, accepted);
  const rebuilt = await page.screenshot({ clip: shifted });
  await clear(page);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await complete(page);
  const ended = await page.screenshot({ clip: shifted });
  await test.info().attach("settled", { body: settled, contentType: "image/png" });
  await test.info().attach("transformed-pan", { body: provisional, contentType: "image/png" });
  await test.info().attach("validated-held-pan", { body: rebuilt, contentType: "image/png" });
  await test.info().attach("ended-pan", { body: ended, contentType: "image/png" });
  await test.info().attach("gesture-transitions", {
    body: JSON.stringify(records),
    contentType: "application/json",
  });
  expect(provisional.equals(settled), "integer provisional copy").toBe(true);
  expect(rebuilt.equals(settled), "integer validated held reconstruction").toBe(true);
  expect(ended.equals(settled), "integer committed pan").toBe(true);
});
