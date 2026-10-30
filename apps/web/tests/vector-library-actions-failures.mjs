import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated SAVE08 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-actions-failures";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await clients(page, url);
  const waiting = page.waitForEvent("worker"),
    client = await newClient(page),
    worker = await waiting;
  const document = crypto.randomUUID(),
    entry = await call(page, client, "library-create", { document, locale: "en" });
  const fields = {
    document,
    incarnation: entry.incarnation,
    operation: crypto.randomUUID(),
    expectedTitle: entry.title,
    title: "Recoverable rename",
  };
  await worker.evaluate(() => {
    const original = withCatalog;
    globalThis.withCatalog = (create, action) =>
      original(create, (sql) =>
        action((query, bind) => {
          const value = sql(query, bind);
          if (!globalThis.injectedFailure && /^UPDATE drawings SET title/i.test(query)) {
            globalThis.injectedFailure = true;
            throw Error("storage-quota");
          }
          return value;
        }),
      );
  });
  await assert.rejects(call(page, client, "library-rename", fields), /storage-quota/);
  assert.equal(await worker.evaluate(() => globalThis.injectedFailure), true);
  assert.deepEqual(await call(page, client, "library-get", { document }), entry);
  const renamed = await call(page, client, "library-rename", fields);
  assert.equal(renamed.entry.title, fields.title);
  const removal = { document, incarnation: entry.incarnation, operation: crypto.randomUUID() };
  await worker.evaluate(() => {
    const original = libraryCommand;
    globalThis.libraryCommand = async (message) => {
      const result = await original(message);
      if (message.kind === "library-remove") {
        globalThis.committedRemoval = message.operation;
        await new Promise(() => {}); // Durable commit, then worker disappears without acknowledgement.
      }
      return result;
    };
  });
  await page.evaluate(
    ({ index, mutation }) => {
      globalThis.unacknowledged = clients[index].call("library-remove", mutation);
    },
    { index: client, mutation: removal },
  );
  let committed = false;
  for (let i = 0; i < 200; i++) {
    committed = await worker.evaluate(
      (operation) => globalThis.committedRemoval === operation,
      removal.operation,
    );
    if (committed) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert(committed, "Injected worker never reached durable commit");
  await kill(page, client);
  const recovered = await newClient(page);
  const receipt = await call(page, recovered, "library-remove", removal);
  assert.equal(receipt.deletionToken, removal.operation);
  assert.equal(
    (await call(page, recovered, "library-list")).drawings.some((d) => d.id === document),
    false,
  );
  const undo = {
    document,
    incarnation: entry.incarnation,
    operation: crypto.randomUUID(),
    deletionToken: removal.operation,
  };
  assert.equal((await call(page, recovered, "library-undo", undo)).entry.title, fields.title);
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        transactionFailureRolledBack: true,
        sameOperationRetry: true,
        committedWorkerLossRecovered: true,
        undoAfterLostAck: true,
      },
      null,
      2,
    ),
  );
  console.log("Mutation transaction failure and lost acknowledgement recovery passed");
} finally {
  await browser.close();
}
