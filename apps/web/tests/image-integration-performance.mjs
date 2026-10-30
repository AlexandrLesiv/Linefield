import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inputSession } from "./vector-svg-input-session.mjs";
import { paddedPng } from "./image-cleanup-fixtures.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || "../../.build-cache/img02/performance";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  runs = [];
const stats = (v) => {
  const a = v.slice().sort((x, y) => x - y);
  return {
    median: a[Math.floor(a.length / 2)] || 0,
    p99: a[Math.floor((a.length - 1) * 0.99)] || 0,
    max: Math.max(0, ...a),
  };
};
const digest = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
try {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    }),
    page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  const png = await page.evaluate(async () => {
    const c = new OffscreenCanvas(4096, 4096),
      ctx = c.getContext("2d"),
      g = ctx.createLinearGradient(0, 0, 4096, 4096);
    g.addColorStop(0, "#8e133e");
    g.addColorStop(1, "#43c8e6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4096, 4096);
    const blob = await c.convertToBlob({ type: "image/png" });
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.readAsDataURL(blob);
    });
  });
  const file = {
    name: "performance-4096.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  if (process.env.LINEFIELD_IMAGE_ENCODED_MIB)
    file.buffer = paddedPng(
      Number(process.env.LINEFIELD_IMAGE_ENCODED_MIB) * 1024 * 1024,
      file.buffer,
    );
  const editor = async () => {
    for (let i = 0; i < 100; i++) {
      const f = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
      if (f && (await f.evaluate(() => !!window.lab).catch(() => false))) return f;
      await page.waitForTimeout(100);
    }
    throw Error("Editor startup " + errors.join(";"));
  };
  const snapshot = () => {
    const c = lab.core;
    return {
      strokes: Array.from({ length: c.count() }, (_, id) => ({
        visible: c.visible(id),
        raw: Array.from({ length: c.raw_length(id) }, (_point, i) => [
          String(c.raw_region(id, i, 0)),
          c.raw_local(id, i, 0),
          String(c.raw_region(id, i, 1)),
          c.raw_local(id, i, 1),
          c.raw_point(id, i, 2),
        ]),
      })),
      images: Array.from({ length: c.image_count() }, (_, slot) => {
        const id = 0x80000000 + slot;
        c.image_read(id, 0n, 0, 0n, 0);
        return {
          values: Array.from(new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)),
          digest: new TextDecoder().decode(
            new Uint8Array(c.memory.buffer, c.image_digest_ptr(id), 64),
          ),
        };
      }),
    };
  };
  for (let pair = 0; pair < 3; pair++) {
    await page.goto(origin);
    await page.locator(".new-tile").click();
    let frame = await editor();
    const device = pair === 1 ? "mouse" : "pen";
    let expected;
    for (const mode of ["baseline", "import", "warm"]) {
      await frame.locator("#pen").click();
      await frame.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      let importedAt;
      if (mode === "import") {
        await frame.locator("#editor-settings-toggle").click();
        const chooser = page.waitForEvent("filechooser");
        await frame.locator("#image-import-open").click();
        const chosen = await chooser;
        importedAt = Date.now();
        await chosen.setFiles(file);
      }
      const raw = await frame.evaluate(inputSession, { device, count: 240, interval: 8 });
      const hash = digest(raw.raw);
      if (mode === "baseline") expected = hash;
      else if (hash !== expected) {
        await writeFile(`${out}/mismatch.json`, JSON.stringify({ pair, mode, raw, runs }, null, 2));
        assert.equal(hash, expected);
      }
      assert.equal(raw.raw.length, 241);
      assert(raw.priorRawUnchanged);
      let readinessMs = 0;
      if (mode === "import") {
        await frame.waitForFunction(
          () => document.querySelector("#image-import-notice").textContent.includes("Image added"),
          { timeout: 60000 },
        );
        readinessMs = Date.now() - importedAt;
      }
      await frame.evaluate(() => lab.saving.flush(true));
      const inputFrames = raw.frames.filter((_, i) => raw.frameAt[i] <= raw.inputEnd),
        inputLong = raw.longTasks.filter((_, i) => raw.longTaskAt[i] <= raw.inputEnd);
      runs.push({
        pair,
        device,
        mode,
        readinessMs,
        rawHash: hash,
        samples: raw.raw.length,
        frames: stats(inputFrames),
        dispatch: stats(raw.delays),
        handlers: stats(raw.handlers),
        longTasks: inputLong,
        saving: raw.saving,
        raw,
      });
      await writeFile(`${out}/progress.json`, JSON.stringify(runs, null, 2));
    }
    await frame.locator("#select").click();
    await frame.locator("canvas").click({ position: { x: 640, y: 400 } });
    await frame.locator("#image-opacity").waitFor({ state: "visible" });
    await frame.locator("#image-opacity").fill("60");
    await frame.locator("#image-opacity").dispatchEvent("change");
    const saving = await frame.evaluate(async () => {
      const t = performance.now();
      await lab.saving.flush(true);
      return { ms: performance.now() - t, state: lab.inputDiagnostics().state.saving };
    });
    const before = await frame.evaluate(snapshot);
    assert.equal(before.images.length, 1);
    const url = page.url();
    await page.reload();
    frame = await editor();
    await frame.waitForFunction(() => document.querySelector("#image-view-retry").hidden);
    const after = await frame.evaluate(snapshot);
    assert.deepEqual(after, before);
    runs.push({ pair, mode: "save-reload", saving, url, snapshotHash: digest(before) });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ runs, errors, encodedBytes: file.buffer.length }, null, 2),
  );
  console.log(JSON.stringify(runs.map(({ raw: _raw, ...r }) => r)));
} finally {
  await browser.close();
}
