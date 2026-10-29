import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/coalesced-layout";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const rows = [];
try {
  for (const url of [process.env.LINEFIELD_BASELINE_URL, process.env.LINEFIELD_PREVIEW_URL]) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.locator(".new-tile").click();
    await page.frameLocator("iframe").locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const result = await frame.evaluate(() => {
      const c = document.querySelector("canvas"),
        original = c.getBoundingClientRect.bind(c);
      c.setPointerCapture = () => {};
      c.hasPointerCapture = () => true;
      c.releasePointerCapture = () => {};
      let reads = 0;
      c.getBoundingClientRect = () => {
        reads++;
        return original();
      };
      const make = (type, x, p) => {
        const r = original();
        return new PointerEvent(type, {
          bubbles: true,
          pointerId: 91,
          pointerType: "pen",
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
          pressure: p,
          clientX: r.x + x,
          clientY: r.y + 250,
        });
      };
      const expected = [[200, Math.fround(0.2)]];
      c.dispatchEvent(make("pointerdown", 200, 0.2));
      const counts = [];
      for (let batch = 0; batch < 4; batch++) {
        // Real layout offsets change between events, not just fabricated rectangles.
        c.style.transform = `translate(${batch * 13}px,${batch * 17}px)`;
        const samples = Array.from({ length: 32 }, (_, i) => {
          const x = 201 + batch * 32 + i,
            p = 0.1 + (0.8 * i) / 31;
          expected.push([x, Math.fround(p)]);
          return make("pointermove", x, p);
        });
        const event = make("pointermove", 232 + batch * 32, 0.9);
        Object.defineProperty(event, "getCoalescedEvents", { value: () => samples });
        reads = 0;
        c.dispatchEvent(event);
        counts.push(reads);
      }
      c.style.transform = "translate(-40px,22px)";
      c.dispatchEvent(make("pointerup", 329, 0));
      expected.push([329, Math.fround(0.9)]);
      const core = lab.core,
        raw = () =>
          Array.from({ length: core.raw_length(0) }, (_, i) => [
            String(core.raw_region(0, i, 0)),
            String(core.raw_region(0, i, 1)),
            core.raw_local(0, i, 0),
            core.raw_local(0, i, 1),
            core.raw_point(0, i, 2),
          ]);
      const before = raw();
      if (before.length !== 130) throw Error("Accepted sample lost");
      for (let i = 0; i < before.length; i++)
        if (
          before[i][2] - before[0][2] !== expected[i][0] - 200 ||
          before[i][3] !== before[0][3] ||
          before[i][4] !== expected[i][1]
        )
          throw Error(`Wrong mapped sample ${i}`);
      document.querySelector("#undo").click();
      document.querySelector("#redo").click();
      if (JSON.stringify(before) !== JSON.stringify(raw())) throw Error("History changed raw data");
      delete c.getBoundingClientRect;
      c.style.transform = "";
      return { counts, raw: before };
    });
    rows.push({ url, ...result });
    await page.close();
  }
  if (JSON.stringify(rows[0].raw) !== JSON.stringify(rows[1].raw))
    throw Error("Baseline/candidate input differs");
  if (rows[1].counts.some((n) => n !== 1)) throw Error("Candidate repeated batch bounds reads");
  console.log(
    "PASS 130 ordered pressure samples, fresh mapping across layout shifts/release, exact prior/current raw/history and one bounds read per32-sample batch",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}
