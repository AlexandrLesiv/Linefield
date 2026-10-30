import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg01/primary-witness";
const tolerance = Number(process.env.LINEFIELD_SVG_TOLERANCE ?? 0.025);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 2,
  });
  await page.goto("http://127.0.0.1:65390");
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  if (!(await frame.locator("#paper-style").isVisible()))
    await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#paper-style").selectOption("none");
  await frame.locator("#grid-style").selectOption("none");
  await page.keyboard.press("Escape");
  const liveCanvas = frame.locator("canvas").first(),
    box = await liveCanvas.boundingBox();
  for (const brush of ["0", "1", "2"]) {
    await frame.locator("#brush").selectOption(brush);
    await frame.locator("#width").focus();
    await page.keyboard.press("End");
    await page.mouse.move(box.x + 150, box.y + 100 + Number(brush) * 70);
    await page.mouse.down();
    for (let i = 1; i <= 30; i++)
      await page.mouse.move(
        box.x + 150 + i * 10,
        box.y + 100 + Number(brush) * 70 + Math.sin(i / 3) * 30,
      );
    await page.mouse.up();
  }
  await page.mouse.move(2, 2);
  await frame.evaluate(() => document.activeElement?.blur());
  await frame.waitForFunction(() => !lab.renderPending());
  await frame.addStyleTag({ content: "main > aside { visibility: hidden !important; }" });
  const reference = await liveCanvas.screenshot();
  await writeFile(output + "/primary.png", reference);
  const artifact = await frame.evaluate(async (captureTolerance) => {
    await import("/assets/index-DPwW8Cdc.js");
    const core = lab.core,
      rawBefore = Array.from({ length: core.count() }, (_, id) => core.raw_length(id));
    const snapshot = await svgProbe.capture(core, captureTolerance),
      camera = lab.view(),
      canvas = document.querySelector("canvas"),
      rect = canvas.getBoundingClientRect();
    if (camera.rotation !== 0) throw Error("Witness requires upright matched camera");
    const result = await svgProbe.job(
      snapshot.groups,
      {
        x: -camera.cx / camera.zoom,
        y: -camera.cy / camera.zoom,
        width: rect.width / camera.zoom,
        height: rect.height / camera.zoom,
        density: (camera.zoom * canvas.width) / rect.width,
      },
      "whole",
    );
    return {
      svg: result.svg,
      width: canvas.width,
      height: canvas.height,
      rawBefore,
      rawAfter: Array.from({ length: core.count() }, (_, id) => core.raw_length(id)),
      camera,
      snapshotRevision: snapshot.revision,
      tolerance: captureTolerance,
      build: lab.inputDiagnostics().build,
    };
  }, tolerance);
  await writeFile(output + "/export.svg", artifact.svg);
  const result = await frame.evaluate(
    async ({ artifact: exported, reference: png }) => {
      const render = async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = exported.width;
        canvas.height = exported.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        return { canvas, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
      };
      const a = await render("data:image/png;base64," + png),
        b = await render("data:image/svg+xml;base64," + btoa(exported.svg));
      let changed = 0,
        max = 0,
        sum = 0;
      const ctx = b.canvas.getContext("2d"),
        diff = ctx.createImageData(exported.width, exported.height);
      for (let p = 0; p < a.data.length / 4; p++) {
        let any = false;
        for (let c = 0; c < 4; c++) {
          const d = Math.abs(a.data[p * 4 + c] - b.data[p * 4 + c]);
          max = Math.max(max, d);
          sum += d;
          any ||= d > 0;
          diff.data[p * 4 + c] = c === 3 ? 255 : d;
        }
        if (any) changed++;
      }
      const candidate = b.canvas.toDataURL();
      const visual = document.createElement("canvas");
      visual.width = 2400;
      visual.height = 650;
      const vc = visual.getContext("2d");
      vc.fillStyle = "white";
      vc.fillRect(0, 0, 2400, 650);
      vc.fillStyle = "black";
      vc.font = "18px sans-serif";
      ["Actual app · DPR 2", "Whole-group SVG · DPR 2", "Absolute difference ×8 (clipped)"].forEach(
        (label, i) => vc.fillText(label, i * 800 + 12, 30),
      );
      vc.drawImage(a.canvas, 240, 90, 800, 600, 0, 50, 800, 600);
      vc.drawImage(b.canvas, 240, 90, 800, 600, 800, 50, 800, 600);
      ctx.putImageData(diff, 0, 0);
      const unscaledDifference = b.canvas.toDataURL();
      for (let i = 0; i < diff.data.length; i++)
        if (i % 4 !== 3) diff.data[i] = Math.min(255, diff.data[i] * 8);
      ctx.putImageData(diff, 0, 0);
      vc.drawImage(b.canvas, 240, 90, 800, 600, 1600, 50, 800, 600);
      return {
        changed,
        max,
        mean: sum / a.data.length,
        candidate,
        difference: unscaledDifference,
        comparison: visual.toDataURL(),
      };
    },
    { artifact, reference: reference.toString("base64") },
  );
  for (const key of ["candidate", "difference", "comparison"]) {
    await writeFile(output + "/" + key + ".png", Buffer.from(result[key].split(",")[1], "base64"));
    delete result[key];
  }
  delete artifact.svg;
  await writeFile(output + "/results.json", JSON.stringify({ artifact, ...result }, null, 2));
  console.log(JSON.stringify({ artifact, ...result }));
} finally {
  await browser.close();
}
