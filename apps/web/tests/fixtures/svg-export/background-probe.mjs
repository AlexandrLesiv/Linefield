import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = ".build-cache/svg01/background";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:65389");
  await page.waitForFunction(() => !!window.svgProbe);
  const results = await page.evaluate(async () => {
    const { instance } = await WebAssembly.instantiate(
        await (await fetch("/core.wasm")).arrayBuffer(),
        {},
      ),
      core = instance.exports;
    core.begin_with_style(15, 0x335588, 0.1, 1, 0.5);
    core.push_precise(20, 20, 0.5);
    core.push_precise(150, 150, 0.9);
    core.commit();
    const snapshot = await svgProbe.capture(core, 0.025),
      view = { x: 0.25, y: 0.125, width: 192, height: 192, density: 2, regionX: "0", regionY: "0" },
      rows = [];
    for (const texture of ["warm", "white"])
      for (const grid of ["none", "notebook", "dots"]) {
        const row = await svgProbe.compare(snapshot.groups, view, "whole", 1024, 4, "white", {
          texture,
          grid,
        });
        rows.push({ texture, grid, ...row });
      }
    const settings = { texture: "warm", grid: "notebook" };
    const a = await svgProbe.job(snapshot.groups, view, "reference", 1024, 4, settings),
      b = await svgProbe.job(
        snapshot.groups,
        { ...view, regionX: String(3n * 2n ** 44n), regionY: String(3n * 2n ** 44n) },
        "reference",
        1024,
        4,
        settings,
      );
    const regionalBytesEqual = new Uint8Array(a.bytes).every(
      (v, i) => v === new Uint8Array(b.bytes)[i],
    );
    const regionalCapture = async (region) => {
      const { instance: isolated } = await WebAssembly.instantiate(
        await (await fetch("/core.wasm")).arrayBuffer(),
        {},
      );
      const engine = isolated.exports;
      engine.begin_with_style(15, 0x335588, 0.1, 1, 0.5);
      engine.push_regional(region, 20, region, 20, 0.5);
      engine.push_regional(region, 150, region, 150, 0.9);
      engine.commit();
      const captured = await svgProbe.capture(engine, 0.025);
      const rendered = await svgProbe.job(
        captured.groups,
        { ...view, regionX: captured.origin[0].region, regionY: captured.origin[1].region },
        "reference",
        1024,
        4,
        settings,
      );
      return {
        bytes: new Uint8Array(rendered.bytes),
        origin: captured.origin,
        phase: engine.regional_phase(region, 0, 24),
      };
    };
    const smallPhase = await regionalCapture(1n),
      hugePhase = await regionalCapture(2n ** 53n + 2n);
    const nonzeroRegional = {
      small: smallPhase.origin,
      huge: hugePhase.origin,
      smallPhase: smallPhase.phase,
      hugePhase: hugePhase.phase,
      equal:
        smallPhase.bytes.length === hugePhase.bytes.length &&
        smallPhase.bytes.every((v, i) => v === hugePhase.bytes[i]),
      differsFromZero:
        smallPhase.bytes.length !== new Uint8Array(a.bytes).length ||
        smallPhase.bytes.some((v, i) => v !== new Uint8Array(a.bytes)[i]),
    };
    if (
      !nonzeroRegional.equal ||
      !nonzeroRegional.differsFromZero ||
      nonzeroRegional.smallPhase !== 16 ||
      nonzeroRegional.hugePhase !== 16
    )
      throw Error("Regional background phase mismatch");
    let transparentGrid = "";
    try {
      await svgProbe.job(snapshot.groups, view, "whole", 1024, 4, {
        texture: "none",
        grid: "notebook",
      });
    } catch (error) {
      transparentGrid = String(error);
    }
    return { rows, regionalBytesEqual, nonzeroRegional, transparentGrid };
  });
  for (const row of results.rows) {
    const label = `${row.texture}-${row.grid}`;
    await writeFile(`${output}/${label}.svg`, row.svg);
    await writeFile(`${output}/${label}-reference.png`, Buffer.from(row.reference));
    await writeFile(
      `${output}/${label}-difference.png`,
      Buffer.from(row.difference.split(",")[1], "base64"),
    );
    delete row.svg;
    delete row.reference;
    delete row.difference;
  }
  await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
