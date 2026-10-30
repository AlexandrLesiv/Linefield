import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const encoded = readFileSync(
  new URL("../../../target/wasm32-unknown-unknown/vector-editor/vector_core.wasm", import.meta.url),
).toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const results = await page.evaluate(async (input) => {
    const c = (
      await WebAssembly.instantiate(
        Uint8Array.from(atob(input), (s) => s.charCodeAt(0)),
        {},
      )
    ).instance.exports;
    const checks = [];
    const check = (value, label) => {
      if (!value) throw Error(label);
      checks.push(label);
    };
    for (const bytes of [1, 16 * 1024 * 1024, 16 * 1024 * 1024 + 1, 32 * 1024 * 1024])
      check(c.image_asset_validate(1, 4096, 4096, bytes, 1) === 1, "encoded admission " + bytes);
    for (const bytes of [0, 32 * 1024 * 1024 + 1, 0xffffffff])
      check(c.image_asset_validate(1, 100, 100, bytes, 1) === 0, "encoded rejection " + bytes);
    check(
      c.image_asset_validate(1, 4097, 4096, 32 * 1024 * 1024, 1) === 0,
      "decoded pixel cap unchanged",
    );
    new Uint8Array(c.memory.buffer, c.image_digest_input_ptr(), 64).fill(97);
    const image =
      c.image_add(1, 100, 100, 32 * 1024 * 1024, 0, 0n, 100, 0n, 100, 1, 0, 800, 600) >>> 0;
    check(image === 0x80000000, "large original descriptor publication");
    c.image_read(image, 0n, 0, 0n, 0);
    check(
      new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)[7] === 32 * 1024 * 1024,
      "original length exact",
    );
    const t = c.svg_begin();
    while (c.svg_prepare(t) === 1) {}
    c.svg_configure(t, 1, 2, 0);
    while (c.svg_measure(t) === 1) {}
    check(
      c.svg_next(t, 0.25) === 24 &&
        new Float64Array(c.memory.buffer, c.svg_output_ptr(t), 24)[21] === 32 * 1024 * 1024,
      "SVG retains original descriptor",
    );
    return checks;
  }, encoded);
  console.log(JSON.stringify({ checks: results.length, results }));
} finally {
  await browser.close();
}
