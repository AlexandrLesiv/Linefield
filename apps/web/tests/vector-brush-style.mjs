import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/brush-style";
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
        ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65318/"
        : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65317/",
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
      const event = (type, x, pressure) =>
        c.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 801,
            pointerType: "pen",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pressure,
            clientX: r.left + x,
            clientY: r.top + 250,
          }),
        );
      const set = (id, value) => {
        const el = document.querySelector(`#${id}`);
        el.value = String(value);
        el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input"));
      };
      const cases = [];
      for (let brush = 0; brush < 3; brush++)
        for (const fixed of [false, true]) {
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
          event("pointermove", 300, 0.8);
          event("pointermove", 400, 1);
          event("pointerup", 400, 0);
          const core = lab.core;
          const before = {
            brush: core.brush(id),
            color: core.color(id),
            opacity: core.opacity(id),
            raw: Array.from({ length: core.raw_length(id) }, (_, i) => core.raw_point(id, i, 2)),
            radii: Array.from({ length: core.length(id) }, (_, i) => core.point(id, i, 2)),
          };
          if (
            before.brush !== brush ||
            before.color !== 0x123456 ||
            Math.abs(before.opacity - 0.65) > 1e-6 ||
            before.raw.length !== 3 ||
            Math.abs(before.raw[0] - 0.2) > 1e-6 ||
            Math.abs(before.raw[1] - 0.8) > 1e-6 ||
            before.raw[2] !== 1
          )
            throw Error("Accepted style/pressure changed");
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
    "PASS fixed/pressure style freeze, raw-pressure preservation and history across three brushes, previous/shared previews",
  );
} finally {
  await browser.close();
}
