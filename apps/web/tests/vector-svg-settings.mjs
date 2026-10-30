import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const origin = process.env.LINEFIELD_SVG_URL;
if (!origin) throw Error("Versioned isolated fixture required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  const result = await page.evaluate(async () => {
    const bytes = await (await fetch("/core-v2.wasm")).arrayBuffer();
    const c = (await WebAssembly.instantiate(bytes, {})).instance.exports;
    const setting = (token, index) => c.svg_setting(token, index) >>> 0;
    const check = (ok, label) => {
      if (!ok) throw Error(label);
    };
    c.document_settings(2, 1);
    const revision = c.delta_revision(),
      durable = c.delta_durable();
    const token = c.svg_begin();
    check(setting(token, 0) === 0xffffffff, "unsealed settings unavailable");
    check(c.svg_prepare(token) === 2, "empty sealed");
    c.document_settings(0, 2);
    check(setting(token, 0) === 2 && setting(token, 1) === 1, "frozen empty background");
    check(
      setting(token, 2) === 0xffffffff && setting(token + 1, 0) === 0xffffffff,
      "invalid boundary",
    );
    check(c.svg_next(token, 0.05) === 0 && c.svg_status(token) === 3, "empty exhausted");
    check(setting(token, 0) === 2, "exhausted settings remain available");
    check(
      c.svg_revision(token) === revision && c.delta_durable() === durable,
      "capture leaves save revisions",
    );
    check(
      c.document_paper() === 0 && c.document_grid() === 2 && c.count() === 0,
      "live settings unchanged by export",
    );
    c.svg_cancel(token);
    check(setting(token, 0) === 0xffffffff, "retiring settings unavailable");
    while (!c.svg_cleanup(token)) {}
    check(setting(token, 0) === 0xffffffff, "retired settings unavailable");
    const next = c.svg_begin();
    c.document_settings(1, 1);
    check(
      c.svg_prepare(next) === 5 && setting(next, 0) === 0xffffffff,
      "changed empty capture aborts",
    );
    while (!c.svg_cleanup(next)) {}
    return {
      emptySnapshotImmutable: true,
      invalidStatesRejected: true,
      liveAndDurableUnchanged: true,
    };
  });
  assert.deepEqual(result, {
    emptySnapshotImmutable: true,
    invalidStatesRejected: true,
    liveAndDurableUnchanged: true,
  });
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
