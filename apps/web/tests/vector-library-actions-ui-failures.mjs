import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createDrawing, back, snapshot, sameDrawing } from "./vector-library-actions-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-ui-failures";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  page.on("dialog", (d) => d.accept());
  const expected = await createDrawing(page, url);
  await back(page);
  const card = page.locator(`[data-id="${expected.id}"]`),
    oldTitle = await card.locator(".drawing-name").textContent();
  await page.route("**/saving/library-worker.js", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
      const originalLibraryCommand = libraryCommand;
      globalThis.libraryCommand = async (message) => {
        if (message.kind === 'library-rename') {
          await new Promise(resolve => globalThis.releaseRenameFailure = resolve);
          throw Error('storage-quota');
        }
        return originalLibraryCommand(message);
      };`,
    });
  });
  const workerCreated = page.waitForEvent("worker", {
    predicate: (worker) => worker.url().includes("saving/worker.js"),
  });
  await card.locator(".more").click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").fill("Rename after failure");
  await dialog.getByRole("button", { name: "Rename", exact: true }).click();
  const libraryWorker = await workerCreated;
  await page.waitForFunction(
    () => document.querySelector("dialog")?.getAttribute("aria-busy") === "true",
  );
  assert.equal(
    await dialog.getByRole("button", { name: "Rename", exact: true }).isDisabled(),
    true,
  );
  assert.equal(await card.locator(".drawing-name").textContent(), oldTitle);
  let released = false;
  for (let i = 0; i < 100; i++) {
    released = await libraryWorker.evaluate(() => {
      if (!globalThis.releaseRenameFailure) return false;
      releaseRenameFailure();
      return true;
    });
    if (released) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert(released);
  await page.unroute("**/saving/library-worker.js");
  await dialog.locator(".error[role=alert]").filter({ hasText: /\S/ }).waitFor();
  assert.equal(await dialog.locator("input").inputValue(), "Rename after failure");
  assert.equal(await card.locator(".drawing-name").textContent(), oldTitle);
  await dialog.getByRole("button", { name: "Rename", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await card.locator(".drawing-name").textContent(), "Rename after failure");
  await expected.frame.evaluate(() => {
    globalThis.savedClose = lab.saving.close;
    lab.saving.close = async () => {
      throw Error("save-failed");
    };
  });
  await card.locator(".more").click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const error = card.locator("[data-action-error][role=alert]");
  await error.waitFor();
  assert.equal(
    await card.locator(".drawing-tile:not([aria-hidden='true']):not([inert])").count(),
    1,
  );
  assert.equal(await card.locator(".undo").count(), 0);
  assert.deepEqual(await snapshot(expected.frame), expected.raw);
  await expected.frame.evaluate(() => {
    lab.saving.close = globalThis.savedClose;
  });
  await card.getByRole("button", { name: "Retry", exact: true }).click();
  await card.locator(".undo").waitFor();
  await card.locator(".undo").click();
  await card.locator(".drawing-tile:not([aria-hidden='true']):not([inert])").click();
  await sameDrawing(page, expected);
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        pendingNotOptimistic: true,
        renameFailureRetainsDialogAndValue: true,
        cachedCloseFailurePreservesData: true,
        retryRestoresExactDrawing: true,
      },
      null,
      2,
    ),
  );
  console.log("UI pending/failure/retry and cached editor close failure preserve drawing");
} finally {
  await browser.close();
}
