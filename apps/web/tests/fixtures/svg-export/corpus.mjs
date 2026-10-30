import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { scene } from "./scenes.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg01/corpus";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.LINEFIELD_SVG_URL ?? "http://127.0.0.1:65389");
  await page.waitForFunction(() => !!window.svgProbe);
  await page.evaluate(`window.seedScene=${scene.toString()}`);
  const rows = [];
  for (const name of ["overlap", "subpixel", "slice", "transform", "regional"]) {
    const cases = await page.evaluate(async (nameInput) => {
      const { instance } = await WebAssembly.instantiate(
          await (await fetch("/core.wasm")).arrayBuffer(),
          {},
        ),
        core = instance.exports;
      const before = seedScene(core, nameInput),
        snapshot = await svgProbe.capture(core, 0.025),
        rowsInput = [];
      for (const density of [1, 2, 4])
        for (const mode of ["whole", "hybrid"])
          for (const matte of ["white", "black"]) {
            const result = await svgProbe.compare(
              snapshot.groups,
              {
                x: 0.25,
                y: 0.125,
                width: 192,
                height: 192,
                density,
                regionX: snapshot.origin[0].region,
                regionY: snapshot.origin[1].region,
              },
              mode,
              1024,
              4,
              matte,
            );
            rowsInput.push({ name: nameInput, density, mode, ...result });
          }
      return {
        rows: rowsInput,
        before,
        after: {
          count: core.count(),
          raw: Array.from({ length: core.count() }, (_, id) => core.raw_length(id)),
        },
        groups: snapshot.groups.length,
        origin: snapshot.origin,
      };
    }, name);
    for (const row of cases.rows) {
      const label = `${name}-${row.mode}-${row.density}-${row.matte}`;
      if (row.density === 2 && row.matte === "white") {
        await writeFile(`${output}/${label}.svg`, row.svg);
        await writeFile(`${output}/${label}-reference.png`, Buffer.from(row.reference));
        await writeFile(
          `${output}/${label}-difference.png`,
          Buffer.from(row.difference.split(",")[1], "base64"),
        );
      }
      delete row.reference;
      delete row.difference;
      delete row.svg;
      rows.push(row);
    }
    await writeFile(
      `${output}/${name}-capture.json`,
      JSON.stringify(
        { before: cases.before, after: cases.after, groups: cases.groups, origin: cases.origin },
        null,
        2,
      ),
    );
    console.log(name + " measured");
  }
  await writeFile(output + "/results.json", JSON.stringify(rows, null, 2));
} finally {
  await browser.close();
}
