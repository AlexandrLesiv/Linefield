import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { drawingDigest } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL,
  old = process.env.LINEFIELD_LEGACY_URL ?? "http://127.0.0.1:65352/";
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-legacy";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  page.on("dialog", (d) => d.accept());
  await page.route("**/vector-editor/**", async (route) => {
    const target = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({ url: new URL(target.pathname + target.search, old).href }),
    });
  });
  await page.goto(new URL("vector-editor/", url).href);
  await page.waitForFunction(() => !!globalThis.lab);
  await page.evaluate(async () => {
    lab.core.begin_with_style(8, 0x315a93, 0.1, 1.5, 0.8);
    for (let i = 0; i < 30; i++) lab.core.push_precise(100 + i * 3, 200 + i, 0.6);
    lab.core.commit();
    await lab.saving.flush(true);
  });
  const expected = await drawingDigest(page);
  await page.evaluate(() => lab.saving.close());
  await page.unroute("**/vector-editor/**");
  await clients(page, url);
  let client = await newClient(page);
  const entry = (await call(page, client, "library-list")).drawings.find((d) => d.id === "drawing");
  assert(entry);
  const removal = {
    document: "drawing",
    incarnation: entry.incarnation,
    operation: crypto.randomUUID(),
  };
  await call(page, client, "library-remove", removal);
  await kill(page, client);
  for (let i = 0; i < 3; i++) {
    client = await newClient(page);
    assert.equal(
      (await call(page, client, "library-list")).drawings.some((d) => d.id === "drawing"),
      false,
    );
    assert.equal(await call(page, client, "library-get", { document: "drawing" }), null);
    await assert.rejects(
      call(page, client, "open", { document: "drawing", grant: crypto.randomUUID() }),
      /storage-(deleted|missing)/,
    );
    await kill(page, client);
  }
  client = await newClient(page);
  await call(page, client, "library-undo", {
    document: "drawing",
    incarnation: entry.incarnation,
    operation: crypto.randomUUID(),
    deletionToken: removal.operation,
  });
  await kill(page, client);
  await page.goto(new URL("vector-editor/?document=drawing", url).href);
  await page.waitForFunction(() => !!globalThis.lab);
  assert.deepEqual(await drawingDigest(page), expected);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, old, legacyNotResurrected: true, undoRestoresExactRaw: true }, null, 2),
  );
  console.log("Deleted legacy drawing does not reappear and Undo preserves exact raw data");
} finally {
  await browser.close();
}
