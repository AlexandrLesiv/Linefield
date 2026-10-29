import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("isolated URL required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save05-performance";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const mode of ["baseline", "saving", "saving", "baseline", "baseline", "saving"]) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    const p = await context.newPage();
    await p.goto(new URL("drawing/preview-new", url).href);
    await p.locator("iframe").waitFor();
    const f = p.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
    await f.waitForFunction(() => !!window.lab);
    await f.evaluate(() => {
      const e = lab.core;
      for (let i = 0; i < 1000; i++) {
        e.begin_with_style(4, 0x123456, 0.1, 1.5, 0.6);
        e.set_active_brush(i % 3);
        for (let j = 0; j < 8; j++)
          e.push_precise(30 + (i % 80) * 12 + j, 40 + Math.floor(i / 80) * 15, 0.5);
        e.commit();
      }
      lab.requestRedraw();
    });
    await f.waitForFunction(() => !lab.renderPending());
    if (mode === "baseline") await f.evaluate(() => lab.saving.flush(true));
    const result = await f.evaluate(async (variant) => {
      const e = lab.core,
        c = document.querySelector("canvas"),
        r = c.getBoundingClientRect(),
        startCount = e.count();
      c.setPointerCapture = () => {};
      c.hasPointerCapture = () => true;
      c.releasePointerCapture = () => {};
      const delays = [],
        frames = [];
      let frame,
        last = performance.now();
      const observe = (now) => {
        frames.push(now - last);
        last = now;
        frame = requestAnimationFrame(observe);
      };
      frame = requestAnimationFrame(observe);
      lab.metrics.inputMs.length = 0;
      lab.metrics.frameMs.length = 0;
      lab.metrics.renderMs.length = 0;
      lab.saving.metrics.length = 0;
      const started = performance.now(),
        pending = variant === "saving" ? lab.saving.flush(true) : Promise.resolve();
      const expected = [];
      for (let i = 0; i < 80; i++) {
        const due = performance.now() + 4;
        await new Promise((resolve) => setTimeout(resolve, 4));
        delays.push(Math.max(0, performance.now() - due));
        const type = i % 2 ? "pen" : "mouse",
          pressure = type === "pen" ? 0.6 : 0.5;
        const points = [];
        for (let j = 0; j < 3; j++) {
          const x = 60 + i * 9 + j * 3,
            y = 350 + (i % 4) * 15 + j;
          c.dispatchEvent(
            new PointerEvent(j === 0 ? "pointerdown" : j === 2 ? "pointerup" : "pointermove", {
              bubbles: true,
              pointerId: 501,
              pointerType: type,
              isPrimary: true,
              button: 0,
              buttons: j === 2 ? 0 : 1,
              pressure: j === 2 ? 0 : pressure,
              clientX: r.left + x,
              clientY: r.top + y,
            }),
          );
          points.push([x, y]);
        }
        expected.push(points);
      }
      await pending;
      cancelAnimationFrame(frame);
      if (e.count() !== startCount + 80) throw Error("lost stroke");
      let accepted = 0;
      for (let i = 0; i < 80; i++) {
        const n = e.raw_length(startCount + i);
        accepted += n;
        if (n !== 3) throw Error("lost samples " + n);
        for (let j = 0; j < 3; j++)
          if (
            e.raw_local(startCount + i, j, 0) !== expected[i][j][0] ||
            e.raw_local(startCount + i, j, 1) !== expected[i][j][1]
          )
            throw Error("changed sample");
      }
      const summary = (values) => {
        const a = [...values].sort((x, y) => x - y);
        return {
          n: a.length,
          median: (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2,
          p95: a[Math.max(0, Math.ceil(a.length * 0.95) - 1)],
          max: a.at(-1),
        };
      };
      return {
        mode: variant,
        accepted,
        elapsed: performance.now() - started,
        inputDelay: summary(delays),
        frames: summary(frames),
        inputHandler: summary(lab.metrics.inputMs),
        render: summary(lab.metrics.renderMs),
        saveSteps: summary(lab.saving.metrics.map((m) => m.ms)),
        raw: { delays, frames, save: lab.saving.metrics },
      };
    }, mode);
    results.push(result);
    await context.close();
  }
  await writeFile(
    out + "/results.json",
    JSON.stringify(
      { browser: browser.version(), viewport: [1200, 1000], dpr: 2, results },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results.map(({ raw: _raw, ...r }) => r)));
} finally {
  await browser.close();
}
