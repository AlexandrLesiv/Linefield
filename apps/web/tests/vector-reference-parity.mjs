import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/parity";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const hash = (data) => createHash("sha256").update(data).digest("hex");
async function capture(url, integrated, name) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: integrated ? 1000 : 948 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  if (integrated) await page.locator(".new-tile").click();
  const host = integrated ? page.frameLocator("iframe") : page;
  await host.locator("#brush").waitFor();
  const frame = integrated
    ? page.frames().find((candidate) => candidate.url().includes("/vector-editor/"))
    : page.mainFrame();
  await frame.waitForFunction(() => !!window.lab, {}, { timeout: 15000 });
  const canvas = host.locator("canvas");
  const box = await canvas.boundingBox();
  const images = {};
  async function settled(label) {
    await frame.waitForFunction(() => !window.lab.renderPending(), {}, { timeout: 30000 });
    const png = await canvas.screenshot();
    images[label] = hash(png);
    await writeFile(`${output}/${name}-${label}.png`, png);
  }
  for (const brush of [0, 1, 2]) {
    await host.locator("#brush").selectOption(String(brush));
    await host.locator("#opacity").fill("65");
    await host.locator("#width").fill("35");
    await page.mouse.move(box.x + 220, box.y + 260 + brush * 35);
    await page.mouse.down();
    for (let step = 1; step <= 48; step++) {
      await page.mouse.move(
        box.x + 220 + step * 10,
        box.y + 260 + brush * 35 + Math.round(Math.sin(step / 5) * 60),
      );
    }
    await page.mouse.up();
  }
  await settled("brushes");
  await host.locator("#pan").click();
  await page.mouse.move(box.x + 800, box.y + 500);
  await page.mouse.down();
  await page.mouse.move(box.x + 640, box.y + 410, { steps: 12 });
  await page.mouse.up();
  await settled("pan");
  await page.mouse.wheel(0, 420);
  await frame.waitForFunction(() => window.lab.view().zoom < 1);
  await settled("zoom");
  await host.locator("#undo").click();
  await settled("undo");
  await host.locator("#redo").click();
  await settled("redo");
  const state = await frame.evaluate(() => {
    const core = window.lab.core;
    const strokes = Array.from({ length: core.count() }, (_, id) => ({
      brush: core.brush(id),
      visible: core.visible(id),
      opacity: core.opacity(id),
      raw: Array.from({ length: core.raw_length(id) }, (unused, index) =>
        [0, 1, 2].map((field) => core.raw_point(id, index, field)),
      ),
    }));
    return {
      strokes,
      camera: window.lab.view(),
      dimensions: [document.querySelector("canvas").width, document.querySelector("canvas").height],
    };
  });
  await page.close();
  if (errors.length) throw Error(errors.join("\n"));
  return { state, images };
}
try {
  const reference = await capture(
    process.env.LINEFIELD_REFERENCE_URL || "http://127.0.0.1:65280/",
    false,
    "reference",
  );
  const integrated = await capture(
    process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65282/",
    true,
    "integrated",
  );
  const result = {
    browser: browser.version(),
    dpr: 2,
    reference,
    integrated,
    stateEqual: JSON.stringify(reference.state) === JSON.stringify(integrated.state),
    imagesEqual: JSON.stringify(reference.images) === JSON.stringify(integrated.images),
  };
  await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
  if (!result.stateEqual || !result.imagesEqual)
    throw Error(
      `Reference parity failed: state=${result.stateEqual}, images=${result.imagesEqual}; inspect ${output}`,
    );
  console.log(
    "PASS exact reference pixels and raw samples: three translucent brushes, pan, zoom, Undo/Redo at DPR 2",
  );
} finally {
  await browser.close();
}
