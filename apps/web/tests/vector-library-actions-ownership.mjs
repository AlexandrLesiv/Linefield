import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call } from "./vector-library-storage-helpers.mjs";
import { ready, snapshot } from "./vector-library-actions-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-ownership";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } }),
    page = await context.newPage();
  await clients(page, url);
  const client = await newClient(page),
    document = crypto.randomUUID();
  const entry = await call(page, client, "library-create", { document, locale: "en" });
  const editor = await context.newPage();
  editor.on("dialog", (d) => d.accept());
  await editor.goto(new URL(`drawing/${document}`, url).href);
  const frame = await ready(editor),
    box = await frame.locator("canvas").boundingBox();
  assert(box);
  await editor.mouse.move(box.x + 100, box.y + 200);
  await editor.mouse.down();
  await editor.mouse.move(box.x + 350, box.y + 240, { steps: 30 });
  await editor.mouse.up();
  await frame.evaluate(() => lab.saving.flush(true));
  const expected = await snapshot(frame);
  await editor.mouse.move(5, 5);
  await frame.evaluate(() => document.activeElement?.blur());
  await frame.waitForFunction(() => !lab.renderPending());
  const pixels = await frame.locator("canvas").screenshot();
  const removal = { document, incarnation: entry.incarnation, operation: crypto.randomUUID() };
  await assert.rejects(call(page, client, "library-remove", removal), /in-use/);
  assert.equal((await call(page, client, "library-get", { document })).id, document);
  assert.deepEqual(await snapshot(frame), expected);
  await editor.close({ runBeforeUnload: false });
  await page.waitForFunction(
    (id) =>
      navigator.locks
        .query()
        .then((state) => !state.held.some((lock) => lock.name === `linefield:v1:drawing:${id}`)),
    document,
  );
  const deleted = await call(page, client, "library-remove", removal);
  assert.equal(deleted.deletionToken, removal.operation);
  await call(page, client, "library-undo", {
    document,
    incarnation: entry.incarnation,
    operation: crypto.randomUUID(),
    deletionToken: removal.operation,
  });
  const restored = await context.newPage();
  await restored.goto(new URL(`drawing/${document}`, url).href);
  const restoredFrame = await ready(restored);
  assert.deepEqual(await snapshot(restoredFrame), expected);
  await restored.mouse.move(5, 5);
  await restoredFrame.evaluate(() => document.activeElement?.blur());
  await restoredFrame.waitForFunction(() => !lab.renderPending());
  const actual = await restoredFrame.locator("canvas").screenshot();
  if (!actual.equals(pixels)) {
    await writeFile(output + "/expected.png", pixels);
    await writeFile(output + "/actual.png", actual);
  }
  assert.equal(actual.equals(pixels), true, "Restored canvas pixels differ; see evidence PNGs");
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        otherTabDeleteBlocked: true,
        failedOperationRetryAfterOwnerCloses: true,
        rawImagePreserved: true,
      },
      null,
      2,
    ),
  );
  console.log("Other-tab ownership refusal and later delete/undo preserve exact drawing");
} finally {
  await browser.close();
}
