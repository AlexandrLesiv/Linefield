import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { svgHelpers } from "./vector-svg02-helpers.mjs";
const url = process.env.LINEFIELD_SVG_URL;
if (!url) throw Error("Isolated SVG02 origin required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.evaluate(`window.svgHelpers=${svgHelpers.toString()}`);
  const result = await page.evaluate(async () => {
    const wasm = await (await fetch("/core.wasm")).arrayBuffer();
    const fresh = async () => (await WebAssembly.instantiate(wasm, {})).instance.exports;
    const { check, draw, seal, stream, retire, png } = window.svgHelpers();
    const cases = [];
    {
      const c = await fresh();
      draw(c);
      const t = seal(c);
      stream(c, t);
      const encoded = await png(c, t);
      c.svg_xml_begin(t);
      c.svg_xml_image_begin(t);
      const put = (bytes) => {
        let count = 0;
        for (let at = 0; at < bytes.length; at += 49152) {
          const part = bytes.subarray(at, at + 49152);
          new Uint8Array(c.memory.buffer, c.svg_png_input_ptr(t), part.length).set(part);
          count += c.svg_png_write(t, part.length);
          if (c.svg_error(t)) break;
        }
        return count;
      };
      put(encoded.subarray(0, 33));
      const chunk = new Uint8Array(65512),
        dv = new DataView(chunk.buffer);
      dv.setUint32(0, 65500);
      chunk.set([116, 101, 83, 116], 4);
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let x = i;
        for (let b = 0; b < 8; b++) x = (x >>> 1) ^ (x & 1 ? 0xedb88320 : 0);
        table[i] = x;
      }
      let crc = 0xffffffff;
      for (const byte of chunk.subarray(4, -4)) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
      dv.setUint32(chunk.length - 4, ~crc >>> 0);
      let output = 0,
        runs = 0;
      const start = performance.now();
      while (c.svg_status(t) !== 5) {
        output += put(chunk);
        check(++runs < 2000, "output admission terminates");
      }
      check(c.svg_error(t) === 5, "output limit explicit failure");
      check(output <= 128 * 1024 * 1024, "never returns excess output");
      check(c.svg_xml_finish(t) === 0, "no partial success");
      retire(c, t);
      const retry = seal(c);
      stream(c, retry);
      retire(c, retry);
      cases.push({
        name: "128MiB cumulative output admission and retry",
        outputBytesReturned: output,
        runs,
        milliseconds: performance.now() - start,
      });
    }
    {
      const c = await fresh();
      c.begin_fixed_width(100, 0, 1);
      c.push_precise(0, 0, 1);
      c.push_precise(6000000, 100, 1);
      c.commit();
      const t = c.svg_begin();
      while (c.svg_prepare(t) === 1) {}
      check(c.svg_configure(t, 4, 2, 0) === 1, "configure");
      while (c.svg_measure(t) === 1) {}
      check(
        c.svg_status(t) === 5 && c.svg_error(t) === 2,
        "oversized layout rejected before GPU allocation",
      );
      retire(c, t);
      cases.push({ name: "64M pixel layout admission" });
    }
    {
      const c = await fresh();
      const count = Math.floor((128 * 1024 * 1024) / c.canonical_sample_bytes()) + 1;
      const start = performance.now();
      c.begin_fixed_width(4, 0, 1);
      for (let i = 0; i < count; i++)
        check(c.push_precise(i % 1000, 20, 0.5) === 1, "accepted source sample");
      c.commit();
      const revision = c.delta_revision(),
        durable = c.delta_durable();
      const t = c.svg_begin();
      check(
        c.svg_prepare(t) === 5 && c.svg_error(t) === 6,
        "retained capacity is a memory limit, not revision conflict",
      );
      retire(c, t);
      check(
        c.raw_length(0) === count &&
          c.delta_revision() === revision &&
          c.delta_durable() === durable,
        "capacity rejection preserves source and saving",
      );
      cases.push({
        name: "128MiB retained source admission",
        samples: count,
        wasmBytes: c.memory.buffer.byteLength,
        milliseconds: performance.now() - start,
      });
    }
    {
      const c = await fresh();
      for (let i = 0; i < 65; i++) draw(c);
      const t = c.svg_begin();
      check(c.svg_prepare(t) === 1, "partial metadata capture");
      draw(c);
      check(
        c.svg_prepare(t) === 5 && c.svg_error(t) === 7,
        "revision conflict remains distinct from resource admission",
      );
      retire(c, t);
      cases.push({ name: "revision conflict error remains distinct" });
    }
    return {
      cases,
      scope:
        "Bounded browser/Wasm resource-failure E2E; output bytes deliberately discarded, no UI responsiveness claim",
    };
  });
  assert.equal(result.cases.length, 4);
  writeFileSync(
    process.env.LINEFIELD_REPORT ?? ".build-cache/svg02/limits-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
