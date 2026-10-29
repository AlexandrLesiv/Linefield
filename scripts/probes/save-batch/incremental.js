import { ink, snapshot, equal, metadata } from "./fixture.js";
export function collect(e, token) {
  if (!token) throw Error("prepare rejected");
  return Array.from({ length: e.delta_stream_count(token) }, (_, stream) => {
    const chunks = [];
    for (let index = 0; ; index++) {
      const size = e.delta_chunk(token, stream, index) >>> 0;
      if (size === 0xffffffff) throw Error("chunk rejected");
      chunks.push(new Uint8Array(e.memory.buffer, e.delta_chunk_ptr(), size).slice());
      if (size < 65520) break;
    }
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.length;
    }
    return bytes;
  });
}
export function stage(e, batches) {
  const session = e.restore_begin();
  for (const { streams, base, result } of batches) {
    if (e.restore_batch_begin(session, streams.length, base, result) !== 1)
      throw Error("restore begin");
    for (let stream = 0; stream < streams.length; stream++) {
      const bytes = streams[stream];
      for (let at = 0; at < bytes.length; at += 65520) {
        const part = bytes.subarray(at, at + 65520);
        new Uint8Array(e.memory.buffer, e.restore_input_ptr(), part.length).set(part);
        if (e.restore_append(session, stream, part.length) !== 1) throw Error("restore append");
      }
    }
    if (e.restore_batch_end(session) !== 1) throw Error("restore rejected");
  }
  return session;
}
export function geometry(e) {
  const state = metadata(snapshot(e)[0]);
  const output = [];
  for (const s of state.strokes) {
    const id = s.fields[0];
    for (let chunk = 0; chunk < Math.ceil(e.length(id) / 128); chunk++) {
      const count = e.render_chunk(id, chunk, 0.25);
      output.push(new Uint8Array(e.memory.buffer, e.render_chunk_ptr(), count * 6 * 4).slice());
    }
  }
  return output;
}
export async function runIncremental(load, store) {
  const e = await load(),
    checks = [];
  const check = (name, value) => {
    if (!value) throw Error(name);
    checks.push(name);
  };
  const save = async () => {
    const token = e.delta_prepare(),
      base = e.delta_base(token),
      result = e.delta_target(token),
      streams = collect(e, token);
    await store.save(streams, base, result);
    check("matching persisted receipt acknowledged", e.delta_ack(token, base, result) === 1);
    return { streams, base, result, token };
  };
  const id = ink(e, 101);
  const token = e.delta_prepare(),
    base = e.delta_base(token),
    result = e.delta_target(token),
    streams = collect(e, token);
  ink(e, 3, 25);
  check("N bytes immutable after N+1", equal(streams, collect(e, token)));
  check(
    "wrong receipt rejected",
    e.delta_ack(token, base, result + 1n) === 0 && e.delta_durable() === 0n,
  );
  await store.save(streams, base, result);
  check(
    "N acknowledgement leaves N+1 pending",
    e.delta_ack(token, base, result) === 1 && e.delta_durable() === 1n && e.delta_revision() === 2n,
  );
  await save();
  e.move_begin();
  e.move_add(id);
  e.move_update(12, 24);
  e.move_commit();
  const moved = await save();
  check("transform delta has no raw sources", moved.streams.length === 1);
  e.slice_begin(0, 0);
  e.slice_push(50.25, -20);
  e.slice_push(50.25, 60);
  e.slice_commit();
  await save();
  e.undo();
  e.redo();
  e.layer_create();
  const name = new TextEncoder().encode("Шар α");
  new Uint8Array(e.memory.buffer, e.layer_name_input_ptr(), name.length).set(name);
  e.layer_rename(1, name.length);
  e.layer_move(1, 0);
  e.layer_set_locked(1, 1);
  e.layer_set_visible(0, 0);
  const exact = e.begin_with_style(4, 0xff00ff, 0.2, 1, 0.75);
  // Layer1 is locked: rejected begin must not invent a revision.
  check("locked-layer draw rejected", exact === -1);
  e.layer_set_locked(1, 0);
  e.begin(3, 0);
  e.push_regional(9007199254740993n, 0.125, -9007199254740993n, 0.25, 0.375);
  e.commit();
  await save();
  e.layer_delete(0);
  e.undo();
  await save();
  const expected = snapshot(e),
    shapes = geometry(e),
    loaded = await store.reload(),
    fresh = await load();
  const damaged = shapes.map((shape) => shape.slice());
  const last = damaged.findLast((shape) => shape.length > 24);
  if (last) last[last.length - 1] ^= 1;
  check(
    "geometry oracle checks final byte of multi-capsule output",
    !!last && !equal(shapes, damaged),
  );
  const session = stage(fresh, loaded);
  check("replay staged without live mutation", fresh.count() === 0);
  check("validated replay publishes", fresh.restore_publish(session) === 1);
  check(
    "save reload exact samples metadata layers and transforms",
    equal(expected, snapshot(fresh)),
  );
  check("save reload geometry byte equality", equal(shapes, geometry(fresh)));
  check(
    "reload clears history and preserves revision",
    fresh.can_undo() === 0 &&
      fresh.can_redo() === 0 &&
      fresh.delta_revision() === e.delta_revision(),
  );
  ink(fresh, 2, 88);
  const continued = fresh.delta_prepare(),
    continuedBase = fresh.delta_base(continued),
    continuedResult = fresh.delta_target(continued);
  await store.save(collect(fresh, continued), continuedBase, continuedResult);
  check(
    "post-reload edit receipt accepted",
    fresh.delta_ack(continued, continuedBase, continuedResult) === 1,
  );
  const continuedBatches = await store.reload(),
    reopened = await load();
  check(
    "post-reload edit publishes after second reload",
    reopened.restore_publish(stage(reopened, continuedBatches)) === 1,
  );
  check(
    "reload edit save reload preserves bytes geometry and revision",
    equal(snapshot(fresh), snapshot(reopened)) &&
      equal(geometry(fresh), geometry(reopened)) &&
      reopened.delta_revision() === continuedResult,
  );
  ink(fresh, 2, 99);
  const stale = fresh.delta_prepare(),
    oldBase = fresh.delta_base(stale),
    oldResult = fresh.delta_target(stale);
  check(
    "restore invalidates old receipt",
    fresh.restore_publish(stage(fresh, continuedBatches)) === 1 &&
      fresh.delta_ack(stale, oldBase, oldResult) === 0,
  );
  return {
    checks,
    batches: continuedBatches.length,
    revision: String(reopened.delta_revision()),
    storage: store.measurements,
  };
}
