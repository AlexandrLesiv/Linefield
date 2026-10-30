import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { drawingDigest } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL,
  old = process.env.LINEFIELD_LEGACY_URL ?? "http://127.0.0.1:65370/";
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-catalog";
await mkdir(output, { recursive: true });
async function hashes(page, folder) {
  return page.evaluate(async (directoryName) => {
    const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(directoryName),
      rows = [];
    async function visit(dir, prefix = "") {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === "directory") await visit(handle, prefix + name + "/");
        else {
          const bytes = await (await handle.getFile()).arrayBuffer();
          rows.push([
            prefix + name,
            bytes.byteLength,
            Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (n) =>
              n.toString(16).padStart(2, "0"),
            ).join(""),
          ]);
        }
      }
    }
    await visit(directory);
    return rows.sort();
  }, folder);
}
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const malformed of [false, true]) {
    const context = await browser.newContext(),
      page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    await page.route("**/vector-editor/**", async (route) => {
      const target = new URL(route.request().url());
      await route.fulfill({
        response: await route.fetch({ url: new URL(target.pathname + target.search, old).href }),
      });
    });
    await clients(page, url);
    const first = await newClient(page),
      document = crypto.randomUUID();
    await call(page, first, "library-create", { document, locale: "uk" });
    await kill(page, first);
    await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
    await page.waitForFunction(() => !!globalThis.lab);
    await page.evaluate(async () => {
      lab.core.begin_with_style(8, 0x315a93, 0.1, 1.5, 0.8);
      for (let i = 0; i < 30; i++) lab.core.push_precise(100 + i * 3, 200 + i, 0.6);
      lab.core.commit();
      await lab.saving.flush(true);
    });
    const expected = await drawingDigest(page),
      worker = page.workers().find((w) => w.url().includes("saving/worker.js"));
    const originalVersion = await worker.evaluate(() =>
      withCatalog(false, (sql) => sql("PRAGMA user_version")[0][0]),
    );
    assert.equal(originalVersion, 1);
    const savedEntry = await worker.evaluate((id) => catalogGet(id), document);
    if (malformed)
      await worker.evaluate(() =>
        withCatalog(false, (sql) => sql("CREATE TABLE unexpected(value TEXT) STRICT")),
      );
    await page.evaluate(() => lab.saving.close());
    const drawingBefore = await hashes(page, `.linefield-drawing-v1-${document}`),
      catalogBefore = await hashes(page, ".linefield-catalog-v1");
    await page.unroute("**/vector-editor/**");
    await clients(page, url);
    const waiting = page.waitForEvent("worker"),
      client = await newClient(page),
      freshWorker = await waiting;
    if (malformed) {
      await assert.rejects(call(page, client, "library-list"), /storage-catalog-corrupt/);
      assert.deepEqual(await hashes(page, ".linefield-catalog-v1"), catalogBefore);
      results.push(
        "Malformed catalog v1 refused before migration with all catalog files unchanged",
      );
    } else {
      const list = await call(page, client, "library-list");
      assert.deepEqual(list.drawings, [savedEntry]);
      assert.equal(
        await freshWorker.evaluate(() =>
          withCatalog(false, (sql) => sql("PRAGMA user_version")[0][0]),
        ),
        2,
      );
      assert.deepEqual(await hashes(page, `.linefield-drawing-v1-${document}`), drawingBefore);
      await kill(page, client);
      await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
      await page.waitForFunction(() => !!globalThis.lab);
      assert.deepEqual(await drawingDigest(page), expected);
      results.push(
        "Real catalog v1 migrated to v2 preserving metadata, drawing files and exact raw data",
      );
    }
    await context.close();
  }
  await writeFile(output + "/results.json", JSON.stringify({ url, old, results }, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
