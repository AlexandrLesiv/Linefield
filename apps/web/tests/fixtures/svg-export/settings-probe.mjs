import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.LINEFIELD_SVG_URL);
  await page.waitForFunction(() => !!window.svgProbe);
  const results = await page.evaluate(async () => {
    const { instance } = await WebAssembly.instantiate(
      await (await fetch("/core.wasm")).arrayBuffer(),
      {},
    );
    const core = instance.exports;
    core.document_settings(2, 2);
    const empty = await svgProbe.capture(core, 0.125);
    core.begin_with_style(12, 0x224466, 0.1, 1, 0.6);
    core.push_precise(20, 20, 0.5);
    core.push_precise(80, 70, 0.9);
    core.commit();
    const full = await svgProbe.capture(core, 0.125);
    const image = await svgProbe.compare(
      full.groups,
      { x: 0, y: 0, width: 100, height: 100, density: 2 },
      "whole",
      1024,
      4,
      "white",
    );
    return {
      empty: { settings: empty.settings, packets: empty.packets, groups: empty.groups.length },
      full: { settings: full.settings, packets: full.packets, groups: full.groups.length },
      image: { changed: image.changed, max: image.max },
      raw: core.raw_length(0),
    };
  });
  assert.deepEqual(results.empty, { settings: { paper: 2, grid: 2 }, packets: 0, groups: 0 });
  assert.deepEqual(results.full.settings, { paper: 2, grid: 2 });
  assert.equal(results.raw, 2);
  await mkdir(".build-cache/svg01/settings", { recursive: true });
  await writeFile(".build-cache/svg01/settings/results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
