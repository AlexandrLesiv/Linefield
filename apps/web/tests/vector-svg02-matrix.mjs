import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { scene } from "./fixtures/svg-export/scenes.mjs";
import { digest } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL,
  referenceUrl = process.env.LINEFIELD_SVG_REFERENCE;
if (!url || !referenceUrl) throw Error("Separate product and frozen SVG01 reference URLs required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg02/matrix";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const rows = [];
try {
  const reference = await browser.newPage();
  await reference.goto(referenceUrl);
  await reference.waitForFunction(() => !!window.svgProbe);
  await reference.evaluate(`window.seedScene=${scene.toString()}`);
  for (const name of ["overlap", "subpixel", "slice", "transform", "regional", "empty"]) {
    const page = await browser.newPage({
      viewport: { width: 900, height: 700 },
      deviceScaleFactor: 2,
    });
    await page.goto(url);
    await page.locator(".new-tile").click();
    await page.locator("iframe").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab && !!document.querySelector("#svg-export-open"));
    await frame.evaluate(`window.seedScene=${scene.toString()}`);
    await frame.evaluate((sceneName) => {
      if (sceneName !== "empty") seedScene(lab.core, sceneName);
      lab.requestRedraw();
    }, name);
    const cases = (name === "empty" ? [1] : [1, 2, 4]).map((density) => ({
      density,
      background: "transparent",
      texture: "none",
      grid: "none",
    }));
    if (name === "overlap") {
      for (const texture of ["none", "warm", "white"])
        for (const grid of texture === "none" ? ["none"] : ["none", "notebook", "dots"])
          cases.push({ density: 2, background: "current", texture, grid });
      cases.push({ density: 2, background: "white", texture: "warm", grid: "none" });
    }
    for (const config of cases) {
      await frame.locator("#editor-settings-toggle").click();
      await frame.locator("#paper-style").selectOption(config.texture);
      await frame.locator("#grid-style").selectOption(config.grid);
      await frame.locator("#svg-export-open").click();
      await frame.locator("#svg-background").selectOption(config.background);
      await frame.locator("#svg-density").selectOption(String(config.density));
      if (config.grid !== "none") await frame.locator("#svg-grid").check();
      else if (await frame.locator("#svg-grid").isEnabled())
        await frame.locator("#svg-grid").uncheck();
      const before = await digest(frame);
      await frame.locator("#svg-export-start").click();
      await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
      const svg = await frame.evaluate(async () =>
        (await fetch(document.querySelector("#svg-export-download").href)).text(),
      );
      assert.equal(await digest(frame), before, "export preserves raw source data");
      const result = await reference.evaluate(
        async ({ source, sceneName, options }) => {
          const { instance } = await WebAssembly.instantiate(
            await (await fetch("/core.wasm")).arrayBuffer(),
            {},
          );
          const core = instance.exports;
          if (sceneName !== "empty") seedScene(core, sceneName);
          const snapshot = await svgProbe.capture(core, 0.25 / options.density);
          const xml = new DOMParser().parseFromString(source, "image/svg+xml"),
            root = xml.documentElement;
          if (root.tagName !== "svg" || xml.querySelector("parsererror"))
            throw Error("invalid product SVG");
          const [x, y, width, height] = root.getAttribute("viewBox").split(/\s+/).map(Number);
          const pw = Number(root.getAttribute("width")),
            ph = Number(root.getAttribute("height"));
          const opaqueWhite =
            options.background === "white" ||
            (options.background === "current" &&
              options.texture === "none" &&
              options.grid === "none");
          const paper =
            options.background === "current" && !opaqueWhite
              ? { texture: options.texture, grid: options.grid }
              : undefined;
          const rendered = await svgProbe.job(
            snapshot.groups,
            {
              x,
              y,
              width,
              height,
              density: options.density,
              regionX: snapshot.origin[0].region,
              regionY: snapshot.origin[1].region,
            },
            "reference",
            1024,
            4,
            paper,
          );
          const pixels = async (blob, matte) => {
            const image = new Image(),
              imageUrl = URL.createObjectURL(blob);
            try {
              image.src = imageUrl;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = pw;
              canvas.height = ph;
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = matte;
              ctx.fillRect(0, 0, pw, ph);
              ctx.drawImage(image, 0, 0, pw, ph);
              return ctx.getImageData(0, 0, pw, ph).data;
            } finally {
              URL.revokeObjectURL(imageUrl);
            }
          };
          const comparisons = [];
          for (const matte of ["white", "black"]) {
            const a = await pixels(
              new Blob([rendered.bytes], { type: "image/png" }),
              opaqueWhite ? "white" : matte,
            );
            const b = await pixels(new Blob([source], { type: "image/svg+xml" }), matte);
            let changed = 0,
              max = 0,
              sum = 0;
            for (let p = 0; p < pw * ph; p++) {
              let different = false;
              for (let c = 0; c < 4; c++) {
                const delta = Math.abs(a[p * 4 + c] - b[p * 4 + c]);
                different ||= delta !== 0;
                max = Math.max(max, delta);
                sum += delta;
              }
              if (different) changed++;
            }
            comparisons.push({ matte, changed, max, mean: sum / a.length });
          }
          return {
            comparisons,
            width: pw,
            height: ph,
            groups: snapshot.groups.length,
            origin: snapshot.origin,
            images: xml.querySelectorAll("image").length,
          };
        },
        { source: svg, sceneName: name, options: config },
      );
      const label = `${name}-${config.density}-${config.background}-${config.texture}-${config.grid}`;
      if (config.density === 2) await writeFile(`${output}/${label}.svg`, svg);
      rows.push({ name, ...config, ...result, rawPreserved: true });
      await writeFile(`${output}/results.json`, JSON.stringify(rows, null, 2));
      assert.ok(
        result.comparisons.every((r) => r.max <= 2),
        `${label}: exceeds native-resolution rounding witness`,
      );
      console.log(label + " measured");
    }
    await page.close();
  }
  await writeFile(
    `${output}/limitations.json`,
    JSON.stringify(
      {
        excludedReferenceCases: [
          "current solid white with notebook grid",
          "current solid white with dots grid",
        ],
        reason:
          "Frozen SVG01 fixture rejects texture:none with grid; these are not claimed as image-parity passes.",
        canonicalSceneSeeding: true,
        inputNote:
          "Scenes seed canonical engine directly; separate actual-input E2Es establish input behavior.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
