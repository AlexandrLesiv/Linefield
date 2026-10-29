import type { Loaded, SaveCore } from "./types";
const yieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export async function restore(core: SaveCore, saved: Loaded) {
  if (!saved.rows.length) {
    if (saved.revision !== "0") throw Error("storage-corrupt");
    return;
  }
  const token = core.restore_begin();
  if (!token) throw Error("restore-busy");
  let revision = 0n,
    total = 0;
  for (const [, base, result, , payload] of saved.rows) {
    total += payload.byteLength;
    if (
      total > 48 * 1024 * 1024 ||
      BigInt(base) !== revision ||
      BigInt(result) <= revision ||
      payload.byteLength < 4
    )
      throw Error("storage-corrupt");
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const count = view.getUint32(0, true);
    if (core.restore_batch_begin(token, count, revision, BigInt(result)) !== 1)
      throw Error("restore-batch");
    let offset = 4;
    for (let stream = 0; stream < count; stream++) {
      if (offset + 4 > payload.length) throw Error("storage-corrupt");
      const length = view.getUint32(offset, true);
      offset += 4;
      if (length > payload.length - offset) throw Error("storage-corrupt");
      for (let at = 0; at < length; at += 65520) {
        const bytes = payload.subarray(offset + at, offset + Math.min(length, at + 65520));
        new Uint8Array(core.memory.buffer, core.restore_input_ptr(), bytes.length).set(bytes);
        if (core.restore_append(token, stream, bytes.length) !== 1) throw Error("restore-data");
        await yieldTask();
      }
      offset += length;
    }
    if (offset !== payload.length || core.restore_batch_end(token) !== 1)
      throw Error("restore-data");
    revision = BigInt(result);
    await yieldTask();
  }
  if (revision !== BigInt(saved.revision) || core.restore_publish(token) !== 1)
    throw Error("restore-publish");
}
