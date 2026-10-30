import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { digest } from "./vector-saving-recovery-helpers.mjs";
import { install, pending, recover } from "./vector-pending-device-events.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated INPUT04 preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/input04-pending-device";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const [source, failCapture] of [
    ["pen", false],
    ["mouse", false],
    ["pen", true],
    ["mouse", true],
  ]) {
    const page = await browser.newPage();
    page.on("dialog", (d) => d.accept());
    await page.goto(url);
    await page.locator(".new-tile").click();
    await page.locator("iframe").waitFor();
    let frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await frame.evaluate(install, source);
    await frame.evaluate(() => lab.saving.flush(true));
    assert.equal(await frame.evaluate(() => lab.saving.state().phase), "saved");
    const before = await frame.evaluate(pending);
    assert.equal(before.before.length, 21);
    assert.deepEqual(before.after, before.before);
    for (const state of [before.active, before.held, before.rejected]) {
      assert.equal(state.state.pointer, 20);
      assert.equal(state.entries.filter((e) => e.kind === "commit").length, 1);
    }
    assert.equal(before.rejected.state.releasePending, true);
    await frame.waitForFunction(
      () => document.querySelector(".save-status").dataset.saveState !== "saved",
    );
    const status = await frame.evaluate(() => ({
      ui: document.querySelector(".save-status").dataset.saveState,
      diagnostics: lab.inputDiagnostics().state,
    }));
    assert.equal(status.ui, "pending");
    assert.equal(status.diagnostics.saving.phase, "pending");
    assert.equal(status.diagnostics.saving.adapterPhase, "saved");
    assert.equal(status.diagnostics.saving.hasUnsaved, true);
    const result = await frame.evaluate(recover, failCapture);
    assert.deepEqual(result.old, before.before);
    if (failCapture) {
      assert.equal(result.captureFailure.state.pointer, null);
      assert.equal(result.captureFailure.entries.filter((e) => e.kind === "commit").length, 2);
    }
    assert.equal(result.recovered.state.pointer, 30);
    assert.equal(result.late.state.pointer, 30);
    assert.equal(result.newRaw.length, 3);
    assert.equal(result.log.entries.filter((e) => e.kind === "commit").length, 3);
    assert.equal(result.log.state.pointer, null);
    const original = await digest(frame);
    const undo = await frame.evaluate(() => {
      const visibility = [];
      for (let i = 0; i < 2; i++) {
        lab.core.undo();
        visibility.push(Array.from({ length: lab.core.count() }, (_, id) => lab.core.visible(id)));
      }
      lab.core.redo();
      lab.core.redo();
      return visibility;
    });
    assert.deepEqual(undo, [
      [1, 1, 0],
      [1, 0, 0],
    ]);
    assert.equal(await digest(frame), original);
    if (failCapture) {
      const worker = page.workers().find((item) => item.url().includes("/saving/worker.js"));
      await worker.evaluate(() => {
        const handler = self.onmessage;
        self.onmessage = function (event) {
          if (event.data.kind === "commit") {
            self.postMessage({ id: event.data.id, error: "injected-storage-failure" });
            return;
          }
          return handler.call(self, event);
        };
      });
      assert.equal(
        await frame.evaluate(() =>
          lab.saving.flush(true).then(
            () => false,
            () => true,
          ),
        ),
        true,
      );
      assert.equal(await digest(frame), original);
      await frame.evaluate(() => lab.saving.retry());
    }
    await frame.evaluate(() => lab.saving.flush(true));
    await page.reload();
    await page.locator("iframe").waitFor();
    frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    assert.equal(await digest(frame), original);
    results.push({
      source,
      failCapture,
      build: result.log.build,
      pendingStatus: status,
      exactSamples: true,
      separateUndo: true,
      reload: true,
    });
    console.log(source + " pending cross-device recovery passed");
    await page.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, synthetic: true, results }, null, 2),
  );
} finally {
  await browser.close();
}
