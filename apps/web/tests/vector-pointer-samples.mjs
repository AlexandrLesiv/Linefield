import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/pointer-samples";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const variant of ["previous", "shared"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      variant === "shared"
        ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65323/"
        : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65321/",
    );
    await page.locator(".new-tile").click();
    await page.frameLocator("iframe").locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const scenarioResults = await frame.evaluate(() => {
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
      let pointerType = "pen";
      const make = (type, x, pressure) =>
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 801,
          pointerType,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          pressure,
          clientX: r.left + x,
          clientY: r.top + 250,
        });
      const event = (type, x, pressure) => c.dispatchEvent(make(type, x, pressure));
      const set = (id, value) => {
        const el = document.querySelector(`#${id}`);
        el.value = String(value);
        el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input"));
      };
      const cases = [];
      for (let brush = 0; brush < 3; brush++)
        for (const fixed of [false, true]) {
          pointerType = fixed ? "mouse" : "pen";
          set("brush", brush);
          set("width", 24);
          set("color", "#123456");
          set("opacity", 65);
          set("pressure-min", 20);
          set("pressure-curve", 1);
          document.querySelector("#fixed-width").checked = fixed;
          const id = lab.core.count();
          event("pointerdown", 200, 0.2);
          // Editing controls while contact is held affects only future strokes.
          set("width", 48);
          set("color", "#654321");
          set("opacity", 25);
          set("pressure-min", 5);
          set("pressure-curve", 1.8);
          document.querySelector("#fixed-width").checked = !fixed;
          const move = make("pointermove", 400, 1);
          Object.defineProperty(move, "getCoalescedEvents", {
            value: () => [make("pointermove", 300, 0.8), make("pointermove", 400, 1)],
          });
          c.dispatchEvent(move);
          event("pointerup", 450, 0);
          const core = lab.core;
          const before = {
            brush: core.brush(id),
            color: core.color(id),
            opacity: core.opacity(id),
            x: Array.from({ length: core.raw_length(id) }, (_, i) => core.raw_local(id, i, 0)),
            raw: Array.from({ length: core.raw_length(id) }, (_, i) => core.raw_point(id, i, 2)),
            radii: Array.from({ length: core.length(id) }, (_, i) => core.point(id, i, 2)),
          };
          if (
            before.brush !== brush ||
            before.color !== 0x123456 ||
            Math.abs(before.opacity - 0.65) > 1e-6 ||
            before.raw.length !== 4 ||
            Math.abs(before.raw[0] - (fixed ? 1 : 0.2)) > 1e-6 ||
            Math.abs(before.raw[1] - (fixed ? 1 : 0.8)) > 1e-6 ||
            before.raw[2] !== 1 ||
            before.raw[3] !== 1
          )
            throw Error("Accepted style/pressure changed");
          if (
            before.x[1] - before.x[0] !== 100 ||
            before.x[2] - before.x[1] !== 100 ||
            before.x[3] - before.x[2] !== 50
          )
            throw Error("Coalesced or release position was lost");
          if (
            fixed ? !before.radii.every((d) => d === 12) : before.radii[0] === before.radii.at(-1)
          )
            throw Error("Fixed/variable width behavior changed");
          document.querySelector("#undo").click();
          document.querySelector("#redo").click();
          if (core.color(id) !== before.color || core.opacity(id) !== before.opacity)
            throw Error("Style history changed");
          cases.push({ brush, fixed, ...before });
        }
      return cases;
    });
    if (errors.length) throw Error(errors.join("; "));
    results.push({ variant, cases: scenarioResults });
    await page.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  if (JSON.stringify(results[0].cases) !== JSON.stringify(results[1].cases))
    throw Error("Brush style differs from previous preview");
  console.log(
    "PASS coalesced pen/mouse samples, changed release with last pressure, style/history across three brushes",
  );
} finally {
  await browser.close();
}
