import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { digest, seed } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Separate actual SVG02 application preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg02/ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  page.on("dialog", (dialog) => dialog.accept());
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  let frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab && !!document.querySelector("#svg-export-open"));
  const open = async () => {
    await frame.locator("#editor-settings-toggle").click();
    await frame.locator("#svg-export-open").click();
    await frame.locator("#svg-export-options[open]").waitFor();
  };
  await seed(frame, 120);
  await frame.evaluate(() => lab.saving.flush(true));
  const before = await digest(frame);
  const historyBefore = await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]);
  await open();
  await page.screenshot({ path: `${output}/options-wide.png` });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.screenshot({ path: `${output}/options-narrow.png` });
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await frame.locator("#svg-density").inputValue(), "2");
  assert.equal(await frame.locator("#svg-background").inputValue(), "current");
  assert.equal(await frame.locator("#svg-grid").isChecked(), false);
  await frame.locator("#svg-background").selectOption("transparent");
  assert.equal(await frame.locator("#svg-grid").isDisabled(), true);
  await frame.locator("#svg-export-start").click();
  assert.equal(await frame.locator("#svg-export-options").evaluate((e) => e.open), false);
  await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
  const downloadEvent = page.waitForEvent("download");
  await frame.locator("#svg-export-download").click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "Linefield.svg");
  await download.saveAs(`${output}/drawing.svg`);
  const svg = await readFile(`${output}/drawing.svg`, "utf8");
  const image = await frame.evaluate(async (source) => {
    const xml = new DOMParser().parseFromString(source, "image/svg+xml");
    if (xml.querySelector("parsererror")) throw Error("Invalid SVG XML");
    const root = xml.documentElement;
    const elements = [...xml.querySelectorAll("*")];
    if (elements.some((e) => !["svg", "image", "rect", "g", "desc"].includes(e.localName)))
      throw Error("Unexpected SVG element");
    for (const element of elements)
      for (const attribute of element.attributes) {
        if (/^on/i.test(attribute.name)) throw Error("SVG event handler");
        if (attribute.localName === "href" && !attribute.value.startsWith("data:image/png;base64,"))
          throw Error("External SVG reference");
      }
    const blob = new Blob([source], { type: "image/svg+xml" });
    const uri = URL.createObjectURL(blob),
      img = new Image();
    img.src = uri;
    try {
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let covered = 0;
      for (let i = 3; i < pixels.length; i += 4) covered += Number(pixels[i] > 0);
      return {
        width: img.width,
        height: img.height,
        covered,
        images: root.querySelectorAll("image").length,
      };
    } finally {
      URL.revokeObjectURL(uri);
    }
  }, svg);
  assert.ok(image.covered > 0);
  assert.equal(image.images, 1);
  assert.equal(await digest(frame), before);
  assert.deepEqual(
    await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]),
    historyBefore,
  );
  assert.equal(await frame.evaluate(() => lab.saving.state().phase), "saved");
  results.push({
    name: "actual UI download, SVG decoding, input/history/save preservation",
    image,
    bytes: Buffer.byteLength(svg),
  });
  const firstUrl = await frame.locator("#svg-export-download").getAttribute("href");
  await frame.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  assert.equal(await frame.locator("#svg-export-download").getAttribute("href"), null);
  assert.equal(
    await frame.evaluate(async (oldUrl) => {
      try {
        await fetch(oldUrl);
        return true;
      } catch {
        return false;
      }
    }, firstUrl),
    false,
  );
  await open();
  await frame.locator("#svg-export-start").click();
  await frame.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })),
  );
  await frame.waitForFunction(() => !document.querySelector("#svg-export-open").disabled);
  await frame.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })),
  );
  assert.equal(await frame.locator("#svg-export-download").isVisible(), false);
  await open();
  await frame.locator("#svg-export-start").click();
  await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
  assert.equal(
    await frame.evaluate(async () =>
      (await fetch(document.querySelector("#svg-export-download").href)).text(),
    ),
    svg,
  );
  results.push({
    name: "injected persisted page lifecycle releases ready output, cancels pending work, and exports again exactly",
    actualBrowserBFCache: false,
  });
  await page.screenshot({ path: `${output}/ready.png` });
  await page.reload();
  await page.locator("iframe").waitFor();
  frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  assert.equal(await digest(frame), before);
  results.push({ name: "saved drawing survives reload after export" });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ results }, null, 2));
  console.log(JSON.stringify({ results }));
} finally {
  await browser.close();
}
