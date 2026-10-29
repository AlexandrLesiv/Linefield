import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit candidate required");
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
async function hashes(page, document) {
  return page.evaluate(async (id) => {
    const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(`.linefield-drawing-v1-${id}`),
      out = [];
    async function visit(dir, prefix = "") {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === "directory") await visit(handle, prefix + name + "/");
        else {
          const bytes = await (await handle.getFile()).arrayBuffer();
          const digest = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            (n) => n.toString(16).padStart(2, "0"),
          ).join("");
          out.push([prefix + name, bytes.byteLength, digest]);
        }
      }
    }
    await visit(directory);
    return out.sort();
  }, document);
}
try {
  for (const fault of ["incarnation", "semantic"]) {
    const context = await browser.newContext(),
      page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    await page.route("**/vector-editor/**", async (route) => {
      const target = new URL(route.request().url());
      await route.fulfill({
        response: await route.fetch({
          url: new URL(target.pathname + target.search, "http://127.0.0.1:65354/").href,
        }),
      });
    });
    await clients(page, url);
    const library = await newClient(page),
      document = crypto.randomUUID();
    await call(page, library, "library-create", { document, locale: "en" });
    await kill(page, library);
    await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
    await page.waitForFunction(() => !!globalThis.lab);
    await page.evaluate(async () => {
      lab.core.begin_with_style(8, 0x315a93, 0.1, 1.5, 0.8);
      for (let i = 0; i < 30; i++) lab.core.push_precise(100 + i * 3, 200 + i, 0.6);
      lab.core.commit();
      await lab.saving.flush(true);
    });
    const worker = page.workers().find((w) => w.url().includes("saving/worker.js"));
    assert.equal(
      await worker.evaluate(
        () =>
          db.exec({
            sql: "PRAGMA user_version",
            rowMode: "array",
            returnValue: "resultRows",
          })[0][0],
      ),
      1,
    );
    await worker.evaluate(async (kind) => {
      if (kind === "incarnation")
        db.exec({ sql: "UPDATE save_head SET incarnation=?", bind: [crypto.randomUUID()] });
      else {
        const [operation, bytes] = db.exec({
          sql: "SELECT operation,payload FROM save_batches ORDER BY sequence LIMIT 1",
          rowMode: "array",
          returnValue: "resultRows",
        })[0];
        const copy = bytes.slice(),
          view = new DataView(copy.buffer);
        view.setUint32(32, view.getUint32(32, true) + 1, true);
        const digest = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", copy)),
          (n) => n.toString(16).padStart(2, "0"),
        ).join("");
        db.exec({
          sql: "UPDATE save_batches SET payload=?,digest=? WHERE operation=?",
          bind: [copy, digest, operation],
        });
      }
    }, fault);
    await page.evaluate(() => lab.saving.close());
    const before = await hashes(page, document);
    await page.unroute("**/vector-editor/**");
    await clients(page, url);
    const client = await newClient(page);
    await assert.rejects(
      call(page, client, "open", { document, grant: crypto.randomUUID() }),
      fault === "incarnation" ? /storage-conflict/ : /storage-corrupt/,
    );
    assert.deepEqual(await hashes(page, document), before);
    results.push(`${fault} invalid v1 refused with all pool bytes unchanged`);
    await context.close();
  }
  {
    const context = await browser.newContext(),
      page = await context.newPage();
    await clients(page, url);
    const library = await newClient(page),
      document = crypto.randomUUID();
    await call(page, library, "library-create", { document, locale: "en" });
    await kill(page, library);
    await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
    await page.waitForFunction(() => !!globalThis.lab);
    await page.evaluate(async () => {
      lab.core.begin_with_style(8, 0x315a93, 0.1, 1.5, 0.8);
      for (let i = 0; i < 30; i++) lab.core.push_precise(100 + i * 3, 200 + i, 0.6);
      lab.core.commit();
      await lab.saving.flush(true);
      await lab.saving.close();
    });
    const expected = await page.evaluate(() =>
      Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
        lab.core.raw_point(0, i, 0),
        lab.core.raw_point(0, i, 1),
        lab.core.raw_point(0, i, 2),
      ]),
    );
    await clients(page, url);
    const pending = page.waitForEvent("worker"),
      client = await newClient(page),
      worker = await pending;
    await call(page, client, "open", { document, grant: crypto.randomUUID() });
    await worker.evaluate(() => {
      db.exec("BEGIN IMMEDIATE");
      for (let group = 0; group < 3; group++) {
        const storage = crypto.randomUUID();
        for (let chunk = 0; chunk < 700; chunk++)
          db.exec({
            sql: "INSERT INTO save_chunks VALUES(?,?,?,0,zeroblob(65520))",
            bind: [storage, 0, chunk],
          });
      }
      db.exec("COMMIT");
    });
    await kill(page, client);
    await page.waitForFunction(
      (id) =>
        navigator.locks
          .query()
          .then((x) => !x.held.some((l) => l.name === `linefield:v1:drawing:${id}`)),
      document,
    );
    const files = await hashes(page, document);
    assert.ok(files.reduce((n, row) => n + row[1], 0) > 128 * 1024 * 1024);
    const started = Date.now();
    await page.goto(new URL(`drawing/${document}`, url).href);
    const frame = page.frameLocator("iframe");
    await frame.locator("canvas").waitFor({ timeout: 30000 });
    const editor = page.frames().find((f) => f.url().includes("vector-editor"));
    await editor.waitForFunction(() => !!globalThis.lab, null, { timeout: 30000 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 30000);
    const recovered = page.workers().find((w) => w.url().includes("saving/worker.js"));
    assert.equal(
      await recovered.evaluate(
        () =>
          db.exec({
            sql: "SELECT count(*) FROM save_chunks WHERE storage NOT IN (SELECT storage FROM save_batches WHERE storage IS NOT NULL)",
            rowMode: "array",
            returnValue: "resultRows",
          })[0][0],
      ),
      0,
    );
    assert.equal(await editor.evaluate(() => lab.core.count()), 1);
    assert.deepEqual(
      await editor.evaluate(() =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          lab.core.raw_point(0, i, 0),
          lab.core.raw_point(0, i, 1),
          lab.core.raw_point(0, i, 2),
        ]),
      ),
      expected,
    );
    results.push(`actual app opens orphan pool above128MiB in ${elapsed}ms`);
    results.push(
      "three abandoned staging groups above128MiB recover old head and bounded orphan cleanup",
    );
    await context.close();
  }
  const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save07-admission";
  await mkdir(output, { recursive: true });
  await writeFile(output + "/results.json", JSON.stringify({ candidate: url, results }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
