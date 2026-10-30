import { verifyImageReferences } from "./image-references";
import type { Loaded, SaveCore } from "./types";
import type { Storage } from "./adapter";
const yieldTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export async function restore(core: SaveCore, saved: Loaded, store: Storage) {
  if (!saved.batches.length) {
    if (saved.revision !== "0") throw Error("storage-corrupt");
    return;
  }
  const token = core.restore_begin();
  if (!token) throw Error("restore-busy");
  try {
    let revision = 0n,
      total = 0;
    for (const batch of saved.batches) {
      total += batch.bytes;
      if (
        !Number.isSafeInteger(total) ||
        BigInt(batch.base) !== revision ||
        BigInt(batch.result) <= revision ||
        batch.bytes < 4
      )
        throw Error("storage-corrupt");
      if (core.restore_batch_begin(token, batch.streams, revision, BigInt(batch.result)) !== 1)
        throw Error("restore-batch");
      const stream = async (index: number) => {
        let chunk = 0,
          offset = 0,
          last = false;
        while (!last) {
          const part = await store.read(batch.operation, index, chunk++);
          if (
            !(part.bytes instanceof Uint8Array) ||
            part.bytes.length > 65520 ||
            part.last !== part.bytes.length < 65520
          )
            throw Error("restore-data");
          new Uint8Array(core.memory.buffer, core.restore_input_ptr(), part.bytes.length).set(
            part.bytes,
          );
          if (core.restore_append(token, index, part.bytes.length) !== 1)
            throw Error("restore-data");
          offset += part.bytes.length;
          last = part.last;
          if (last && offset !== part.length) throw Error("restore-data");
          await yieldTask();
        }
        return offset;
      };
      let bytesRead = 4 + batch.streams * 4;
      for (let index = 0; index < batch.streams; index++) bytesRead += await stream(index);
      if (bytesRead !== batch.bytes || core.restore_metadata_replay(token) !== 1)
        throw Error("restore-data");
      await stream(0);
      if (core.restore_batch_end(token) !== 1) throw Error("restore-data");
      revision = BigInt(batch.result);
      await yieldTask();
    }
    await verifyImageReferences(core, token, store, yieldTask, true);
    if (revision !== BigInt(saved.revision) || core.restore_publish(token) !== 1)
      throw Error("restore-publish");
  } finally {
    core.restore_cancel(token);
    while (core.restore_cleanup(token, 64) === 1) await yieldTask();
  }
}
