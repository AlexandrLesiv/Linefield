import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-storage";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await clients(page, url);
  const client = await newClient(page),
    document = crypto.randomUUID(),
    other = crypto.randomUUID();
  const entry = await call(page, client, "library-create", { document, locale: "en" });
  const unrelated = await call(page, client, "library-create", { document: other, locale: "en" });
  const base = { document, incarnation: entry.incarnation };
  const rename = {
    ...base,
    operation: crypto.randomUUID(),
    expectedTitle: entry.title,
    title: "Київ · Ink 🖊️",
  };
  const first = await call(page, client, "library-rename", rename);
  assert.equal(first.entry.title, rename.title);
  assert.equal(first.entry.updated, entry.updated);
  assert.deepEqual(await call(page, client, "library-rename", rename), first);
  await assert.rejects(
    call(page, client, "library-rename", { ...rename, title: "Different" }),
    /storage-conflict/,
  );
  await assert.rejects(
    call(page, client, "library-rename", {
      ...rename,
      operation: crypto.randomUUID(),
      title: " ",
      expectedTitle: rename.title,
    }),
    /storage-title/,
  );
  await assert.rejects(
    call(page, client, "library-rename", {
      ...rename,
      operation: crypto.randomUUID(),
      title: "bad\u0000title",
      expectedTitle: rename.title,
    }),
    /storage-title/,
  );
  await assert.rejects(
    call(page, client, "library-rename", {
      ...rename,
      operation: crypto.randomUUID(),
      title: "x".repeat(257),
      expectedTitle: rename.title,
    }),
    /storage-title/,
  );
  await assert.rejects(
    call(page, client, "library-rename", {
      ...rename,
      operation: crypto.randomUUID(),
      title: "Stale",
    }),
    /storage-conflict/,
  );
  const newer = {
    ...base,
    operation: crypto.randomUUID(),
    expectedTitle: rename.title,
    title: "Newer title",
  };
  const second = await call(page, client, "library-rename", newer);
  assert.equal((await call(page, client, "library-rename", rename)).entry.title, newer.title);
  const removal = { ...base, operation: crypto.randomUUID() };
  const deleted = await call(page, client, "library-remove", removal);
  assert.equal(deleted.deletionToken, removal.operation);
  assert.equal(deleted.entry.updated, second.entry.updated);
  assert.deepEqual(await call(page, client, "library-remove", removal), deleted);
  assert.equal(
    (await call(page, client, "library-list")).drawings.some((d) => d.id === document),
    false,
  );
  await assert.rejects(call(page, client, "library-create", { document }), /storage-deleted/);
  const opener = await newClient(page);
  await assert.rejects(
    call(page, opener, "open", { document, grant: crypto.randomUUID() }),
    /storage-(deleted|missing)/,
  );
  await kill(page, opener);
  await assert.rejects(
    call(page, client, "library-rename", {
      ...newer,
      operation: crypto.randomUUID(),
      expectedTitle: newer.title,
      title: "Deleted rename",
    }),
    /storage-(deleted|missing)/,
  );
  const undo = { ...base, operation: crypto.randomUUID(), deletionToken: removal.operation };
  const restored = await call(page, client, "library-undo", undo);
  assert.equal(restored.deletionToken, null);
  assert.equal(restored.entry.updated, second.entry.updated);
  assert.equal((await call(page, client, "library-remove", removal)).deletionToken, null);
  const nextRemoval = { ...base, operation: crypto.randomUUID() };
  await call(page, client, "library-remove", nextRemoval);
  await assert.rejects(
    call(page, client, "library-undo", { ...undo, operation: crypto.randomUUID() }),
    /storage-conflict/,
  );
  assert.equal(
    (await call(page, client, "library-undo", undo)).deletionToken,
    nextRemoval.operation,
  );
  const final = await call(page, client, "library-undo", {
    ...base,
    operation: crypto.randomUUID(),
    deletionToken: nextRemoval.operation,
  });
  assert.equal(final.entry.title, newer.title);
  assert.equal(final.entry.updated, second.entry.updated);
  assert.deepEqual(await call(page, client, "library-get", { document: other }), unrelated);
  await kill(page, client);
  const reopened = await newClient(page);
  assert.equal((await call(page, reopened, "library-get", { document })).title, newer.title);
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        renameExactRetry: true,
        currentProjectionOnOldRetry: true,
        titleValidation: true,
        deleteUndoTokens: true,
        activityOrderingPreserved: true,
        unrelatedUnchanged: true,
      },
      null,
      2,
    ),
  );
  console.log("Persistent rename/delete/undo exact receipts, conflicts and ordering passed");
} finally {
  await browser.close();
}
