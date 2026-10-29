import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/selection-policy";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const variant of ["previous", "shared"])
    for (let brush = 0; brush < 3; brush++) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        variant === "shared"
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65316/"
          : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65315/",
      );
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      const result = await frame.evaluate(async (brushId) => {
        const c = document.querySelector("canvas"),
          r = c.getBoundingClientRect();
        let captured = null;
        c.setPointerCapture = (id) => {
          captured = id;
        };
        c.hasPointerCapture = (id) => captured === id;
        c.releasePointerCapture = () => {
          captured = null;
        };
        const event = (type, x, y) =>
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 801,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              clientX: r.left + x,
              clientY: r.top + y,
            }),
          );
        const click = (id) => document.querySelector(`#${id}`).click();
        const paint = () =>
          new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const set = (id, value) => {
          const el = document.querySelector(`#${id}`);
          el.value = String(value);
          el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input"));
        };
        set("brush", brushId);
        set("width", 24);
        const draw = async () => {
          click("pen");
          event("pointerdown", 300, 300);
          for (let i = 1; i <= 128; i++) event("pointermove", 300 + i * 2, 300);
          event("pointerup", 556, 300);
          await paint();
        };
        for (let layer = 0; layer < 3; layer++) {
          if (layer) lab.layers.create();
          await draw();
        }
        const checks = [];
        const query = async (label, pick, lasso, active = false) => {
          click("select");
          click("selection-clear");
          click("selection-pick-mode");
          document.querySelector("#selection-active-layer").checked = active;
          event("pointerdown", 420, 300);
          event("pointerup", 420, 300);
          const picked = lab.selection();
          click("selection-clear");
          click("selection-lasso-mode");
          document.querySelector("#selection-partial").checked = false;
          event("pointerdown", 250, 250);
          for (const p of [
            [650, 250],
            [650, 350],
            [250, 350],
            [250, 250],
          ])
            event("pointermove", ...p);
          event("pointerup", 250, 250);

          for (let n = 0; window.lab.lassoWorker?.().pending; n++) {
            if (n > 300) throw Error("Lasso worker did not settle");
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          const enclosed = lab.selection();
          if (
            JSON.stringify(picked) !== JSON.stringify(pick) ||
            JSON.stringify(enclosed) !== JSON.stringify(lasso)
          )
            throw Error(`${label}: ${JSON.stringify({ picked, enclosed })}`);
          checks.push({ label, picked, enclosed });
          click("selection-clear");
          await paint();
        };
        await query("top visible layer", [2], [0, 1, 2]);
        lab.layers.locked(2, true);
        await query("locked top excluded", [1], [0, 1]);
        lab.layers.visible(1, false);
        await query("hidden middle excluded", [0], [0]);
        lab.layers.select(2);
        await query("active locked excludes all", [], [], true);
        lab.layers.locked(2, false);
        await query("active unlocked only", [2], [2], true);
        lab.layers.move(0, 2);
        await query("reordered layer first", [0], [0, 2]);
        click("undo");
        await query("undo layer order", [2], [0, 2]);
        lab.layers.visible(1, true);
        lab.layers.select(2);
        set("opacity", 0);
        await draw();
        await query("zero-opacity ink excluded", [2], [0, 1, 2]);
        return { checks, rawLengths: [0, 1, 2, 3].map((id) => lab.core.raw_length(id)) };
      }, brush);
      if (errors.length) throw Error(errors.join("; "));
      if (result.rawLengths.some((n) => n !== 129)) throw Error("Raw samples changed");
      results.push({ variant, brush, ...result });
      await page.close();
    }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    "PASS 48 actual-input layer-policy scenarios with Pick and Lasso, all brushes, previous/shared previews",
  );
} finally {
  await browser.close();
}
