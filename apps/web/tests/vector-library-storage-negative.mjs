import assert from "node:assert/strict";
import { clients, newClient, call } from "./vector-library-storage-helpers.mjs";
export async function negativeCases(browser, url, results) {
  async function setup() {
    const context = await browser.newContext(),
      page = await context.newPage();
    await clients(page, url);
    const a = await newClient(page);
    await call(page, a, "library-list");
    return { context, page, a };
  }
  {
    const { context, page, a } = await setup(),
      first = crypto.randomUUID(),
      second = crypto.randomUUID();
    await call(page, a, "library-create", { document: first, locale: "en" });
    await call(page, a, "library-create", { document: second, locale: "en" });
    await page.evaluate(
      async ({ firstId, secondId }) => {
        const root = await navigator.storage.getDirectory(),
          source = await (
            await root.getDirectoryHandle(".linefield-drawing-v1-" + firstId)
          ).getDirectoryHandle(".opaque");
        const files = [];
        for await (const [name, h] of source)
          files.push([name, await (await h.getFile()).arrayBuffer()]);
        await root.removeEntry(".linefield-drawing-v1-" + secondId, { recursive: true });
        const dest = await (
          await root.getDirectoryHandle(".linefield-drawing-v1-" + secondId, { create: true })
        ).getDirectoryHandle(".opaque", { create: true });
        for (const [name, bytes] of files) {
          const w = await (await dest.getFileHandle(name, { create: true })).createWritable();
          await w.write(bytes);
          await w.close();
        }
      },
      { firstId: first, secondId: second },
    );
    await assert.rejects(
      call(page, a, "open", { document: second, grant: crypto.randomUUID() }),
      /storage-conflict/,
    );
    results.push("copied drawing pool cannot impersonate another catalog incarnation");
    await context.close();
  }
  {
    const { context, page, a } = await setup(),
      id = crypto.randomUUID();
    await call(page, a, "library-create", { document: id, locale: "en" });
    await page.evaluate(async () => {
      await (
        await navigator.storage.getDirectory()
      ).removeEntry(".linefield-catalog-v1", { recursive: true });
    });
    await assert.rejects(call(page, a, "library-list"), /storage-catalog-missing/);
    assert.equal(
      await page.evaluate(async () => {
        try {
          await (
            await navigator.storage.getDirectory()
          ).getDirectoryHandle(".linefield-catalog-v1");
          return true;
        } catch (e) {
          if (e.name === "NotFoundError") return false;
          throw e;
        }
      }),
      false,
    );
    results.push("missing catalog with managed drawing files refuses empty replacement");
    await context.close();
  }
  {
    const { context, page, a } = await setup(),
      id = crypto.randomUUID();
    await call(page, a, "library-create", { document: id, locale: "en" });
    const worker = page.workers()[0];
    await worker.evaluate(
      async (document) =>
        withCatalog(false, (sql) =>
          sql("UPDATE drawings SET title=? WHERE document=?", ["bad\u0080title", document]),
        ),
      id,
    );
    await assert.rejects(call(page, a, "library-list"), /storage-catalog-corrupt/);
    results.push("C1 control character in persisted title refuses catalog publication");
    await context.close();
  }
  {
    const { context, page, a } = await setup(),
      id = crypto.randomUUID();
    await call(page, a, "library-create", { document: id, locale: "en" });
    const worker = page.workers()[0];
    await worker.evaluate(
      async (document) =>
        withCatalog(false, (sql) =>
          sql("UPDATE drawings SET created=?,updated=? WHERE document=?", [
            catalogLimits.timestampMax,
            catalogLimits.timestampMax,
            document,
          ]),
        ),
      id,
    );
    assert.equal((await call(page, a, "library-get", { document: id })).created, 8640000000000000);
    assert.equal(
      await worker.evaluate(async (document) => {
        try {
          await withCatalog(false, (sql) =>
            sql("UPDATE drawings SET updated=? WHERE document=?", [
              catalogLimits.timestampMax + 1,
              document,
            ]),
          );
          return false;
        } catch {
          return true;
        }
      }, id),
      true,
    );
    results.push("timestamp maximum accepted and out-of-range durable update rejected");
    await context.close();
  }
}
