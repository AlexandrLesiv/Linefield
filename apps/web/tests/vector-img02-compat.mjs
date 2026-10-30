export async function imageCompatibility(fresh, check) {
  const c = await fresh();
  c.begin(6, 0x445566);
  c.push(10, 20, 0.6);
  c.push(90, 80, 0.8);
  c.commit();
  const token = c.idle_begin();
  while (c.idle_step(token, 64) === 1) {}
  const streams = [];
  for (let stream = 0; stream < c.idle_stream_count(token); stream++) {
    const n = c.idle_chunk(token, stream, 0);
    streams.push(new Uint8Array(c.memory.buffer, c.idle_chunk_ptr(), n).slice());
  }
  new DataView(streams[0].buffer).setUint32(4, 1, true);
  const r = await fresh(),
    rt = r.restore_begin();
  r.restore_batch_begin(rt, streams.length, 0n, 1n);
  const send = (stream) => {
    const data = streams[stream];
    new Uint8Array(r.memory.buffer, r.restore_input_ptr(), data.length).set(data);
    return r.restore_append(rt, stream, data.length);
  };
  check(
    streams.every((_, i) => send(i) === 1),
    "legacy v1 append",
  );
  check(
    r.restore_metadata_replay(rt) === 1 && send(0) === 1 && r.restore_batch_end(rt) === 1,
    "legacy v1 replay",
  );
  check(
    r.restore_publish(rt) === 1 && r.image_count() === 0 && r.raw_length(0) === c.raw_length(0),
    "legacy stroke-only publication",
  );
  for (let i = 0; i < c.raw_length(0); i++)
    for (let field = 0; field < 3; field++)
      check(c.raw_point(0, i, field) === r.raw_point(0, i, field), "legacy original samples");
}
