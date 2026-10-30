import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const encodedWasm = readFileSync(
  new URL("../../../target/wasm32-unknown-unknown/vector-editor/vector_core.wasm", import.meta.url),
).toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (bytes) => {
    const wasm = Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0));
    const fresh = async () => (await WebAssembly.instantiate(wasm, {})).instance.exports;
    const checks = [];
    const check = (value, name) => {
      if (!value) throw Error(name);
      checks.push(name);
    };
    const json = (c, value) => {
      const data = new TextEncoder().encode(JSON.stringify(value));
      new Uint8Array(c.memory.buffer, c.save_input_ptr(), data.length).set(data);
      return data.length;
    };
    const add = (c, char = "a") => {
      new Uint8Array(c.memory.buffer, c.image_digest_input_ptr(), 64).fill(char.charCodeAt(0));
      return c.image_add(1, 100, 100, 500, 0, 0n, 100, 0n, 100, 1, 0, 800, 600) >>> 0;
    };
    const draw = (c) => {
      c.begin(6, 0);
      c.push(1, 1, 1);
      c.commit();
    };
    const batch = (c) => {
      const token = c.idle_begin();
      while (c.idle_step(token, 64) === 1) {}
      const streams = [];
      for (let stream = 0; stream < c.idle_stream_count(token); stream++) {
        const n = c.idle_chunk(token, stream, 0);
        streams.push(new Uint8Array(c.memory.buffer, c.idle_chunk_ptr(), n).slice());
      }
      return { token, streams, base: c.idle_base(token), result: c.idle_target(token) };
    };
    const restore = async (b) => {
      const c = await fresh(),
        t = c.restore_begin();
      check(c.restore_batch_begin(t, b.streams.length, b.base, b.result) === 1, "restore begins");
      const send = (i) => {
        const d = b.streams[i];
        new Uint8Array(c.memory.buffer, c.restore_input_ptr(), d.length).set(d);
        return c.restore_append(t, i, d.length);
      };
      check(
        b.streams.every((_, i) => send(i) === 1),
        "restore streams",
      );
      check(
        c.restore_metadata_replay(t) === 1 && send(0) === 1 && c.restore_batch_end(t) === 1,
        "restore metadata",
      );
      return { c, t };
    };
    const c = await fresh();
    check(
      c.save_configure(
        json(c, { document: "doc", incarnation: "inc", grant: "grant", session: "s" }),
      ) === 1,
      "save configured",
    );
    const id = add(c);
    c.session_selection_set(id, 1);
    c.undo();
    check(c.image_cleanup_step(0, 64) === 1 && c.image_exists(id) === 1, "redo creation protected");
    draw(c);
    const before = c.delta_revision();
    const svg = c.svg_begin();
    while (c.svg_prepare(svg) === 1) {}
    check(c.image_cleanup_step(0, 64) >>> 0 === 0xffffffff, "SVG snapshot blocks retirement");
    c.svg_cancel(svg);
    while (c.svg_cleanup(svg) !== 1) {}
    check(
      c.image_cleanup_step(0, 64) === 1 && c.image_exists(id) === 0,
      "abandoned redo creation retired",
    );
    check(
      c.delta_revision() === before + 1n && c.image_cleanup_revision() === -1n,
      "retirement is dirty journal operation",
    );
    check(
      c.session_selection_set(id, 1) === 0 &&
        c.image_count() === 1 &&
        c.session_selection_snapshot() === 0,
      "retired stable slot rejected",
    );
    const next = add(c, "b");
    check(next === id + 1, "image IDs never reused");
    const b = batch(c);
    check(c.image_cleanup_step(0, 64) >>> 0 === 0xffffffff, "sealed save blocks retirement");
    check(c.save_seal_begin(b.token) === 1, "seal starts");
    while (c.save_seal_step(b.token) === 1) {}
    const request = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(c.memory.buffer, c.save_request_ptr(b.token), c.save_request_len(b.token)),
      ),
    );
    check(
      c.save_receipt(b.token, json(c, { ...request, outcome: "committed" })) === 1,
      "exact receipt accepted",
    );
    check(c.image_cleanup_revision() === -1n, "pending cleanup blocks GC proof");
    while (c.idle_cleanup(64) !== 0) {}
    check(c.image_cleanup_revision() === c.delta_revision(), "durable cleanup proof");
    const { c: r, t } = await restore(b);
    check(
      r.image_restore_asset(t, 0) === 3 && r.image_restore_asset(t, 1) === 1,
      "tombstone asset iteration",
    );
    check(r.restore_checkpoint_begin(t) === 1, "tombstone checkpoint begins");
    while (r.restore_checkpoint_step(t, 64) === 1) {}
    const compacted = [];
    for (let stream = 0; stream < r.restore_checkpoint_count(t); stream++) {
      const n = r.restore_checkpoint_chunk(t, stream, 0);
      check(n <= 65520, "checkpoint chunks bounded");
      compacted.push(new Uint8Array(r.memory.buffer, r.restore_checkpoint_ptr(t), n).slice());
    }
    const cp = await restore({ streams: compacted, base: 0n, result: b.result });
    check(
      cp.c.restore_publish(cp.t) === 1 && !cp.c.image_exists(id) && cp.c.image_exists(next),
      "checkpoint preserves tombstone roots",
    );
    check(r.restore_publish(t) === 1, "tombstone publish");
    while (r.restore_cleanup(t, 64) === 1) {}
    check(
      r.image_count() === 2 && !r.image_exists(id) && r.image_exists(next),
      "tombstone roundtrip",
    );
    const d = await fresh(),
      deleted = add(d);
    d.delete_begin();
    d.delete_add(deleted);
    d.delete_commit();
    check(
      d.image_cleanup_step(0, 64) === 1 && d.image_exists(deleted) === 1,
      "undo deletion protected",
    );
    d.undo();
    check(d.image_exists(deleted) === 1, "delete undo retained");
    d.redo();
    const loaded = await restore(batch(d));
    loaded.c.restore_publish(loaded.t);
    while (loaded.c.restore_cleanup(loaded.t, 64) === 1) {}
    check(
      loaded.c.image_cleanup_step(0, 64) === 1 && !loaded.c.image_exists(deleted),
      "deleted postreload retired without history",
    );
    const hidden = await fresh(),
      hid = add(hidden);
    hidden.layer_set_visible(0, 0);
    check(
      hidden.image_cleanup_step(0, 64) === 1 && hidden.image_exists(hid),
      "hidden layer retained",
    );
    hidden.layer_set_visible(0, 1);
    hidden.image_opacity(hid, 0);
    check(
      hidden.image_cleanup_step(0, 64) === 1 && hidden.image_exists(hid),
      "zero opacity retained",
    );
    check(
      hidden.image_cleanup_step(0, 65) >>> 0 === 0xffffffff,
      "bounded cleanup rejects excess budget",
    );
    const many = await fresh();
    for (let i = 0; i < 70; i++) add(many);
    for (let i = 0; i < 70; i++) many.undo();
    draw(many);
    check(
      many.image_cleanup_step(0, 1) === 1 &&
        !many.image_exists(0x80000000) &&
        many.image_exists(0x80000001),
      "cleanup exact one-slot budget",
    );
    check(
      many.image_cleanup_step(1, 64) === 65 && many.image_exists(0x80000000 + 65),
      "cleanup resumes bounded cursor",
    );
    check(
      many.image_cleanup_step(65, 64) === 70 &&
        !many.image_exists(0x80000000 + 69) &&
        many.image_count() === 70,
      "cleanup finishes preserving highwater",
    );
    check(many.count() === 1 && many.raw_length(0) === 1, "cleanup preserves raw strokes");
    return checks;
  }, encodedWasm);
  console.log(JSON.stringify({ checks: result.length, result }));
} finally {
  await browser.close();
}
