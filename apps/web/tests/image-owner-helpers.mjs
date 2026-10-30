import { hiddenRgbPng } from "./image-import-png.mjs";
export async function ownerEditor(page, origin) {
  await page.goto(origin);
  await page.locator(".new-tile").click();
  for (let i = 0; i < 200; i++) {
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    if (frame && (await frame.evaluate(() => !!window.lab).catch(() => false))) return frame;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup failed");
}
export async function ownerStage(frame) {
  return frame.evaluate(
    async (bytes) =>
      lab.saving.stageAsset(new Blob([new Uint8Array(bytes)], { type: "image/png" }), {
        version: 1,
        mime: 1,
        width: 64,
        height: 64,
      }),
    Array.from(hiddenRgbPng()),
  );
}
export async function ownerPublish(frame, asset) {
  return frame.evaluate(async (item) => {
    const c = lab.core;
    new Uint8Array(c.memory.buffer, c.image_digest_input_ptr(), 64).set(
      new TextEncoder().encode(item.digest),
    );
    const id = c.image_add(1, 64, 64, item.bytes, 0, 0n, 100, 0n, 100, 1, 0, 800, 600) >>> 0;
    if (id === 0xffffffff) throw Error("Image publication failed");
    await lab.saving.finishAsset(item.lease, c.delta_revision().toString());
    return c.delta_revision().toString();
  }, asset);
}
export async function killOwnerWorker(page) {
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    setTimeout(() => {
      throw Error("Injected worker termination");
    }, 0);
  });
  await page.waitForTimeout(100);
}
export async function rawOwnerClient(page, origin, document) {
  await page.route("**/__owner_test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Owner recovery</title>",
    }),
  );
  await page.goto(origin + "/__owner_test");
  return page.evaluate(async (drawing) => {
    const worker = new Worker("/vector-editor/saving/worker.js?sqlite3.dir=/vector-editor/saving");
    let serial = 0;
    window.ownerClient = {
      worker,
      call(kind, fields = {}) {
        return new Promise((resolve, reject) => {
          const id = ++serial;
          const timeout = setTimeout(() => reject(Error("Worker timeout")), 15000);
          worker.onmessage = ({ data }) => {
            if (data.id !== id) return;
            clearTimeout(timeout);
            if (data.error) reject(Error(data.error));
            else resolve(data.value);
          };
          worker.onerror = (e) => {
            clearTimeout(timeout);
            reject(Error(e.message));
          };
          worker.postMessage({ id, kind, ...fields });
        });
      },
    };
    const identity = await ownerClient.call("open", {
      document: drawing,
      grant: crypto.randomUUID(),
    });
    const loaded = await ownerClient.call("load");
    window.ownerRevision = loaded.revision;
    return identity;
  }, document);
}
export async function ownerSweep(page, rounds = 200) {
  return page.evaluate(async (limit) => {
    let result;
    for (let i = 0; i < limit; i++) {
      result = await ownerClient.call("asset-maintain", { revision: ownerRevision });
      if (!result.pending || result.phase === "asset-owner-wait") break;
    }
    return { result, status: await ownerClient.call("maintenance-status") };
  }, rounds);
}
