export function ink(e, count = 3, y = 0) {
  const id = e.begin_with_style(8, 0x123456, 0.1, 1.8, 0.4);
  e.set_active_brush(2);
  for (let i = 0; i < count; i++) e.push_precise(i, y, (i % 8) / 8);
  e.commit();
  return id;
}
export function bytes(e, token, stream) {
  const pieces = [];
  for (let chunk = 0; ; chunk++) {
    const size = e.save_chunk(token, stream, chunk) >>> 0;
    if (size === 0xffffffff) throw Error("invalid chunk");
    pieces.push(new Uint8Array(e.memory.buffer, e.save_chunk_ptr(), size).slice());
    if (size < 65520) break;
  }
  const output = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    output.set(piece, offset);
    offset += piece.length;
  }
  return output;
}
export function snapshot(e) {
  const token = e.save_capture();
  if (!token) throw Error("capture rejected");
  const streams = Array.from({ length: e.save_stream_count(token) }, (_, i) => bytes(e, token, i));
  e.save_release(token);
  return streams;
}
export function equal(a, b) {
  return (
    a.length === b.length &&
    a.every((p, i) => p.length === b[i].length && p.every((v, j) => v === b[i][j]))
  );
}
export function metadata(payload) {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  let cursor = 4;
  const u32 = () => {
    const n = view.getUint32(cursor, true);
    cursor += 4;
    return n;
  };
  const f32 = () => {
    const n = view.getFloat32(cursor, true);
    cursor += 4;
    return n;
  };
  const f64 = () => {
    const n = view.getFloat64(cursor, true);
    cursor += 8;
    return n;
  };
  const address = () => {
    const region = view.getBigInt64(cursor, true);
    cursor += 8;
    return [region, f64()];
  };
  const version = u32(),
    layerCount = u32(),
    strokeCount = u32();
  const layers = Array.from({ length: layerCount }, () => {
    const fields = Array.from({ length: 6 }, u32);
    const name = new TextDecoder().decode(payload.slice(cursor, cursor + fields[5]));
    cursor += fields[5];
    return { fields, name };
  });
  const strokes = Array.from({ length: strokeCount }, () => ({
    fields: Array.from({ length: 9 }, u32),
    style: Array.from({ length: 4 }, f32),
    slice: [f64(), f64()],
    anchor: [address(), address()],
    transform: Array.from({ length: 4 }, f64),
  }));
  if (cursor !== payload.length) throw Error("metadata trailing bytes");
  return { version, layers, strokes };
}
