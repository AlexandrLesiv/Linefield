import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { ready } from "./vector-library-actions-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-creation";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const variant of [
    { name: "desktop", viewport: { width: 1200, height: 1000 }, reducedMotion: "no-preference" },
    { name: "mobile", viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" },
    {
      name: "queued-back",
      viewport: { width: 1200, height: 1000 },
      reducedMotion: "no-preference",
    },
    { name: "reduced", viewport: { width: 1200, height: 1000 }, reducedMotion: "reduce" },
  ]) {
    const context = await browser.newContext(variant);
    const page = await context.newPage();
    await clients(page, url);
    const client = await newClient(page);
    for (let i = 0; i < 2; i++)
      await call(page, client, "library-create", { document: crypto.randomUUID(), locale: "en" });
    await kill(page, client);
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      globalThis.heldShells = [];
      Element.prototype.animate = function (frames, options) {
        const animation = animate.call(this, frames, options);
        if (this.matches(".drawing-surface") && Array.isArray(frames) && "left" in frames[0]) {
          animation.pause();
          animation.currentTime = 0;
          heldShells.push({
            animation,
            frames,
            ids: [...document.querySelectorAll(".drawing-card")].map((card) => card.dataset.id),
          });
        }
        return animation;
      };
    });
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll(".drawing-card").length === 2);
    const before = await page
      .locator(".drawing-card")
      .evaluateAll((cards) => cards.map((card) => card.dataset.id));
    const trigger = page.locator(variant.name === "mobile" ? ".mobile-create" : ".new-tile");
    const source = await trigger.boundingBox();
    await trigger.click();
    await page.waitForFunction(() => heldShells.length === 1);
    const opening = await page.evaluate(() => ({
      ids: heldShells[0].ids,
      frame: heldShells[0].frames[0],
      duration: heldShells[0].animation.effect.getTiming().duration,
    }));
    assert.equal(opening.duration, variant.name === "reduced" ? 0 : 360);
    assert.deepEqual(opening.ids, before, "No new card before expansion starts");
    assert.equal(parseFloat(opening.frame.left), source.x);
    assert.equal(parseFloat(opening.frame.top), source.y);
    await page.evaluate(
      () =>
        (heldShells[0].animation.currentTime =
          Number(heldShells[0].animation.effect.getTiming().duration) / 2),
    );
    await page.waitForTimeout(50);
    assert.deepEqual(
      await page
        .locator(".drawing-card")
        .evaluateAll((cards) => cards.map((card) => card.dataset.id)),
      before,
      "Gallery stays stable while expansion held",
    );
    const documentId = new URL(page.url()).pathname.split("/").at(-1);
    if (variant.name === "queued-back") await page.goBack();
    await page.evaluate(() => heldShells[0].animation.finish());
    await page.waitForFunction(() => document.querySelectorAll(".drawing-card").length === 3);
    assert.equal(await page.locator(`[data-id="${documentId}"]`).count(), 1);
    if (variant.name !== "queued-back") await ready(page);
    const target = await page.locator(`[data-id="${documentId}"] .drawing-tile`).boundingBox();
    if (variant.name !== "queued-back") await page.goBack();
    await page.waitForFunction(() => heldShells.length === 2);
    const closing = await page.evaluate(() => heldShells[1].frames.at(-1));
    for (const [property, value] of [
      ["left", target.x],
      ["top", target.y],
      ["width", target.width],
      ["height", target.height],
    ])
      assert(
        Math.abs(parseFloat(closing[property]) - value) < 0.1,
        `Back targets new drawing ${property}`,
      );
    await page.evaluate(() => heldShells[1].animation.finish());
    await page.locator(".drawing-surface").waitFor({ state: "detached" });
    assert.equal(await page.locator(".drawing-card").count(), 3);
    results.push({
      variant: variant.name,
      stableOpening: true,
      singleInsertion: true,
      correctReturnTarget: true,
    });
    console.log(variant.name + " creation and return passed");
    await context.close();
  }
  await writeFile(output + "/results.json", JSON.stringify({ url, results }, null, 2));
} finally {
  await browser.close();
}
