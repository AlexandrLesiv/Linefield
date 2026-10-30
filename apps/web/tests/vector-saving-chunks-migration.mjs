import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  old = process.env.LINEFIELD_LEGACY_URL || "http://127.0.0.1:65354/";
if (!url) throw Error("Explicit isolated candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save07-migration";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 2,
  }),
  page = await context.newPage();
page.on("dialog", (d) => d.accept());
async function raw() {
  return page.evaluate(() => {
    const e = lab.core;
    return {
      paper: e.document_paper(),
      grid: e.document_grid(),
      strokes: Array.from({ length: e.count() }, (_, id) => ({
        id,
        brush: e.brush(id),
        color: e.color(id),
        opacity: e.opacity(id),
        width: e.stroke_width(id),
        raw: Array.from({ length: e.raw_length(id) }, (_sample, i) => [
          String(e.raw_region(id, i, 0)),
          e.raw_local(id, i, 0),
          String(e.raw_region(id, i, 1)),
          e.raw_local(id, i, 1),
          e.raw_point(id, i, 2),
        ]),
      })),
    };
  });
}
try {
  // The real old app runs at the candidate origin, so it creates the actual old namespace.
  await page.route("**/vector-editor/**", async (route) => {
    const target = new URL(route.request().url());
    const replacement = new URL(target.pathname + target.search, old);
    await route.fulfill({ response: await route.fetch({ url: replacement.href }) });
  });
  await clients(page, url);
  const client = await newClient(page),
    document = crypto.randomUUID();
  await call(page, client, "library-create", { document, locale: "en" });
  await kill(page, client);
  await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
  await page.waitForFunction(() => !!window.lab);
  await page.evaluate(() => {
    const e = lab.core;
    for (let brush = 0; brush < 3; brush++) {
      e.begin_with_style(16, 0x315a93, 0.1, 1.5, 0.65);
      e.set_active_brush(brush);
      for (let i = 0; i < 160; i++)
        e.push_precise(100 + i * 2, 200 + brush * 90 + Math.sin(i / 8) * 20, 0.1 + (i % 9) / 10);
      e.commit();
    }
    e.document_settings(2, 2);
    lab.requestRedraw();
  });
  await page.evaluate(() => lab.saving.flush(true));
  await page.waitForFunction(() => !lab.renderPending());
  const before = await raw(),
    pixels = await page.locator("canvas").screenshot();
  await page.unroute("**/vector-editor/**");
  await page.goto(url);
  await page.locator(`[data-id="${document}"]`).waitFor();
  assert.equal(await page.locator("[data-id]").count(), 1);
  await page.reload();
  await page.locator(`[data-id="${document}"]`).waitFor();
  assert.equal(await page.locator("[data-id]").count(), 1);
  await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
  await page.waitForFunction(() => !!window.lab);
  assert.deepEqual(await raw(), before);
  await page.waitForFunction(() => !lab.renderPending());
  assert.deepEqual(await page.locator("canvas").screenshot(), pixels);
  const results = [
    "real old app populated all brushes and paper/grid at candidate origin",
    "gallery preserves v1 drawing exactly once across reload",
    "new editor restores exact raw/style/settings and canvas pixels",
  ];
  await writeFile(
    output + "/results.json",
    JSON.stringify({ results, browser: browser.version(), source: old, candidate: url }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
