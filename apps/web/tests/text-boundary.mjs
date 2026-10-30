import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { textArity, textFingerprint } from "../../vector-editor/src/text-core.ts";
const encodedWasm = readFileSync(
  new URL("../../../target/wasm32-unknown-unknown/vector-editor/vector_core.wasm", import.meta.url),
).toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
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
      const check = (v, n) => {
        if (!v) throw Error(n);
        checks.push(n);
      };
      const input = (c, s) => {
        const b = new TextEncoder().encode(s);
        new Uint8Array(c.memory.buffer, c.text_input_ptr(), b.length).set(b);
        return b.length;
      };
      const read = (c, id) => {
        check(c.text_read(id, 9007199254740993n, 0, 0n, 0) === 1, "read label");
        return Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20));
      };
      const source = (c, id) => {
        const d = read(c, id);
        return new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.text_content_ptr(id), d[17]),
        );
      };
      const add = (c, s = "Привіт café 😀\n\n") =>
        c.text_create(
          input(c, s),
          0x123456,
          0.7,
          100,
          124,
          3,
          34,
          0,
          9007199254740993n,
          200,
          0n,
          300,
        ) >>> 0;
      const edit = (c, id, s, w = 200, doc = c.delta_revision(), rev = read(c, id)[15]) =>
        c.text_edit(id, rev, doc, input(c, s), 0x123456, 0.7, w, 124, 3, 34);
      const c = await fresh();
      for (const [n, a] of Object.entries(arity)) check(c[n].length === a, `ABI ${n}`);
      check(
        fingerprint.every((v, i) => c.text_fingerprint_word(i) >>> 0 === v),
        "fingerprint",
      );
      const id = add(c);
      check(id === 0x40000000 && c.count() === 0, "distinct label not stroke");
      let d = read(c, id);
      check(
        d[9] === 150 && d[10] === 238 && d[18] === 3 && d[19] === 34,
        "regional centered receipt",
      );
      const draft = c.delta_revision(),
        rev = d[15];
      check(edit(c, id, "Longer label") === 1, "edit");
      d = read(c, id);
      check(d[9] === 100 && d[10] === 238, "edit preserves center");
      c.undo();
      check(source(c, id) === "Привіт café 😀\n\n", "undo exact Unicode");
      check(edit(c, id, "stale", 200, draft, rev) === 0, "undo ABA rejects stale draft");
      c.redo();
      check(source(c, id) === "Longer label", "redo");
      const before = c.delta_revision();
      check(edit(c, id, "   ") === 0 && c.delta_revision() === before, "empty edit no mutation");
      check(add(c, "x\n".repeat(256)) === 0xffffffff, "257 explicit lines reject");
      new Uint8Array(c.memory.buffer, c.text_input_ptr(), 1)[0] = 255;
      check(
        c.text_create(1, 0, 1, 10, 10, 0, 1, 0, 0n, 0, 0n, 0) >>> 0 === 0xffffffff,
        "invalid UTF8 reject",
      );
      check(
        c.session_selection_set(0x40000099, 1) === 0 && c.selection_eligible(0x40000099, 0) === 0,
        "invalid text ID safe",
      );
      c.move_begin();
      check(c.move_add(id) === 1, "label transform membership");
      c.move_update(5, 8);
      c.move_commit();
      check(read(c, id)[9] === 105, "move label");
      c.undo();
      check(read(c, id)[9] === 100, "move undo");
      c.delete_begin();
      c.delete_add(id);
      c.delete_commit();
      check(read(c, id)[7] === 0, "delete label");
      c.undo();
      check(read(c, id)[7] === 1, "delete undo");
      const svg = c.svg_begin();
      while (c.svg_prepare(svg) === 1) {}
      check(c.svg_retained_bytes(svg) >= 12, "snapshot text accounting");
      check(edit(c, id, "new live text") === 1, "edit after immutable seal");
      c.svg_configure(svg, 2, 2, 0);
      while (c.svg_measure(svg) === 1) {}
      const n = c.svg_next(svg, c.svg_tolerance(svg));
      const p = Array.from(new Float64Array(c.memory.buffer, c.svg_output_ptr(svg), n));
      check(n === 26 && p[0] === 3 && p[23] === 3 && p[24] === 34, "SVG text receipt");
      check(
        new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.svg_text_content_ptr(svg), p[21]),
        ) === "Longer label",
        "SVG content immutable",
      );
      c.svg_cancel(svg);
      while (c.svg_cleanup(svg) !== 1) {}
      const image = (e, ch) => {
        new Uint8Array(e.memory.buffer, e.image_digest_input_ptr(), 64).fill(ch.charCodeAt(0));
        return e.image_add(1, 10, 10, 100, 0, 0n, 0, 0n, 0, 1, 0, 800, 600) >>> 0;
      };
      const mixed = await fresh(),
        a = image(mixed, "a"),
        t = add(mixed, "mixed"),
        b = image(mixed, "b");
      check(
        mixed.selection_precedes(t, a) === 1 && mixed.selection_precedes(b, t) === 1,
        "mixed nonstroke order",
      );
      const token = c.idle_begin();
      while (c.idle_step(token, 64) === 1) {}
      const len = c.idle_chunk(token, 0, 0);
      const data = new Uint8Array(c.memory.buffer, c.idle_chunk_ptr(), len).slice();
      const restore = async (serialized) => {
        const q = await fresh(),
          rt = q.restore_begin();
        q.restore_batch_begin(rt, 1, 0n, c.delta_revision());
        const send = () => {
          new Uint8Array(q.memory.buffer, q.restore_input_ptr(), serialized.length).set(serialized);
          return q.restore_append(rt, 0, serialized.length);
        };
        const ok =
          send() === 1 &&
          q.restore_metadata_replay(rt) === 1 &&
          send() === 1 &&
          q.restore_batch_end(rt) === 1;
        return { q, rt, ok };
      };
      const { q, rt, ok } = await restore(data);
      check(ok, "metadata replay");
      check(q.restore_checkpoint_begin(rt) === 1, "checkpoint begins");
      while (q.restore_checkpoint_step(rt, 64) === 1) {}
      const size = q.restore_checkpoint_chunk(rt, 0, 0),
        checkpoint = new Uint8Array(q.memory.buffer, q.restore_checkpoint_ptr(rt), size).slice();
      const cp = await restore(checkpoint);
      check(cp.ok && cp.q.restore_publish(cp.rt) === 1, "checkpoint publish");
      check(
        source(cp.q, id) === "new live text" && read(cp.q, id)[18] === 3,
        "save exact source and receipt",
      );
      const malformed = data.slice();
      const view = new DataView(malformed.buffer);
      const textStart = 44;
      check(malformed[textStart] === 9, "first metadata text record");
      const contentLength = view.getUint32(textStart + 5, true);
      view.setUint32(textStart + 9 + contentLength + 12, 0xffffffff, true);
      check(!(await restore(malformed)).ok, "malformed stroke highwater reject");
      const badOrder = data.slice();
      new DataView(badOrder.buffer).setUint32(textStart + 9 + contentLength + 16, 10000, true);
      check(!(await restore(badOrder)).ok, "malformed mixed ordinal reject");
      return checks;
    },
    { bytes: encodedWasm, arity: textArity, fingerprint: textFingerprint },
  );
  console.log(JSON.stringify({ checks: results.length, results }));
} finally {
  await browser.close();
}
