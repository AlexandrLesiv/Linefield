import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  rows = [];
try {
  for (let repeat = 0; repeat < 3; repeat++)
    for (const candidate of repeat % 2 ? [true, false] : [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      await page.goto(
        candidate ? process.env.LINEFIELD_PREVIEW_URL : process.env.LINEFIELD_BASELINE_URL,
      );
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      const measurement = await frame.evaluate(async () => {
        const c = document.querySelector("canvas"),
          r = c.getBoundingClientRect(),
          next = () => new Promise((resolve) => requestAnimationFrame(resolve));
        c.setPointerCapture = () => {};
        c.hasPointerCapture = () => true;
        c.releasePointerCapture = () => {};
        const make = (type, x, y, p) =>
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 98,
            pointerType: "pen",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pressure: p,
            clientX: r.x + x,
            clientY: r.y + y,
          });
        const dispatchMs = [],
          frames = [];
        let last;
        for (let brush = 0; brush < 3; brush++) {
          const control = document.querySelector("#brush");
          control.value = String(brush);
          control.dispatchEvent(new Event("change"));
          c.dispatchEvent(make("pointerdown", 200, 250 + brush * 70, 0.2));
          let end;
          for (let batch = 0; batch < 32; batch++) {
            const samples = Array.from({ length: 64 }, (_sample, i) => {
              const n = batch * 64 + i + 1;
              return make(
                "pointermove",
                200 + n / 4,
                250 + brush * 70 + Math.sin(n / 64) * 20,
                0.2 + (0.8 * (i % 31)) / 30,
              );
            });
            end = samples.at(-1);
            const move = make("pointermove", end.clientX - r.x, end.clientY - r.y, end.pressure);
            Object.defineProperty(move, "getCoalescedEvents", { value: () => samples });
            const begin = performance.now();
            c.dispatchEvent(move);
            dispatchMs.push(performance.now() - begin);
            const time = await next();
            if (last !== undefined) frames.push(time - last);
            last = time;
          }
          c.dispatchEvent(make("pointerup", end.clientX - r.x, end.clientY - r.y, 0));
          await next();
        }
        for (let i = 0; lab.renderPending() && i < 240; i++) await next();
        if (lab.renderPending()) throw Error("Render timeout");
        const raw = Array.from({ length: lab.core.count() }, (_stroke, id) =>
          Array.from({ length: lab.core.raw_length(id) }, (_sample, i) => [
            String(lab.core.raw_region(id, i, 0)),
            String(lab.core.raw_region(id, i, 1)),
            lab.core.raw_local(id, i, 0),
            lab.core.raw_local(id, i, 1),
            lab.core.raw_point(id, i, 2),
          ]),
        );
        if (raw.length !== 3 || raw.some((points) => points.length !== 2049))
          throw Error("Accepted input lost");
        const rawHash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(raw))),
          ),
        );
        return {
          dispatchMs,
          frames,
          rawHash,
          samples: 6147,
          canvas: [c.width, c.height],
          dpr: devicePixelRatio,
        };
      });
      rows.push({ repeat, candidate, ...measurement });
      await page.close();
    }
  if (rows.some((r) => JSON.stringify(r.rawHash) !== JSON.stringify(rows[0].rawHash)))
    throw Error("Input differs between runs/builds");
  console.log(
    "PASS six paced coalesced-input runs, 96x64-sample batches/run plus stroke starts; canonical checksums identical",
  );
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        cpu: cpus()[0]?.model,
        totalmem: totalmem(),
        headless: true,
        notes:
          "Synthetic batches paced one per rAF. Dispatch durations exclude event construction; no GPU readbacks/profiling. Not physical Wacom/display latency.",
        rows,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
