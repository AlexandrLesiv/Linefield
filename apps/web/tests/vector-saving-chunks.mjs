import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { stage, seal, reopen } from "./vector-saving-chunks-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save07-chunks";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
async function fixture() {
  const context = await browser.newContext(),
    page = await context.newPage();
  await clients(page, url);
  const library = await newClient(page),
    document = crypto.randomUUID();
  await call(page, library, "library-create", { document, locale: "en" });
  await kill(page, library);
  const pending = page.waitForEvent("worker"),
    client = await newClient(page),
    worker = await pending;
  const identity = await call(page, client, "open", { document, grant: crypto.randomUUID() });
  return { context, page, client, worker, identity, document };
}

try {
  {
    const f = await fixture(),
      sizes = [0, 65519, 65520, 65521];
    await stage(f, sizes);
    await seal(f);
    await call(f.page, f.client, "commit");
    await reopen(f);
    const loaded = await call(f.page, f.client, "load");
    assert.equal(loaded.revision, "1");
    assert.equal(loaded.batches.length, 1);
    const checks = await f.page.evaluate(
      async ({ index, operation, lengths }) => {
        for (let stream = 0; stream < lengths.length; stream++) {
          let chunk = 0,
            total = 0,
            last = false;
          while (!last) {
            const p = await clients[index].call("read", { operation, stream, chunk });
            if (p.length !== lengths[stream] || p.bytes.length > 65520) return false;
            for (let i = 0; i < p.bytes.length; i++)
              if (p.bytes[i] !== (total + i + stream) % 251) return false;
            total += p.bytes.length;
            last = p.last;
            chunk++;
          }
          if (total !== lengths[stream]) return false;
        }
        return true;
      },
      { index: f.client, operation: loaded.batches[0].operation, lengths: sizes },
    );
    assert.equal(checks, true);
    results.push("0/65519/65520/65521 byte streams survive exact bounded reload");
    await f.context.close();
  }
  {
    const f = await fixture();
    await stage(f, [65521], true);
    await assert.rejects(seal(f), /storage-digest/);
    await assert.rejects(seal(f), /storage-state/);
    await assert.rejects(call(f.page, f.client, "commit"), /storage-state/);
    await reopen(f);
    assert.equal((await call(f.page, f.client, "load")).revision, "0");
    results.push("bad seal remains poisoned and durable head unchanged");
    await f.context.close();
  }
  {
    const f = await fixture();
    await stage(f, [65521]);
    await reopen(f);
    assert.equal((await call(f.page, f.client, "load")).revision, "0");
    await stage(f, [65521]);
    await seal(f);
    await call(f.page, f.client, "commit");
    results.push(
      "worker death after durable staged chunks preserves old head and fresh retry succeeds",
    );
    await f.context.close();
  }
  {
    const f = await fixture(),
      operation = crypto.randomUUID();
    await stage(f, [65521], false, operation);
    await seal(f);
    await f.worker.evaluate(() => {
      const original = database.commitChunks;
      database.commitChunks = async (...args) => {
        const receipt = await original(...args);
        globalThis.committed = true;
        await new Promise(() => {});
        return receipt;
      };
    });
    await f.page.evaluate((index) => {
      clients[index].call("commit").catch(() => {});
    }, f.client);
    for (let i = 0; i < 100 && !(await f.worker.evaluate(() => !!globalThis.committed)); i++)
      await new Promise((r) => setTimeout(r, 20));
    assert.equal(await f.worker.evaluate(() => !!globalThis.committed), true);
    await reopen(f);
    assert.equal((await call(f.page, f.client, "load")).revision, "1");
    await stage(f, [65521], false, operation);
    await seal(f);
    await call(f.page, f.client, "commit");
    assert.equal((await call(f.page, f.client, "load")).batches.length, 1);
    results.push(
      "lost committed receipt retries identical operation without duplicate publication",
    );
    await f.context.close();
  }
  for (const mutation of ["missing", "trailing", "wrong-last", "digest"]) {
    const f = await fixture();
    await stage(f, [65521]);
    await seal(f);
    await call(f.page, f.client, "commit");
    await f.worker.evaluate((kind) => {
      if (kind === "missing") db.exec("DELETE FROM save_chunks WHERE chunk=1");
      if (kind === "trailing")
        db.exec(
          "INSERT INTO save_chunks SELECT storage,stream,2,1,x'' FROM save_chunks WHERE chunk=1",
        );
      if (kind === "wrong-last") db.exec("UPDATE save_chunks SET last=0 WHERE chunk=1");
      if (kind === "digest")
        db.exec("UPDATE save_chunks SET data=zeroblob(length(data)) WHERE chunk=0");
    }, mutation);
    await assert.rejects(reopen(f), /storage-corrupt/);
    results.push(`${mutation} persisted chunk corruption rejected before restore`);
    await f.context.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify({ candidate: url, browser: browser.version(), results }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
