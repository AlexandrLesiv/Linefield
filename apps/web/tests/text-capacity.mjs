import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const encodedWasm = readFileSync(
  new URL("../../../target/wasm32-unknown-unknown/vector-editor/vector_core.wasm", import.meta.url),
).toString("base64");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (bytes) => {
    const c = (
      await WebAssembly.instantiate(
        Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0)),
        {},
      )
    ).instance.exports;
    const restored = (
      await WebAssembly.instantiate(
        Uint8Array.from(atob(bytes), (char) => char.charCodeAt(0)),
        {},
      )
    ).instance.exports;
    const restoreToken = restored.restore_begin();
    const checks = [];
    const check = (v, n) => {
      if (!v) throw Error(n);
      checks.push(n);
    };
    const json = (v) => {
      const d = new TextEncoder().encode(JSON.stringify(v));
      new Uint8Array(c.memory.buffer, c.save_input_ptr(), d.length).set(d);
      return d.length;
    };
    check(
      c.save_configure(
        json({ document: "text-cap", incarnation: "i", grant: "g", session: "s" }),
      ) === 1,
      "configure",
    );
    const flush = () => {
      const t = c.idle_begin();
      while (c.idle_step(t, 64) === 1) {}
      if (restored.restore_batch_begin(restoreToken, 1, c.idle_base(t), c.idle_target(t)) !== 1)
        throw Error("replaybegin");
      const replay = () => {
        for (let index = 0; ; index++) {
          const length = c.idle_chunk(t, 0, index);
          if (!length) break;
          new Uint8Array(restored.memory.buffer, restored.restore_input_ptr(), length).set(
            new Uint8Array(c.memory.buffer, c.idle_chunk_ptr(), length),
          );
          if (restored.restore_append(restoreToken, 0, length) !== 1) throw Error("replaydata");
          if (length < 65520) break;
        }
      };
      replay();
      if (restored.restore_metadata_replay(restoreToken) !== 1) throw Error("replayphase");
      replay();
      if (restored.restore_batch_end(restoreToken) !== 1) throw Error("replayend");
      if (c.save_seal_begin(t) !== 1) throw Error("seal");
      while (c.save_seal_step(t) === 1) {}
      const request = JSON.parse(
        new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.save_request_ptr(t), c.save_request_len(t)),
        ),
      );
      if (c.save_receipt(t, json({ ...request, outcome: "committed" })) !== 1)
        throw Error("receipt");
      while (c.idle_cleanup(64) !== 0) {}
    };
    const data = new TextEncoder().encode("x".repeat(16384));
    new Uint8Array(c.memory.buffer, c.text_input_ptr(), data.length).set(data);
    for (let i = 0; i < 8192; i++) {
      const id = c.text_create(data.length, 0, 1, 100, 40, 2, 34, 0, 0n, 0, 0n, 0, 0) >>> 0;
      if (id !== 0x40000000 + i) throw Error(`create ${i}: ${c.text_error()}`);
      if ((i + 1) % 1000 === 0) flush();
    }
    check(c.text_retained_bytes() === 128 * 1024 * 1024, "retained UTF8 exactly128MiB");
    const rev = c.delta_revision();
    check(
      c.text_create(data.length, 0, 1, 100, 40, 2, 34, 0, 0n, 0, 0n, 0, 0) >>> 0 === 0xffffffff &&
        c.text_error() === 3 &&
        c.delta_revision() === rev,
      "capacity rejects before mutation",
    );
    check(
      c.text_edit(0x40000000, 1, c.delta_revision(), data.length, 0x123456, 1, 100, 40, 2, 34) ===
        1,
      "style edit reuses immutable content at capacity",
    );
    check(c.text_retained_bytes() === 128 * 1024 * 1024, "style history no content copy");
    new Uint8Array(c.memory.buffer, c.text_input_ptr(), data.length).fill(121);
    check(
      c.text_edit(0x40000000, 2, c.delta_revision(), data.length, 0, 1, 100, 40, 2, 34) === 0 &&
        c.text_error() === 3,
      "content edit capacity rejects",
    );
    c.undo();
    check(
      c.text_read(0x40000000, 0n, 0, 0n, 0) === 1 &&
        new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)[5] === 0,
      "history retained at capacity",
    );
    flush();
    check(
      restored.text_retained_bytes() === 128 * 1024 * 1024,
      "replayed style history shares content at capacity",
    );
    check(restored.restore_checkpoint_begin(restoreToken) === 1, "capacity checkpoint starts");
    while (restored.restore_checkpoint_step(restoreToken, 64) === 1) {}
    const pending = c.restore_begin();
    check(
      c.restore_batch_begin(pending, 1, 0n, c.delta_revision()) === 1,
      "live replacement begins",
    );
    let first;
    for (let index = 0; ; index++) {
      const n = restored.restore_checkpoint_chunk(restoreToken, 0, index);
      if (!n) break;
      const part = new Uint8Array(
        restored.memory.buffer,
        restored.restore_checkpoint_ptr(restoreToken),
        n,
      );
      if (index === 0) first = part.slice();
      new Uint8Array(c.memory.buffer, c.restore_input_ptr(), n).set(part);
      if (c.restore_append(pending, 0, n) !== 1) throw Error("replacementscan");
      if (n < 65520) break;
    }
    check(c.restore_metadata_replay(pending) === 1, "replacement metadata prepared");
    new Uint8Array(c.memory.buffer, c.restore_input_ptr(), first.length).set(first);
    check(
      c.restore_append(pending, 0, first.length) === 0 && c.text_count() === 8192,
      "live plus pending cap rejects preserving document",
    );
    check(
      restored.restore_publish(restoreToken) === 1 && restored.text_count() === 8192,
      "fresh capacity reload succeeds",
    );
    check(
      restored.text_read(0x40000000, 0n, 0, 0n, 0) === 1 &&
        new Float64Array(restored.memory.buffer, restored.text_output_ptr(), 20)[5] === 0,
      "replayed style undo exact",
    );
    return { checks: checks.length, results: checks };
  }, encodedWasm);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
