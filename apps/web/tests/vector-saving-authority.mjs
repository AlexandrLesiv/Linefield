import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated preview URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save05-authority";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
await context.addInitScript(() => {
  const OriginalWorker = window.Worker;
  window.authorityResults = [];
  window.Worker = class extends OriginalWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener("message", ({ data }) => {
        const receipt = data?.value;
        if (!receipt || receipt.outcome !== "committed" || !window.lab || window.authorityChecked)
          return;
        window.authorityChecked = true;
        try {
          const e = window.lab.core,
            token = Number(receipt.operation.match(/_([0-9]+)$/)[1]);
          const durable = e.delta_durable(),
            revision = e.delta_revision();
          const requestText = () =>
            new TextDecoder().decode(
              new Uint8Array(e.memory.buffer, e.save_request_ptr(token), e.save_request_len(token)),
            );
          const sealed = requestText(),
            expected = JSON.parse(sealed);
          const check = (name, ok) => {
            if (!ok) throw Error(name);
            window.authorityResults.push(name);
          };
          const submit = (value, suppliedToken = token) => {
            const bytes = new TextEncoder().encode(JSON.stringify(value));
            new Uint8Array(e.memory.buffer, e.save_input_ptr(), bytes.length).set(bytes);
            return e.save_receipt(suppliedToken, bytes.length);
          };
          const unchanged = () => e.delta_durable() === durable && e.delta_revision() === revision;
          for (const key of [
            "document",
            "incarnation",
            "grant",
            "operation",
            "base",
            "result",
            "digest",
            "outcome",
          ]) {
            const changed =
              key === "base" || key === "result"
                ? String(BigInt(receipt[key]) + 1n)
                : key === "digest"
                  ? (receipt.digest[0] === "0" ? "1" : "0") + receipt.digest.slice(1)
                  : key === "outcome"
                    ? "unknown"
                    : `${receipt[key]}_wrong`;
            const wrong = { ...receipt, [key]: changed };
            check(`wrong ${key} rejected`, submit(wrong) === 0 && unchanged());
            check(
              `non-string ${key} rejected`,
              submit({ ...receipt, [key]: 1 }) === 0 && unchanged(),
            );
          }
          const missing = { ...receipt };
          delete missing.digest;
          check("missing digest rejected", submit(missing) === 0 && unchanged());
          check(
            "extra receipt fields rejected",
            submit({ ...receipt, extra: true }) === 0 && unchanged(),
          );
          check("stale token rejected", submit(receipt, token + 1) === 0 && unchanged());
          check(
            "raw acknowledgement bypasses disabled",
            e.idle_ack(token, BigInt(receipt.base), BigInt(receipt.result)) === 0 &&
              e.delta_ack(token, BigInt(receipt.base), BigInt(receipt.result)) === 0 &&
              unchanged(),
          );
          check(
            "same-token reseal is stable",
            e.save_seal_begin(token) === 1 &&
              e.save_seal_step(token) === 2 &&
              requestText() === sealed,
          );
          check(
            "Rust hash equals independently sealed worker body",
            expected.digest === receipt.digest &&
              Object.keys(expected).every((key) => expected[key] === receipt[key]),
          );
        } catch (error) {
          window.authorityError = error.message;
        }
      });
    }
  };
});
const page = await context.newPage(),
  results = [];
page.on("dialog", (dialog) => dialog.accept());
async function open() {
  await page.goto(new URL("drawing/preview-new", url).href);
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab, { timeout: 30000 });
  return frame;
}
const settings = (frame) =>
  frame.evaluate(() => [lab.core.document_paper(), lab.core.document_grid()]);
const flush = (frame) => frame.evaluate(() => lab.saving.flush(true));
try {
  let frame = await open();
  assert.deepEqual(await settings(frame), [1, 0]);
  await frame.evaluate(() => {
    for (const count of [1638, 1700]) {
      lab.core.begin(4, 0x245788);
      for (let i = 0; i < count; i++) lab.core.push_precise(i, count / 10, 0.5);
      lab.core.commit();
    }
    lab.requestRedraw();
  });
  await frame.locator("#paper-style").selectOption("white");
  await frame.locator("#grid-style").selectOption("dots");
  await flush(frame);
  const authority = await frame.evaluate(() => ({
    error: window.authorityError,
    results: window.authorityResults,
  }));
  assert.equal(authority.error, undefined);
  assert.equal(authority.results.length, 22);
  results.push(...authority.results);
  assert.equal(
    await frame.evaluate(() => lab.core.delta_revision() === lab.core.delta_durable()),
    true,
  );
  results.push("valid receipt alone advances exact revision");
  await frame.evaluate(() => {
    lab.core.undo();
    lab.requestRedraw();
  });
  assert.deepEqual(await settings(frame), [2, 0]);
  await flush(frame);
  await frame.evaluate(() => {
    lab.core.redo();
    lab.requestRedraw();
  });
  assert.deepEqual(await settings(frame), [2, 2]);
  await flush(frame);
  frame = await open();
  assert.deepEqual(await settings(frame), [2, 2]);
  assert.equal(await frame.locator("#paper-style").inputValue(), "white");
  assert.equal(await frame.locator("#grid-style").inputValue(), "dots");
  assert.equal(await frame.evaluate(() => lab.core.can_undo()), 0);
  results.push("paper/grid undo redo persist and reload into controls without old history");
  const before = await frame.evaluate(() => String(lab.core.delta_revision()));
  assert.equal(await frame.evaluate(() => lab.core.document_settings(3, 0)), 0);
  assert.equal(await frame.evaluate(() => String(lab.core.delta_revision())), before);
  results.push("invalid settings rejected without revision");
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ results, browser: browser.version(), url }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
