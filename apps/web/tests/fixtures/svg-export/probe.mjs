import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg01/host-probe";
const url = process.env.LINEFIELD_SVG_URL ?? "http://127.0.0.1:65385/";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => !!window.svgProbe);
  const result = await page.evaluate(async () => {
    const bytes = await (await fetch("/core.wasm")).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {}),
      core = instance.exports;
    for (let brush = 0; brush < 3; brush++) {
      core.begin_with_style(
        24,
        brush === 0 ? 0x224466 : brush === 1 ? 0x442211 : 0x225544,
        0.1,
        1,
        0.6,
      );
      core.set_active_brush(brush);
      for (let i = 0; i < 40; i++)
        core.push_precise(20 + i * 4, 30 + brush * 50 + Math.sin(i / 4) * 18, 0.2 + (i % 9) / 12);
      core.commit();
    }
    const rawBefore = Array.from({ length: core.count() }, (_, id) => core.raw_length(id));
    const snapshot = await svgProbe.capture(core, 0.05);
    const rows = [];
    for (const density of [1, 2, 4])
      for (const mode of ["raster", "hybrid"])
        for (const matte of ["white", "black"]) {
          const row = await svgProbe.compare(
            snapshot.groups,
            { x: 0.25, y: 0.125, width: 192, height: 192, density },
            mode,
            128,
            4,
            matte,
          );
          rows.push({ density, mode, ...row });
        }
    const rawAfter = Array.from({ length: core.count() }, (_, id) => core.raw_length(id));
    return {
      rows,
      rawBefore,
      rawAfter,
      snapshot: {
        revision: snapshot.revision,
        origin: snapshot.origin,
        packets: snapshot.packets,
        derivedBytes: snapshot.derivedBytes,
        retainedBytes: snapshot.retainedBytes,
        bounds: snapshot.bounds,
        groups: snapshot.groups.length,
      },
    };
  });
  for (const row of result.rows) {
    const name = `${row.mode}-${row.density}-${row.matte}`;
    await writeFile(`${output}/${name}.svg`, row.svg);
    await writeFile(`${output}/${name}-reference.png`, Buffer.from(row.reference));
    await writeFile(
      `${output}/${name}-difference.png`,
      Buffer.from(row.difference.split(",")[1], "base64"),
    );
    delete row.svg;
    delete row.reference;
    delete row.difference;
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { url, source: "isolated Rust snapshot, production shader reference", ...result },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
