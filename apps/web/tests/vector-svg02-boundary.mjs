import { svgHelpers } from "./vector-svg02-helpers.mjs";
import { svgExportArity, svgExportFingerprint } from "../../vector-editor/src/svg-export-core.ts";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const url = process.env.LINEFIELD_SVG_URL;
if (!url) throw Error("Isolated SVG02 origin required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.evaluate(`window.svgHelpers=${svgHelpers.toString()}`);
  const result = await page.evaluate(
    async ({ arity, fingerprint }) => {
      const wasm = await (await fetch("/core.wasm")).arrayBuffer();
      const fresh = async () => (await WebAssembly.instantiate(wasm, {})).instance.exports;
      const cases = [];
      const { check, timings, draw, seal, stream, retire, text, png, image } = window.svgHelpers();
      const checked = await fresh();
      for (const [name, count] of Object.entries(arity))
        check(
          typeof checked[name] === "function" && checked[name].length === count,
          "checked scalar arity",
        );
      check(
        fingerprint.every((v, i) => checked.svg_boundary_fingerprint(i) >>> 0 === v),
        "checked fingerprint",
      );
      for (const density of [1, 2, 4]) {
        const c = await fresh();
        draw(c);
        draw(c, 0.5);
        draw(c, 0);
        const before = [
          c.count(),
          c.raw_length(0),
          c.raw_length(1),
          c.delta_revision(),
          c.delta_durable(),
          c.can_undo(),
          c.can_redo(),
        ];
        const t = seal(c, density),
          view = Array.from({ length: 9 }, (_, i) => c.svg_view(t, i));
        check(view[0] <= 10.125 - 4 - 16 && view[2] >= 60, "bounds include footprint and margin");
        check(c.svg_tolerance(t) === 0.25 / density, "density authority");
        check(
          Number.isInteger(view[0] * density) && Number.isInteger(view[1] * density),
          "bounds align to global output pixel grid",
        );
        const { groups } = stream(c, t);
        check(groups === 2, "ordered visible nonzero groups");
        const bytes = await png(c, t);
        let svg = text(c, t, c.svg_xml_begin(t));
        svg += image(c, t, bytes, [1, 2, 13, 49152]);
        svg += image(c, t, bytes, [17]);
        svg += text(c, t, c.svg_xml_finish(t));
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
        check(!doc.querySelector("parsererror"), "valid SVG XML");
        const images = [...doc.querySelectorAll("image")];
        check(images.length === 2, "image count");
        for (const element of images) {
          const decoded = Uint8Array.from(
            atob(element.getAttribute("href").split(",")[1]),
            (character) => character.charCodeAt(0),
          );
          check(
            decoded.length === bytes.length && decoded.every((v, i) => v === bytes[i]),
            "exact PNG bytes across arbitrary chunks",
          );
        }
        const after = [
          c.count(),
          c.raw_length(0),
          c.raw_length(1),
          c.delta_revision(),
          c.delta_durable(),
          c.can_undo(),
          c.can_redo(),
        ];
        check(
          before.every((v, i) => v === after[i]),
          "raw history and saving unchanged",
        );
        retire(c, t);
        cases.push({
          name: "density, bounds, XML and PNG preservation",
          density,
          bytes: svg.length,
        });
      }
      {
        const c = await fresh(),
          t = seal(c);
        check(c.svg_view(t, 2) === 1920 && c.svg_view(t, 3) === 1080, "empty size");
        stream(c, t);
        const svg = text(c, t, c.svg_xml_begin(t)) + text(c, t, c.svg_xml_finish(t));
        check(!svg.includes("<image"), "transparent empty");
        retire(c, t);
        c.document_settings(0, 2);
        const next = seal(c, 1, 0, 1);
        check(c.svg_view(next, 5) === 3 && c.svg_view(next, 6) === 2, "current white plus grid");
        retire(c, next);
        cases.push({ name: "empty and captured background" });
      }
      {
        const c = await fresh();
        draw(c, 1, 9007199254740993n);
        const t = seal(c);
        check(c.svg_origin_region(t, 0) === 9007199254740993n, "regional origin exact");
        draw(c);
        check(stream(c, t).groups === 1, "later edits excluded");
        retire(c, t);
        cases.push({ name: "regional precision and coherent later edit exclusion" });
      }
      for (const bad of [
        "header",
        "size",
        "tail",
        "crc",
        "framing",
        "trailing",
        "early-footer",
        "duplicate-begin",
        "bad-density",
        "bad-tolerance",
        "transparent-grid",
      ]) {
        const c = await fresh();
        draw(c);
        c.document_settings(1, 2);
        let t;
        if (bad === "bad-density" || bad === "transparent-grid") {
          t = c.svg_begin();
          while (c.svg_prepare(t) === 1) {}
          check(
            c.svg_configure(
              t,
              bad === "bad-density" ? 3 : 2,
              2,
              bad === "transparent-grid" ? 1 : 0,
            ) === 0,
            "bad option rejected",
          );
        } else {
          t = seal(c);
          let bytes = await png(c, t);
          c.svg_xml_begin(t);
          if (bad === "early-footer") check(c.svg_xml_finish(t) === 0, "early finish rejected");
          else if (bad === "duplicate-begin")
            check(c.svg_xml_begin(t) === 0, "duplicate begin rejected");
          else if (bad === "bad-tolerance")
            check(c.svg_next(t, 0.025) === 0, "wrong geometry policy rejected");
          else {
            stream(c, t);
            c.svg_xml_image_begin(t);
            if (bad === "header") bytes[0] ^= 1;
            if (bad === "size") bytes[19] ^= 1;
            if (bad === "tail") bytes[bytes.length - 1] ^= 1;
            if (bad === "crc") bytes[41] ^= 1;
            if (bad === "framing") {
              const invalid = new Uint8Array(45);
              invalid.set(bytes.subarray(0, 24));
              invalid.set(bytes.subarray(-12), 33);
              bytes = invalid;
            }
            if (bad === "trailing") bytes = new Uint8Array([...bytes, 0]);
            new Uint8Array(c.memory.buffer, c.svg_png_input_ptr(t), bytes.length).set(bytes);
            c.svg_png_write(t, bytes.length);
            if (bad === "tail")
              check(c.svg_xml_image_end(t) === 0, "truncated/corrupt end rejected");
          }
        }
        check(c.svg_status(t) === 5 && c.svg_error(t) > 0, "failure recorded");
        retire(c, t);
        const retry = seal(c);
        stream(c, retry);
        retire(c, retry);
        cases.push({ name: `reject and recover: ${bad}` });
      }
      return {
        cases,
        maxPngWriteMs: Math.max(...timings),
        scope: "Browser/Wasm boundary E2E; actual-app rendering tested separately",
      };
    },
    { arity: svgExportArity, fingerprint: svgExportFingerprint },
  );
  assert.equal(result.cases.length, 16);
  writeFileSync(
    process.env.LINEFIELD_REPORT ?? ".build-cache/svg02/boundary-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
