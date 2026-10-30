import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated checkpoint origin required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const results = await page.evaluate(async () => {
    const bytes = await (await fetch("/core.wasm")).arrayBuffer();
    const fresh = async () => (await WebAssembly.instantiate(bytes, {})).instance.exports;
    const check = (ok, message) => {
      if (!ok) throw Error(message);
    };
    const cases = [],
      timings = { prepare: [], next: [], cleanup: [] };
    const timed = (kind, fn) => {
      const t = performance.now(),
        v = fn();
      timings[kind].push(performance.now() - t);
      return v;
    };
    function draw(c, opacity = 1, rx = 0n, x = 10.125) {
      const id = c.begin_fixed_width(8, 0x236598, opacity);
      check(c.push_regional(rx, x, 0n, 20.25, 0.4) === 1, "first sample");
      check(c.push_regional(rx, x + 20, 0n, 30.5, 0.8) === 1, "second sample");
      c.commit();
      return id;
    }
    function raw(c) {
      return JSON.stringify(
        Array.from({ length: c.count() }, (_, id) => ({
          visible: c.visible(id),
          brush: c.brush(id),
          opacity: c.opacity(id),
          points: Array.from({ length: c.raw_length(id) }, (_sample, i) => [
            c.raw_region(id, i, 0).toString(),
            c.raw_local(id, i, 0),
            c.raw_region(id, i, 1).toString(),
            c.raw_local(id, i, 1),
            c.raw_point(id, i, 2),
          ]),
        })),
      );
    }
    function cleanup(c, t) {
      c.svg_cancel(t);
      let n = 0;
      while (!timed("cleanup", () => c.svg_cleanup(t))) {
        if (++n > 20000) throw Error("cleanup stalled");
      }
      check(c.svg_status(t) === 0, "stale cleanup token");
      return n;
    }
    function seal(c) {
      const t = c.svg_begin();
      check(t > 0, "begin capture");
      let n = 0;
      while (timed("prepare", () => c.svg_prepare(t)) === 1) {
        if (++n > 20000) throw Error("prepare stalled");
      }
      check(c.svg_status(t) === 2, "capture sealed");
      return t;
    }
    function packets(c, t, tolerance = 0.05) {
      const out = [];
      for (;;) {
        const n = timed("next", () => c.svg_next(t, tolerance));
        if (!n) break;
        check(n <= 6168 && (n - 24) % 6 === 0, "bounded capsule packet");
        out.push(Array.from(new Float64Array(c.memory.buffer, c.svg_output_ptr(t), n)));
      }
      check(c.svg_status(t) === 3, "stream exhausted, not failed");
      return out;
    }
    {
      const c = await fresh();
      c.begin(4, 0);
      c.push_precise(1, 2, 0.5);
      check(c.svg_begin() === 0, "active drawing rejected");
      check(c.raw_length(0) === 1, "no cancel/commit");
      c.cancel();
      const t = seal(c);
      check(packets(c, t).length === 0, "empty export");
      cleanup(c, t);
      cases.push("active rejected; empty completes");
    }
    {
      const c = await fresh();
      for (let i = 0; i < 130; i++) draw(c);
      const t = c.svg_begin();
      check(c.svg_prepare(t) === 1, "bounded metadata preparation");
      draw(c);
      check(c.svg_prepare(t) === 5, "revision mutation aborts partial snapshot");
      cleanup(c, t);
      const t2 = c.svg_begin();
      check(c.svg_prepare(t2) === 1, "second partial");
      c.begin(3, 0);
      check(c.svg_prepare(t2) === 5, "active interaction without committed revision aborts");
      c.cancel();
      cleanup(c, t2);
      cases.push("prepare revision and active-state rejection");
    }
    {
      const c = await fresh();
      for (let i = 0; i < 130; i++) draw(c);
      const before = raw(c),
        rev = c.delta_revision(),
        durable = c.delta_durable(),
        t = seal(c);
      check(c.svg_revision(t) === rev, "unsaved revision captured");
      check(c.svg_begin() === 0, "one retained job");
      const retained = c.svg_retained_bytes(t);
      check(retained > 0 && retained <= 134217728, "logical retained bound");
      check(raw(c) === before, "capture leaves raw unchanged");
      c.layer_set_visible(0, 0);
      const nextLayer = c.layer_create();
      draw(c);
      const live = raw(c),
        liveRev = c.delta_revision();
      const out = packets(c, t);
      check(new Set(out.map((p) => p[1])).size === 130, "sealed snapshot excludes later changes");
      check(
        out.every((p) => p[4] === 0 && p[8] === 1),
        "sealed original style/layer",
      );
      check(
        raw(c) === live && c.delta_revision() === liveRev && c.delta_durable() === durable,
        "stream doesn't mutate live/save",
      );
      const drops = cleanup(c, t);
      check(drops > 0, "retirement yields for many references");
      check(c.svg_next(t, 0.05) === 0, "old token rejected");
      const newer = seal(c);
      check(newer !== t, "new token");
      check(
        packets(c, newer).every((p) => p[4] === nextLayer),
        "new snapshot uses current visibility",
      );
      cleanup(c, newer);
      c.undo();
      c.redo();
      check(raw(c) === live, "history survives export");
      cases.push("sealed coherence, raw/history/save preservation, retirement");
    }
    {
      const c = await fresh(),
        region = 9007199254740993n;
      draw(c, 1, region, 12.125);
      draw(c, 0, -region, 5000);
      c.layer_set_locked(0, 1);
      const t = seal(c);
      check(c.svg_origin_region(t, 0) === region, "exact i64 origin");
      check(c.svg_origin_local(t, 0) === 0, "region aligned origin");
      const out = packets(c, t);
      check(
        out.length > 0 && out.every((p) => p[1] === 0),
        "locked visible included, zero opacity excluded",
      );
      check(out[0][24] === 12.125 && out[0][25] === 20.25, "fractional regional capsule precision");
      check(
        out.every((p) => p[18] > -100 && p[20] < 100),
        "zero alpha does not expand bounds",
      );
      cleanup(c, t);
      cases.push("regional origin precision and visible bounds");
    }
    {
      const c = await fresh();
      draw(c);
      draw(c, 1, 100000n);
      const t = seal(c);
      while (c.svg_next(t, 0.05)) {}
      check(c.svg_status(t) === 5, "runtime relative overflow rejects whole export");
      cleanup(c, t);
      const t2 = seal(c);
      check(c.svg_next(t2, 0.05) > 0, "first valid packet");
      check(
        c.svg_next(t2, 0.1) === 0 && c.svg_status(t2) === 5,
        "quality tolerance cannot change midstream",
      );
      cleanup(c, t2);
      const t3 = seal(c);
      check(c.svg_next(t3, Infinity) === 0 && c.svg_status(t3) === 5, "invalid tolerance refused");
      cleanup(c, t3);
      cases.push("overflow, stale jobs, invalid/changing tolerance, failure cleanup");
    }
    return { cases, timings };
  });
  assert.deepEqual(errors, []);
  writeFileSync(".build-cache/svg01/snapshot-results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ groups: results.cases.length, cases: results.cases }));
} finally {
  await browser.close();
}
