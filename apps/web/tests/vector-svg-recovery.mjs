import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const url = process.env.LINEFIELD_SVG_URL;
if (!url) throw Error("Isolated SVG fixture required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.checkpointWorkers = [];
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        window.checkpointWorkers.push(this);
      }
    };
  });
  await page.goto(url);
  await page.waitForFunction(() => !!window.svgProbe);
  const results = await page.evaluate(async () => {
    const groups = [svgProbe.capsuleGroup(10, 0, [20, 30, 8, 80, 70, 12], 0x234567, 0.6, 24)];
    const original = Array.from(new Uint8Array(groups[0].bytes));
    const view = { x: 0, y: 0, width: 128, height: 128, density: 2 };
    const settle = (promise) =>
      promise.then(
        (value) => ({ value }),
        (error) => ({ error: String(error) }),
      );
    const run = () => svgProbe.job(groups, view, "whole");
    const check = (value, message) => {
      if (!value) throw Error(message);
    };
    const baseline = await run(),
      cases = [];
    async function unchanged() {
      const recovered = await run();
      check(recovered.svg === baseline.svg, "recovered SVG differs");
      check(
        JSON.stringify(Array.from(new Uint8Array(groups[0].bytes))) === JSON.stringify(original),
        "source buffer mutated or detached",
      );
    }
    const heavy = Array.from({ length: 30 }, (_, id) => ({ ...groups[0], id }));
    let at = performance.now();
    const cancelled = settle(svgProbe.job(heavy, { ...view, width: 512, height: 384 }, "whole"));
    setTimeout(() => svgProbe.cancel(), 0);
    const cancelResult = await cancelled;
    check(cancelResult.error?.includes("svg-cancelled"), "cancel rejects incomplete output");
    cases.push({ name: "cancel then recover", milliseconds: performance.now() - at });
    await unchanged();
    const pending = settle(svgProbe.job(heavy, view, "whole"));
    const concurrent = await settle(run());
    check(concurrent.error?.includes("svg-job-busy"), "one job bound");
    svgProbe.cancel();
    await pending;
    await unchanged();
    cases.push({ name: "concurrent job refused" });
    const worker = checkpointWorkers.at(-1),
      oldHandler = worker.onmessage;
    const failing = settle(svgProbe.job(heavy, view, "whole"));
    worker.dispatchEvent(new ErrorEvent("error", { message: "injected-worker-failure" }));
    check(
      (await failing).error?.includes("svg-worker-failure"),
      "worker failure rejects outstanding job",
    );
    const afterFailure = run();
    oldHandler({
      data: {
        id: baseline.id,
        svg: "stale-corrupted-output",
        encoded: 0,
        pixels: 0,
        milliseconds: 0,
      },
    });
    check((await afterFailure).svg === baseline.svg, "stale old worker output ignored");
    cases.push({ name: "worker failure/reset and stale response" });
    for (const [name, badView, expected] of [
      ["nonfinite view", { ...view, width: Infinity }, "svg-invalid-request"],
      ["pixel overflow", { ...view, width: 100000, height: 100000 }, "svg-pixel-limit"],
      ["scratch overflow", { ...view, width: 2500, height: 2500 }, "svg-scratch-limit"],
    ]) {
      const outcome = await settle(svgProbe.job(groups, badView, "whole"));
      check(outcome.error?.includes(expected), `${name}: ${outcome.error}`);
      await unchanged();
      cases.push({ name });
    }
    const oversized = await settle(
      svgProbe.job(
        [{ id: 1, brush: 0, bytes: new ArrayBuffer(16 * 1024 * 1024 + 32) }],
        view,
        "whole",
      ),
    );
    check(
      oversized.error?.includes("svg-fixture-derived-limit"),
      "derived budget rejects before transfer",
    );
    await unchanged();
    cases.push({ name: "derived transfer preflight" });
    const invalid = await settle(
      svgProbe.job([{ id: 1, brush: 0, bytes: new ArrayBuffer(31) }], view, "whole"),
    );
    check(invalid.error?.includes("svg-invalid-chunk"), "malformed chunk rejects");
    await unchanged();
    cases.push({ name: "malformed worker input" });
    const staleId = baseline.id;
    const later = run();
    svgProbe.cancel(staleId);
    check((await later).svg === baseline.svg, "old cancellation cannot cancel later job");
    cases.push({ name: "stale cancellation ignored" });
    return {
      cases,
      baselineBytes: baseline.encoded,
      sourceBytes: groups[0].bytes.byteLength,
      limitations: [
        "Worker error injected through browser event; not hardware GPU loss",
        "Output128MiB exhaustion and30s timeout not exercised",
        "This is fixture recovery, not production export adoption",
      ],
    };
  });
  assert.equal(results.cases.length, 9);
  writeFileSync(".build-cache/svg01/recovery-results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
