import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-pagination";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await clients(page, url);
  const client = await newClient(page),
    ids = [];
  for (let i = 0; i < 130; i++) {
    const document = crypto.randomUUID();
    ids.push(document);
    await call(page, client, "library-create", { document, locale: "en" });
    if (i % 32 === 0) console.log("created gallery document " + (i + 1));
  }
  await kill(page, client);
  await page.goto(url);
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        ".drawing-card .drawing-tile:not([aria-hidden='true']):not([inert])",
      ).length === 128,
  );
  await page.route("**/saving/library-worker.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
      const originalLibraryCommand = libraryCommand;
      globalThis.galleryWrites = 0;
      globalThis.libraryCommand = async (message) => {
        if (['library-remove','library-rename','library-create'].includes(message.kind)) galleryWrites++;
        if (message.kind === 'library-list' && message.offset > 0)
          await new Promise(resolve => globalThis.releaseMore = resolve);
        return originalLibraryCommand(message);
      };`,
    });
  });
  const workerCreated = page.waitForEvent("worker");
  await page.getByRole("button", { name: "Load more drawings", exact: true }).click();
  const worker = await workerCreated;
  for (let i = 0; i < 100 && !(await worker.evaluate(() => !!globalThis.releaseMore)); i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert(await worker.evaluate(() => !!globalThis.releaseMore));
  await page
    .locator(".more")
    .first()
    .evaluate((button) => button.click());
  assert.equal(await page.getByRole("menu").count(), 0);
  assert.equal(await worker.evaluate(() => globalThis.galleryWrites), 0);
  await page.unroute("**/saving/library-worker.js");
  await worker.evaluate(() => releaseMore());
  await page.waitForFunction(() => document.querySelectorAll(".drawing-card").length === 130);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".drawing-card").length === 128);
  const firstCard = page.locator(".drawing-card").first(),
    removed = await firstCard.getAttribute("data-id");
  await firstCard.locator(".more").click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.locator(`[data-id="${removed}"] .undo`).waitFor();
  for (let i = 0; i < 5; i++) {
    const more = page.getByRole("button", { name: "Load more drawings", exact: true });
    if (!(await more.count())) break;
    const previous = await page
      .locator(".drawing-card .drawing-tile:not([aria-hidden='true']):not([inert])")
      .count();
    await more.click();
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll(
          ".drawing-card .drawing-tile:not([aria-hidden='true']):not([inert])",
        ).length > count ||
        ![...document.querySelectorAll("button")].some(
          (button) => button.textContent === "Load more drawings",
        ),
      previous,
    );
  }
  const visible = await page.locator(".drawing-card").evaluateAll((cards) =>
    cards
      .filter((card) => card.querySelector(".drawing-tile:not([aria-hidden='true']):not([inert])"))
      .map((card) => card.dataset.id)
      .sort(),
  );
  assert.deepEqual(visible, ids.filter((id) => id !== removed).sort());
  assert.equal(await page.locator(`[data-id="${removed}"] .undo`).count(), 1);
  await page.locator(`[data-id="${removed}"] .undo`).click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        ".drawing-card .drawing-tile:not([aria-hidden='true']):not([inert])",
      ).length === 130,
  );
  assert.equal(
    new Set(
      await page
        .locator(".drawing-card")
        .evaluateAll((cards) => cards.map((card) => card.dataset.id)),
    ).size,
    130,
  );
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        created: 130,
        visibleAfterDeletion: 129,
        undoTotal: 130,
        noSkippedOrDuplicateIds: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Deletion before More preserves all 129 remaining drawings; Undo restores 130 unique cards",
  );
} finally {
  await browser.close();
}
