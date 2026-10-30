async function validateChunks(store) {
  const manifest = store.manifest();
  let work = 0;
  for (const batch of manifest.batches) {
    const hash = await storageHasher();
    hashWord(hash, batch.streams);
    let total = 4 + batch.streams * 4;
    for (let stream = 0; stream < batch.streams; stream++) {
      let chunk = 0,
        last = false;
      while (!last) {
        const part = store.read(batch.operation, stream, chunk);
        if (chunk === 0) hashWord(hash, part.length);
        hash.append(part.bytes);
        total += part.bytes.length;
        last = part.last;
        chunk++;
        if (++work % 64 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    if (total !== batch.bytes || hash.finish() !== batch.digest) throw Error("storage-corrupt");
  }
  return manifest;
}
globalThis.validateChunks = validateChunks;
// Validate canonical references before altering an older chunked schema.
async function validateChunkModel(store, manifest) {
  if (!manifest.batches.length) return;
  const core = await storageCodec(),
    token = core.restore_begin();
  if (!token) throw Error("storage-codec");
  let work = 0;
  try {
    for (const batch of manifest.batches) {
      if (
        core.restore_batch_begin(token, batch.streams, BigInt(batch.base), BigInt(batch.result)) !==
        1
      )
        throw Error("storage-corrupt");
      for (let pass = 0; pass < 2; pass++) {
        if (pass && core.restore_metadata_replay(token) !== 1) throw Error("storage-corrupt");
        for (let stream = 0; stream < (pass ? 1 : batch.streams); stream++) {
          let chunk = 0,
            last = false;
          while (!last) {
            const part = store.read(batch.operation, stream, chunk++);
            new Uint8Array(core.memory.buffer, core.restore_input_ptr(), part.bytes.length).set(
              part.bytes,
            );
            if (core.restore_append(token, stream, part.bytes.length) !== 1)
              throw Error("storage-corrupt");
            last = part.last;
            if (++work % 64 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }
      if (core.restore_batch_end(token) !== 1) throw Error("storage-corrupt");
    }
  } finally {
    core.restore_cancel(token);
    while (core.restore_cleanup(token, 64) === 1)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
globalThis.validateChunkModel = validateChunkModel;
