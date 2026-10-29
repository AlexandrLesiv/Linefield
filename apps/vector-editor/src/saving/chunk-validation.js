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
