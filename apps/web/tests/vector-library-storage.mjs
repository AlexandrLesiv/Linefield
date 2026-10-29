import { negativeCases } from "./vector-library-storage-negative.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  storageServer,
  clients,
  newClient,
  call,
  kill,
} from "./vector-library-storage-helpers.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save06-storage";
await mkdir(output, { recursive: true });
const server = process.env.LINEFIELD_PREVIEW_URL
    ? { url: process.env.LINEFIELD_PREVIEW_URL, close: async () => {} }
    : await storageServer(),
  browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
const uuid = () => crypto.randomUUID();
async function setup() {
  const context = await browser.newContext(),
    page = await context.newPage();
  await clients(page, server.url);
  return { context, page };
}
try {
  {
    const { context, page } = await setup(),
      a = await newClient(page),
      id = uuid(),
      other = uuid();
    assert.equal((await call(page, a, "library-list")).drawings.length, 0);
    const first = await call(page, a, "library-create", { document: id, locale: "en" });
    assert.equal(first.title, "Untitled 1");
    assert.deepEqual(await call(page, a, "library-create", { document: id, locale: "uk" }), first);
    assert.equal(
      (await call(page, a, "library-create", { document: other, locale: "uk" })).title,
      "Без назви 2",
    );
    const list = await call(page, a, "library-list");
    assert.equal(list.drawings.length, 2);
    await call(page, a, "open", { document: id, grant: uuid() });
    const b = await newClient(page);
    await call(page, b, "open", { document: other, grant: uuid() });
    const c = await newClient(page);
    await assert.rejects(call(page, c, "open", { document: id, grant: uuid() }), /in-use/);
    await call(page, b, "close");
    await call(page, a, "close");
    await assert.rejects(
      call(page, c, "open", { document: uuid(), grant: uuid() }),
      /storage-missing/,
    );
    results.push(
      "idempotent durable create, persisted localized ordinals, independent drawing writers, competing writer and unknown ID refusal",
    );
    await context.close();
  }
  {
    const { context, page } = await setup(),
      old = await newClient(page, true);
    await call(page, old, "open", { grant: uuid() });
    const oldIdentity = (await call(page, old, "load")).identity;
    await call(page, old, "close");
    await kill(page, old);
    const a = await newClient(page),
      list = await call(page, a, "library-list", { locale: "en" });
    assert.equal(list.drawings.length, 1);
    assert.equal(list.drawings[0].id, "drawing");
    const opened = await call(page, a, "open", { document: "drawing", grant: uuid() });
    assert.equal(opened.incarnation, oldIdentity.incarnation);
    await call(page, a, "close");
    assert.equal(
      (await call(page, a, "library-create", { document: uuid(), locale: "en" })).title,
      "Untitled 2",
    );
    results.push(
      "legacy singleton discovered in place with original incarnation and no blank replacement",
    );
    await context.close();
  }
  for (const fault of ["locked", "corrupt"]) {
    const { context, page } = await setup(),
      a = await newClient(page),
      ready = uuid(),
      pending = uuid();
    await call(page, a, "library-create", { document: ready, locale: "en" });
    const workerCreated = page.waitForEvent("worker");
    const b = await newClient(page);
    const worker = await workerCreated;
    await worker.evaluate((mode) => {
      const original = validateDrawing;
      validateDrawing = async (...args) => {
        if (mode === "locked") {
          globalThis.pendingHeld = true;
          return new Promise(() => {});
        }
        await original(...args);
        const root = await navigator.storage.getDirectory(),
          d = await root.getDirectoryHandle(drawingLocation(args[0]).directory),
          o = await d.getDirectoryHandle(".opaque");
        for await (const [, h] of o) {
          const file = await h.getFile(),
            head = new Uint8Array(await file.slice(0, 524).arrayBuffer());
          if (head[0] !== 47) continue;
          head[516] ^= 128;
          const w = await h.createWritable({ keepExistingData: true });
          await w.write(head);
          await w.close();
          break;
        }
        throw Error("storage-corrupt");
      };
    }, fault);
    await page.evaluate(
      ({ clientIndex, documentId }) => {
        globalThis.creation = clients[clientIndex]
          .call("library-create", { document: documentId, locale: "en" })
          .catch(() => null);
      },
      { clientIndex: b, documentId: pending },
    );
    if (fault === "locked") {
      for (let i = 0; i < 100; i++) {
        if (await worker.evaluate(() => !!globalThis.pendingHeld)) break;
        await new Promise((r) => setTimeout(r, 10));
      }
    } else await page.evaluate(() => globalThis.creation);
    const list = await call(page, a, "library-list");
    assert.deepEqual(
      list.drawings.map((x) => x.id),
      [ready],
    );
    assert.equal(list.recoveryErrors[0].id, pending);
    await call(page, a, "open", { document: ready, grant: uuid() });
    await call(page, a, "close");
    results.push(`healthy drawing remains listable/openable beside ${fault} pending creation`);
    await context.close();
  }
  await negativeCases(browser, server.url, results);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ results, browser: browser.version() }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
  await server.close();
}
