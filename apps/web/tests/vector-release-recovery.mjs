import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/release-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const source of ["mouse", "pen"]) {
    for (const caseName of [
      "normal",
      "chord",
      "queued-up",
      "delayed",
      "outside",
      "wrong-source",
      "stale",
      "cancel",
      "blur",
      "pressed-loss",
      "reuse",
    ]) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65348/");
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      const result = await frame.evaluate(
        async ({ pointerType, scenario }) => {
          const canvas = document.querySelector("canvas"),
            rect = canvas.getBoundingClientRect();
          let captured = false;
          canvas.setPointerCapture = () => {
            captured = true;
          };
          canvas.hasPointerCapture = () => captured;
          canvas.releasePointerCapture = () => {
            captured = false;
          };
          let stamp = performance.now();
          const send = (kind, x = 450, extra = {}, target = canvas) => {
            const event = new PointerEvent(kind, {
              bubbles: true,
              pointerId: 501,
              pointerType,
              isPrimary: true,
              button: kind === "lostpointercapture" ? -1 : 0,
              buttons: ["pointerup", "lostpointercapture", "pointercancel"].includes(kind) ? 0 : 1,
              pressure: 0.7,
              clientX: rect.left + x,
              clientY: rect.top + 250,
              ...extra,
            });
            Object.defineProperty(event, "timeStamp", { value: ++stamp });
            target.dispatchEvent(event);
          };
          const state = () => ({
            raw: lab.core.raw_length(0),
            visible: lab.core.visible(0),
            undo: lab.core.can_undo(),
          });
          send("pointerdown", 200);
          for (let i = 1; i <= 50; i++) send("pointermove", 200 + i * 5);
          const live = state();
          if (!["normal", "chord"].includes(scenario)) {
            captured = false;
            send("lostpointercapture", 450, { buttons: scenario === "pressed-loss" ? 1 : 0 });
          }
          const pending = state();
          if (scenario === "delayed") await new Promise((resolve) => setTimeout(resolve, 250));
          if (scenario === "wrong-source")
            send("pointerup", 450, { pointerType: pointerType === "pen" ? "mouse" : "pen" });
          if (scenario === "stale") {
            stamp -= 100;
            send("pointerup");
            stamp += 100;
          }
          const beforeRelease = state();
          if (scenario === "queued-up") stamp -= 2;
          if (scenario === "cancel") send("pointercancel", 450, {}, document.body);
          if (scenario === "blur") window.dispatchEvent(new Event("blur"));
          if (scenario === "reuse") {
            send("pointerdown", 600);
            stamp -= 100;
            send("pointerup", 450);
            stamp += 100;
            send("pointermove", 650);
            send("pointerup", 650);
          } else
            send(
              "pointerup",
              450,
              { button: scenario === "chord" ? 2 : 0 },
              scenario === "outside" ? document.body : canvas,
            );
          const committed = state();
          send("pointerup"); // Duplicate release must never create another history entry.
          const log = lab.inputDiagnostics();
          lab.core.undo();
          const undone = lab.core.visible(scenario === "reuse" ? 1 : 0);
          lab.core.redo();
          const redone = lab.core.visible(scenario === "reuse" ? 1 : 0);
          return {
            pointerType,
            scenario,
            live,
            pending,
            beforeRelease,
            committed,
            undone,
            redone,
            log,
            reusedRaw: scenario === "reuse" ? lab.core.raw_length(1) : null,
          };
        },
        { pointerType: source, scenario: caseName },
      );
      assert.deepEqual(result.live, { raw: 51, visible: 1, undo: 0 });
      const cancelled = ["cancel", "blur", "pressed-loss", "reuse"].includes(caseName);
      if (caseName !== "pressed-loss") assert.deepEqual(result.pending, result.live);
      if (["wrong-source", "stale", "delayed"].includes(caseName))
        assert.deepEqual(result.beforeRelease, result.live);
      assert.equal(result.committed.raw, cancelled ? 0 : 51);
      assert.equal(result.committed.visible, cancelled ? 0 : 1);
      assert.equal(result.committed.undo, cancelled && caseName !== "reuse" ? 0 : 1);
      assert.equal(result.undone, 0);
      assert.equal(result.redone, cancelled && caseName !== "reuse" ? 0 : 1);
      assert.equal(
        result.log.entries.filter((e) => e.kind === "commit").length,
        cancelled && caseName !== "reuse" ? 0 : 1,
      );
      if (caseName === "reuse") assert.equal(result.reusedRaw, 2);
      assert(!JSON.stringify(result.log).match(/clientX|clientY|pressure|points|coordinates/));
      assert.deepEqual(errors, []);
      results.push(result);
      await page.close();
    }
  }
  const page = await browser.newPage();
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65349/");
  await page.locator(".new-tile").click();
  const canvas = page.frameLocator("iframe").locator("canvas").first();
  await canvas.waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, box.y + 200, { steps: 20 });
  await page.mouse.up();
  assert.equal(await frame.evaluate(() => lab.core.can_undo()), 1);
  assert.equal(
    await frame.evaluate(
      () => lab.inputDiagnostics().entries.find((e) => e.kind === "commit").trusted,
    ),
    true,
  );
  await frame.evaluate(() => {
    const target = document.querySelector("canvas");
    target.setPointerCapture = () => {};
    target.hasPointerCapture = () => false;
    for (let i = 0; i < 150; i++) {
      for (const type of ["pointerdown", "pointerup"])
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerType: "mouse",
            pointerId: 900,
            button: 0,
            buttons: type === "pointerdown" ? 1 : 0,
            clientX: 200,
            clientY: 200,
          }),
        );
    }
  });
  const log = await frame.evaluate(() => lab.inputDiagnostics());
  assert.equal(log.entries.length, 256);
  assert(log.dropped > 0);
  assert(!JSON.stringify(log).match(/https?:|clientX|clientY|pressure|coordinates/));
  const download = page.waitForEvent("download");
  await frame.evaluate(() => lab.downloadInputDiagnostics());
  await (await download).saveAs(`${output}/exported-diagnostics.json`);
  await page.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    `${results.length} mouse/pen lifecycle browser cases passed (injected event ordering, not physical-device evidence).`,
  );
} finally {
  await browser.close();
}
