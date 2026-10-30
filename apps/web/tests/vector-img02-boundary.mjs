import { imageCompatibility } from "./vector-img02-compat.mjs";
import { imageRecovery } from "./vector-img02-recovery.mjs";
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { imageArity, imageFingerprint } from "../../vector-editor/src/image-core.ts";
const wasm = readFileSync(
  new URL("../../../target/wasm32-unknown-unknown/vector-editor/vector_core.wasm", import.meta.url),
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.evaluate(
    `window.imageRecovery=${imageRecovery.toString()};window.imageCompatibility=${imageCompatibility.toString()}`,
  );
  const results = await page.evaluate(
    async ({ bytes, arity, fingerprint }) => {
      const fresh = async () =>
        (
          await WebAssembly.instantiate(
            Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0)),
            {},
          )
        ).instance.exports;
      const checks = [];
      const check = (v, name) => {
        if (!v) throw Error(name);
        checks.push(name);
      };
      const c = await fresh();
      for (const [name, n] of Object.entries(arity)) check(c[name]?.length === n, `ABI ${name}`);
      check(
        fingerprint.every((v, i) => c.image_fingerprint_word(i) >>> 0 === v),
        "fingerprint",
      );
      const digest = "a".repeat(64);
      const add = (e, extra = {}) => {
        new Uint8Array(e.memory.buffer, e.image_digest_input_ptr(), 64).set(
          new TextEncoder().encode(extra.digest || digest),
        );
        return (
          e.image_add(
            1,
            extra.w || 100,
            extra.h || 50,
            500,
            0,
            9007199254740993n,
            120,
            0n,
            20,
            1,
            Math.PI / 4,
            800,
            600,
          ) >>> 0
        );
      };
      const read = (e, id) => {
        check(e.image_read(id, 9007199254740993n, 0, 0n, 0) === 1, "image read");
        return [...new Float64Array(e.memory.buffer, e.image_output_ptr(), 15)];
      };
      const a = add(c);
      check(a === 0x80000000, "distinct image handle");
      check(c.count() === 0, "not fake stroke");
      const frame = read(c, a);
      check(
        Math.abs(frame[13] - Math.SQRT1_2) < 1e-12 && Math.abs(frame[14] + Math.SQRT1_2) < 1e-12,
        "upright placement",
      );
      check(
        c.session_selection_set(a, 1) === 1 && c.session_selection_has(a) === 1,
        "image selection",
      );
      c.move_begin();
      check(c.move_add(a) === 1, "image transform begin");
      check(c.move_update(20, 30) === 1, "image transform preview");
      c.move_commit();
      check(read(c, a)[11] === frame[11] + 20, "image translation");
      c.undo();
      check(read(c, a)[11] === frame[11], "image undo");
      c.redo();
      check(read(c, a)[12] === frame[12] + 30, "image redo");
      check(c.image_opacity(a, 0.4) === 1, "image opacity");
      c.undo();
      check(read(c, a)[8] === 1, "opacity undo");
      c.redo();
      const deletionRevision = c.layer_render_revision();
      c.delete_begin();
      c.delete_add(a);
      check(c.delete_commit() === 1 && read(c, a)[9] === 0, "image deletion");
      check(c.layer_render_revision() !== deletionRevision, "image deletion invalidates rendering");
      const undoRevision = c.layer_render_revision();
      c.undo();
      check(c.layer_render_revision() !== undoRevision, "image delete undo invalidates rendering");
      check(read(c, a)[9] === 1, "delete undo");
      const token = c.idle_begin();
      check(token > 0, "save batch");
      while (c.idle_step(token, 64) === 1) {}
      check(c.image_idle_asset_next(token, 1) === 1, "batch asset reference");
      check(
        new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.image_asset_digest_ptr(), 64),
        ) === digest,
        "asset digest",
      );
      check(c.image_idle_asset_next(token, 0) === 2, "dedup assets");
      const streams = [];
      for (let stream = 0; stream < c.idle_stream_count(token); stream++) {
        const parts = [];
        for (let chunk = 0; ; chunk++) {
          const n = c.idle_chunk(token, stream, chunk);
          check(n <= 65520, "bounded chunk");
          parts.push(new Uint8Array(c.memory.buffer, c.idle_chunk_ptr(), n).slice());
          if (n < 65520) break;
        }
        streams.push(parts);
      }
      const restored = await fresh();
      const rt = restored.restore_begin();
      check(
        restored.restore_batch_begin(rt, streams.length, 0n, c.delta_revision()) === 1,
        "restore begin",
      );
      const append = (stream, parts) => {
        for (const part of parts) {
          new Uint8Array(restored.memory.buffer, restored.restore_input_ptr(), part.length).set(
            part,
          );
          check(restored.restore_append(rt, stream, part.length) === 1, "restore append");
        }
      };
      streams.forEach((p, i) => append(i, p));
      check(restored.restore_metadata_replay(rt) === 1, "metadata replay");
      append(0, streams[0]);
      check(restored.restore_batch_end(rt) === 1, "restore end");
      check(
        restored.image_restore_asset(rt, 0) === 1 && restored.image_restore_asset(rt, 1) === 2,
        "restore assets",
      );
      check(restored.restore_publish(rt) === 1, "restore publication");
      check(
        JSON.stringify(read(restored, a)) === JSON.stringify(read(c, a)),
        "exact image metadata roundtrip",
      );
      const svg = c.svg_begin();
      while (c.svg_prepare(svg) === 1) {}
      check(c.svg_configure(svg, 2, 2, 0) === 1, "image svg configure");
      while (c.svg_measure(svg) === 1) {}
      check(c.svg_next(svg, c.svg_tolerance(svg)) === 24, "image SVG packet");
      check(
        new Float64Array(c.memory.buffer, c.svg_output_ptr(svg), 24)[0] === 2,
        "image SVG kind",
      );
      check(c.svg_group_last(svg) === 1, "image own blend group");
      check(c.svg_next(svg, c.svg_tolerance(svg)) === 0 && c.svg_status(svg) === 3, "SVG complete");
      const cap = await fresh();
      check(add(cap, { w: 4096, h: 4096 }) === 0x80000000, "first large asset");
      check(
        add(cap, { w: 4096, h: 4096, digest: "b".repeat(64) }) === 0xffffffff &&
          cap.image_error() === 3,
        "aggregate GPU rejection",
      );
      check(cap.image_count() === 1, "rejection no mutation");
      check(add(cap, { w: 4096, h: 4096 }) === 0x80000001, "same asset budget dedup");
      await window.imageRecovery(c, fresh, check);
      await window.imageCompatibility(fresh, check);
      return checks;
    },
    { bytes: wasm.toString("base64"), arity: imageArity, fingerprint: imageFingerprint },
  );
  console.log(JSON.stringify({ checks: results.length, results }));
  if (process.env.LINEFIELD_IMG_RESULT)
    writeFileSync(process.env.LINEFIELD_IMG_RESULT, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
