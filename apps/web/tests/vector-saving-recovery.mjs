import { holdCommit, storedHead, terminationCases } from "./vector-saving-termination.mjs";
import { seed, digest, savingWorker, waitMarker } from "./vector-saving-recovery-helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated preview URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save05-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
async function session() {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  return { context, page };
}
async function open(page, failed = false) {
  await page.goto(new URL("drawing/preview-new", url).href);
  await page.locator("iframe").waitFor();
  const f = page.frames().find((frame) => frame.url().includes("/vector-editor/"));
  if (failed) await f.locator('[data-save-state="openFailed"]').waitFor();
  else await f.waitForFunction(() => !!window.lab, { timeout: 45000 });
  return f;
}
try {
  {
    const { context, page } = await session();
    let f = await open(page);
    await seed(f, 30000);
    await f.evaluate(() => lab.saving.flush(true));
    const before = await digest(f);
    const bytes = await page.evaluate(async () => {
      const d = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(".linefield-save-v1");
      const o = await d.getDirectoryHandle(".opaque");
      let n = 0;
      for await (const [, h] of o) n += (await h.getFile()).size;
      return n;
    });
    assert.ok(bytes > 1048576);
    f = await open(page);
    assert.equal(await digest(f), before);
    results.push({ case: "over-1MiB reopen exact data", bytes });
    await context.close();
  }
  for (const corrupt of ["flags", "digest"]) {
    const { context, page } = await session();
    let f = await open(page);
    await seed(f);
    await f.evaluate(() => lab.saving.flush(true));
    await page.goto(url);
    const before = await page.evaluate(
      async (kind) =>
        navigator.locks.request("linefield-save-v1", async () => {
          const o = await (
            await (await navigator.storage.getDirectory()).getDirectoryHandle(".linefield-save-v1")
          ).getDirectoryHandle(".opaque");
          for await (const [, h] of o) {
            const file = await h.getFile(),
              bytes = new Uint8Array(await file.arrayBuffer());
            if (new TextDecoder().decode(bytes.subarray(0, 15)) !== "/drawing.sqlite") continue;
            bytes[kind === "flags" ? 512 : 516] ^= 128;
            const w = await h.createWritable({ keepExistingData: true });
            await w.write(bytes);
            await w.close();
            return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).join(
              ",",
            );
          }
          throw Error("drawing file missing");
        }),
      corrupt,
    );
    f = await open(page, true);
    assert.equal(await f.evaluate(() => !!window.lab), false);
    const after = await page.evaluate(async () => {
      const o = await (
        await (await navigator.storage.getDirectory()).getDirectoryHandle(".linefield-save-v1")
      ).getDirectoryHandle(".opaque");
      for await (const [, h] of o) {
        const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer());
        if (new TextDecoder().decode(bytes.subarray(0, 15)) === "/drawing.sqlite")
          return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).join(",");
      }
    });
    assert.equal(after, before);
    results.push({ case: `corrupt ${corrupt} refused without byte changes` });
    await context.close();
  }
  for (const phase of ["before", "after"]) {
    const { context, page } = await session();
    let f = await open(page);
    await seed(f);
    await f.evaluate(() => lab.saving.flush(true));
    const worker = savingWorker(page);
    const baseline = await worker.evaluate(async () => {
      const v = await database.load();
      return { revision: v.revision, rows: v.rows.map((row) => row.slice(0, 4)) };
    });
    await holdCommit(worker, phase);
    await seed(f, 20);
    const expected = await digest(f);
    await f.evaluate(() => {
      globalThis.flushResult = lab.saving.flush(true).then(
        () => false,
        () => true,
      );
    });
    await waitMarker(worker);
    await worker.evaluate(() => self.close()).catch(() => {});
    assert.equal(await f.evaluate(() => globalThis.flushResult), true);
    assert.equal(await digest(f), expected);
    const persisted = await storedHead(f);
    if (phase === "before") assert.deepEqual(persisted, baseline);
    else
      assert.equal(persisted.revision, await f.evaluate(() => String(lab.core.delta_revision())));
    await f.evaluate(() => lab.saving.retry());
    f = await open(page);
    assert.equal(await digest(f), expected);
    results.push({ case: `worker loss ${phase} commit retries exact drawing` });
    await context.close();
  }
  for (const cancel of [true, false]) {
    const { context, page } = await session();
    const f = await open(page);
    await seed(f);
    await f.evaluate(() => lab.saving.flush(true));
    const worker = savingWorker(page);
    await worker.evaluate(() => {
      const original = database.commit;
      let first = true;
      database.commit = async (...args) => {
        if (first) {
          first = false;
          globalThis.commitHeld = true;
          await new Promise((resolve) => {
            globalThis.releaseCommit = resolve;
          });
        }
        return original(...args);
      };
    });
    await seed(f, 20);
    await page.getByRole("button", { name: "← Back", exact: true }).click();
    await waitMarker(worker);
    await seed(f, 10);
    const expected = await digest(f);
    assert.equal(await page.locator(".drawing-surface").count(), 1);
    if (cancel) await f.locator("#save-stay").click();
    await worker.evaluate(() => globalThis.releaseCommit());
    if (cancel) {
      await f.waitForFunction(() => lab.saving.state().phase !== "saving");
      assert.equal(await page.locator(".drawing-surface").count(), 1);
      await page.getByRole("button", { name: "← Back", exact: true }).click();
    }
    await page.locator(".drawing-surface").waitFor({ state: "detached" });
    assert.equal(
      await f.evaluate(() => lab.core.delta_revision() === lab.core.delta_durable()),
      true,
    );
    assert.equal(await digest(f), expected);
    results.push({
      case: cancel
        ? "cancelled Back stays; later Back flushes"
        : "Back waits for mutation accepted during pending commit",
    });
    await context.close();
  }
  await terminationCases(browser, url, results);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ results, browser: browser.version() }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
