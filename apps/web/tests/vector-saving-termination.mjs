import assert from "node:assert/strict";
import { seed, digest, savingWorker, waitMarker } from "./vector-saving-recovery-helpers.mjs";
export async function holdCommit(worker, phase) {
  await worker.evaluate((faultPhase) => {
    const original = database.commit;
    database.commit = async (m, payload, hash) => {
      if (faultPhase === "after") await original(m, payload, hash);
      else {
        db.exec("BEGIN IMMEDIATE");
        db.exec({
          sql: "INSERT INTO save_batches(operation,base,result,digest,payload) VALUES(?,?,?,?,?)",
          bind: [m.operation, m.base, m.result, hash, payload],
        });
        db.exec({ sql: "UPDATE save_head SET revision=? WHERE singleton=1", bind: [m.result] });
        const row = db.exec({
          sql: "SELECT revision FROM save_head WHERE singleton=1",
          rowMode: "array",
          returnValue: "resultRows",
        })[0];
        if (row[0] !== m.result) throw Error("fixture update missing");
      }
      globalThis.commitHeld = true;
      return new Promise(() => {});
    };
  }, phase);
}
export async function storedHead(frame) {
  return frame.evaluate(async () => {
    const worker = new Worker("/vector-editor/saving/worker.js?sqlite3.dir=/vector-editor/saving");
    let serial = 0;
    const call = (kind, fields = {}) =>
      new Promise((resolve, reject) => {
        const id = ++serial;
        worker.onmessage = ({ data }) => {
          if (data.id === id) {
            if (data.error) reject(Error(data.error));
            else resolve(data.value);
          }
        };
        worker.onerror = (e) => reject(Error(e.message));
        worker.postMessage({ ...fields, id, kind });
      });
    try {
      await call("open", { grant: crypto.randomUUID() });
      const loaded = await call("load");
      await call("close");
      return { revision: loaded.revision, rows: loaded.rows.map((row) => row.slice(0, 4)) };
    } finally {
      worker.terminate();
    }
  });
}
export async function terminationCases(browser, url, results) {
  for (const phase of ["before", "after"]) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    let page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    const open = async () => {
      await page.goto(new URL("drawing/preview-new", url).href);
      await page.locator("iframe").waitFor();
      const f = page.frames().find((x) => x.url().includes("/vector-editor/"));
      await f.waitForFunction(() => !!window.lab, { timeout: 45000 });
      return f;
    };
    let f = await open();
    await seed(f);
    await f.evaluate(() => lab.saving.flush(true));
    const old = await digest(f);
    const worker = savingWorker(page);
    await holdCommit(worker, phase);
    await seed(f, 20);
    const next = await digest(f);
    await f.evaluate(() => {
      void lab.saving.flush(true).catch(() => {});
    });
    await waitMarker(worker);
    await page.close();
    page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    f = await open();
    assert.equal(await digest(f), phase === "before" ? old : next);
    results.push({
      case: `actual page close ${phase} COMMIT reopens exact ${phase === "before" ? "previous" : "new"} drawing before retry`,
    });
    await context.close();
  }
}
