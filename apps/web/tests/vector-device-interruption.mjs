import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { digest } from "./vector-saving-recovery-helpers.mjs";
import { replay } from "./vector-device-interruption-events.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/input03-device";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const scenario of process.env.LINEFIELD_INPUT_SCENARIOS?.split(",") ?? [
    "captured-owner",
    "pending-owner",
    "new-pen",
    "cancel",
    "pressed-loss",
    "blur",
    "hidden",
  ]) {
    const page = await browser.newPage();
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(url);
    await page.locator(".new-tile").click();
    await page.locator("iframe").waitFor();
    let frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const result = await frame.evaluate(replay, scenario);
    assert.equal(result.before.length, 528);
    assert.deepEqual(
      result.afterMouse,
      result.before,
      "Foreign mouse cannot change active pen samples",
    );
    assert.equal(result.mouseState.state.pointer, 528, "Foreign mouse cannot replace pen owner");
    assert.equal(
      result.mouseState.entries.filter((entry) => entry.kind === "commit").length,
      0,
      "Foreign mouse cannot commit active pen",
    );
    assert.deepEqual(
      result.afterMissing,
      result.beforeMissing,
      "No invented pen samples without delivery",
    );
    assert.equal(result.missingState.state.pointer, 528);
    assert.equal(result.missingState.entries.filter((entry) => entry.kind === "commit").length, 0);
    assert.equal(result.initial.traffic.total.documentMoves, 527);
    assert.equal(result.initial.traffic.total.acceptedSamples, 528);
    assert.equal(result.mouseState.traffic.total.foreignMoves, 1);
    assert.equal(result.mouseState.traffic.total.acceptedSamples, 528);
    assert.equal(result.missingState.traffic.total.foreignMoves, 11);
    assert.equal(result.missingState.traffic.total.documentMoves, 538);
    assert.equal(result.missingState.traffic.total.acceptedSamples, 528);
    const count = scenario === "new-pen" ? 2 : 1;
    assert.equal(result.raw.length, count);
    assert.equal(result.raw[0].length >= 528, true, "All528 accepted samples preserved");
    assert.deepEqual(result.raw[0].slice(0, 528), result.before);
    assert.equal(
      result.raw[0].length,
      ["captured-owner", "pending-owner"].includes(scenario) ? 531 : 528,
    );
    if (count === 2) assert.equal(result.raw[1].length, 2);
    assert.equal(result.log.entries.filter((entry) => entry.kind === "commit").length, count);
    assert.equal(result.log.state.pointer, null);
    assert.equal(result.log.entries.length <= 256, true);
    assert.equal(/clientX|clientY|pressure|coordinates/.test(JSON.stringify(result.log)), false);
    if (scenario === "hidden") {
      await frame.waitForFunction(
        () => lab.saving.state().phase === "saved",
        {},
        { polling: 50, timeout: 15000 },
      );
      await frame.evaluate(() => {
        delete document.hidden;
        window.requestAnimationFrame = originalAnimationFrame;
      });
    }
    const commits = result.log.entries.filter((entry) => entry.kind === "commit");
    assert.equal(
      commits[0].traffic.sinceGestureBegin.acceptedSamples,
      scenario === "captured-owner" || scenario === "pending-owner" ? 531 : 528,
    );
    if (scenario === "new-pen")
      assert.equal(commits[1].traffic.sinceGestureBegin.acceptedSamples, 2);
    if (scenario === "pending-owner" || scenario === "new-pen") {
      assert(
        result.pending.traffic.lastOwnerMoveAgeMs >= result.initial.traffic.lastOwnerMoveAgeMs,
      );
      assert.equal(result.pending.traffic.lastOwnerKind, "lostpointercapture");
    }
    const before = await digest(frame);
    const history = await frame.evaluate((n) => {
      const visible = [];
      for (let i = 0; i < n; i++) {
        lab.core.undo();
        visible.push(
          Array.from({ length: lab.core.count() }, (_, id) => lab.core.visible(id)).reduce(
            (a, b) => a + b,
            0,
          ),
        );
      }
      for (let i = 0; i < n; i++) lab.core.redo();
      return visible;
    }, count);
    assert.deepEqual(history, count === 2 ? [1, 0] : [0]);
    assert.equal(await digest(frame), before);
    if (scenario === "new-pen") {
      const worker = page.workers().find((item) => item.url().includes("/saving/worker.js"));
      await worker.evaluate(() => {
        const handle = self.onmessage;
        self.onmessage = function (event) {
          if (event.data.kind === "commit") {
            self.postMessage({ id: event.data.id, error: "injected-storage-failure" });
            return;
          }
          return handle.call(self, event);
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
      assert.equal(await digest(frame), before);
      await frame.evaluate(() => lab.saving.retry());
    }
    await frame.evaluate(() => lab.saving.flush(true));
    await page.reload();
    await page.locator("iframe").waitFor();
    frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    assert.equal(await digest(frame), before);
    const bounded = await frame.evaluate(() => {
      for (let i = 0; i < 300; i++)
        document.body.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            pointerType: "mouse",
            pointerId: 1000 + i,
            buttons: 0,
          }),
        );
      const log = lab.inputDiagnostics();
      return {
        entries: log.entries.length,
        dropped: log.dropped,
        redacted: !/clientX|clientY|pressure|coordinates/.test(JSON.stringify(log)),
      };
    });
    assert.equal(bounded.entries, 256);
    assert(bounded.dropped > 0);
    assert(bounded.redacted);
    results.push({
      scenario,
      exactSamples: true,
      commits: count,
      history: true,
      reload: true,
      diagnostics: result.log,
    });
    console.log(
      scenario + ": continuity, separate devices, exact samples, history and reload passed",
    );
    await page.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { url, syntheticEvents: true, physicalDeviceValidation: false, results },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
