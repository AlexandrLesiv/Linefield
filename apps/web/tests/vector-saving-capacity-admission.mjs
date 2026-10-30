import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen candidate required");
const old = process.env.LINEFIELD_LEGACY_URL ?? "http://127.0.0.1:65355/";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-v2-admission";
await mkdir(output, { recursive: true });
async function hashes(page, documentId) {
  return page.evaluate(async (id) => {
    const dir = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(`.linefield-drawing-v1-${id}`),
      rows = [];
    async function visit(directory, prefix = "") {
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === "directory") await visit(handle, prefix + name + "/");
        else {
          const bytes = await (await handle.getFile()).arrayBuffer();
          const digest = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            (n) => n.toString(16).padStart(2, "0"),
          ).join("");
          rows.push([prefix + name, bytes.byteLength, digest]);
        }
      }
    }
    await visit(dir);
    return rows.sort();
  }, documentId);
}
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
  const mutation = await worker.evaluate(async () => {
    const sql = (query, bind = []) =>
      db.exec({ sql: query, bind, rowMode: "array", returnValue: "resultRows" });
    const version = sql("PRAGMA user_version")[0][0];
    if (version !== 2) throw Error("Expected real v2 donor");
    const [operation, storage, streams] = sql(
      "SELECT operation,storage,streams FROM save_batches ORDER BY sequence LIMIT 1",
    )[0];
    const metadata = sql("SELECT data FROM save_chunks WHERE storage=? AND stream=0 AND chunk=0", [
      storage,
    ])[0][0].slice();
    const view = new DataView(metadata.buffer, metadata.byteOffset, metadata.byteLength);
    view.setUint32(24, view.getUint32(24, true) + 1, true); // Valid digest, impossible extra command.
    sql("UPDATE save_chunks SET data=? WHERE storage=? AND stream=0 AND chunk=0", [
      metadata,
      storage,
    ]);
    const parts = [],
      word = (n) => {
        const b = new Uint8Array(4);
        new DataView(b.buffer).setUint32(0, n, true);
        parts.push(b);
      };
    word(streams);
    for (let stream = 0; stream < streams; stream++) {
      const chunks = sql(
        "SELECT data FROM save_chunks WHERE storage=? AND stream=? ORDER BY chunk",
        [storage, stream],
      ).map((r) => r[0]);
      word(chunks.reduce((n, b) => n + b.length, 0));
      parts.push(...chunks);
    }
    const bytes = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
    let at = 0;
    for (const part of parts) {
      bytes.set(part, at);
      at += part.length;
    }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    sql("UPDATE save_batches SET digest=? WHERE operation=?", [digest, operation]);
    return { version, digest, bytes: bytes.length };
  });
  await page.evaluate(() => lab.saving.close());
  const before = await hashes(page, document);
  await page.unroute("**/vector-editor/**");
  await clients(page, url);
  const client = await newClient(page);
  await assert.rejects(
    call(page, client, "open", { document, grant: crypto.randomUUID() }),
    /storage-corrupt/,
  );
  assert.deepEqual(await hashes(page, document), before);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, old, mutation, allPoolBytesUnchanged: true }, null, 2),
  );
  console.log(JSON.stringify({ mutation, allPoolBytesUnchanged: true }));
} finally {
  await browser.close();
}
