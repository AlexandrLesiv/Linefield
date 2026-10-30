import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { ready } from "./vector-library-actions-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-creation-failure";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await clients(page, url);
  const client = await newClient(page),
    original = crypto.randomUUID();
  await call(page, client, "library-create", { document: original, locale: "en" });
  await kill(page, client);
  await page.route("**/vector-editor/?document=*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><script>parent.postMessage({kind:'linefield-editor-startup',state:'failed'},location.origin)</script>`,
    }),
  );
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".drawing-card").length === 2 && location.pathname === "/",
  );
  const ids = await page
    .locator(".drawing-card")
    .evaluateAll((cards) => cards.map((card) => card.dataset.id));
  assert.equal(new Set(ids).size, 2);
  assert(ids.includes(original));
  assert.equal(await page.locator(".drawing-surface").count(), 0);
  const created = ids.find((id) => id !== original);
  await page.unroute("**/vector-editor/?document=*");
  await page.locator(`[data-id="${created}"] .drawing-tile`).click();
  await ready(page);
  assert(new URL(page.url()).pathname.endsWith(created));
  await page.goBack();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".drawing-card").length === 2);
  assert.deepEqual(
    (
      await page
        .locator(".drawing-card")
        .evaluateAll((cards) => cards.map((card) => card.dataset.id))
    ).sort(),
    ids.sort(),
  );
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { url, startupFailureRetainsCreatedOnce: true, reopenAndReloadPreserveIdentity: true },
      null,
      2,
    ),
  );
  console.log("Startup failure retains created drawing once; reopen and reload preserve identity");
} finally {
  await browser.close();
}
