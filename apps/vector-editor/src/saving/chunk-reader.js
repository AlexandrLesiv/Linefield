function chunkReader(sql) {
  let legacy, cachedBatch, cachedStream;
  const row = (operation) => {
    const r = sql(storageSql.batch, [operation])[0];
    if (!r) throw Error("storage-missing");
    return r;
  };
  const legacyLength = (operation, stream, total) => {
    if (!legacy || legacy.operation !== operation || (stream === 0 && legacy.stream !== 0))
      legacy = { operation, stream: 0, offset: 4, length: null };
    if (stream === legacy.stream + 1 && legacy.length !== null) {
      legacy.offset += 4 + legacy.length;
      legacy.stream++;
      legacy.length = null;
    }
    if (stream !== legacy.stream) throw Error("storage-order");
    if (legacy.length === null) {
      const word = sql(storageSql.legacyLength, [legacy.offset + 1, operation])[0]?.[0];
      if (!(word instanceof Uint8Array) || word.length !== 4) throw Error("storage-corrupt");
      legacy.length = new DataView(word.buffer, word.byteOffset, 4).getUint32(0, true);
      if (legacy.offset + 4 + legacy.length > total) throw Error("storage-corrupt");
    }
    return legacy;
  };
  const descriptor = (r) => {
    const [operation, base, result, digest, storage, declared, bytes, total] = r;
    let streams = declared;
    if (storage === null) {
      if (declared !== null || bytes !== null || total < 4) throw Error("storage-corrupt");
      const b = sql(storageSql.legacyCount, [operation])[0]?.[0];
      if (!(b instanceof Uint8Array) || b.length !== 4) throw Error("storage-corrupt");
      streams = new DataView(b.buffer, b.byteOffset, 4).getUint32(0, true);
    } else if (!validId(storage) || total !== 0 || !Number.isSafeInteger(bytes) || bytes < 4)
      throw Error("storage-corrupt");
    if (!Number.isInteger(streams) || streams < 1 || streams > 100001)
      throw Error("storage-corrupt");
    if (storage !== null) {
      const shape = sql(storageSql.batchShape, [storage])[0];
      if (shape[0] !== streams || shape[1] !== 0 || shape[2] !== streams - 1)
        throw Error("storage-corrupt");
    }
    return { operation, base, result, digest, streams, bytes: storage === null ? total : bytes };
  };
  function read(operation, stream, chunk) {
    if (
      !validId(operation) ||
      !Number.isInteger(stream) ||
      !Number.isSafeInteger(chunk) ||
      chunk < 0
    )
      throw Error("storage-range");
    if (cachedBatch?.operation !== operation) {
      const r = row(operation);
      cachedBatch = { ...descriptor(r), storage: r[4] };
    }
    const info = cachedBatch,
      storage = info.storage;
    if (stream < 0 || stream >= info.streams) throw Error("storage-range");
    let bytes, length, last;
    if (storage === null) {
      const cursor = legacyLength(operation, stream, info.bytes);
      length = cursor.length;
      if (chunk * 65520 > length) throw Error("storage-range");
      const size = Math.min(65520, length - chunk * 65520);
      bytes = sql(storageSql.legacyPart, [
        cursor.offset + 5 + chunk * 65520,
        size,
        operation,
      ])[0]?.[0];
      last = size < 65520;
      if (stream === info.streams - 1 && cursor.offset + 4 + length !== info.bytes)
        throw Error("storage-corrupt");
    } else {
      if (cachedStream?.storage !== storage || cachedStream?.stream !== stream) {
        const shape = sql(storageSql.streamShape, [storage, stream])[0],
          expected = Math.floor(shape[0] / 65520) + 1;
        if (
          shape[1] !== expected ||
          shape[2] !== 0 ||
          shape[3] !== expected - 1 ||
          shape[4] !== 1 ||
          shape[5] !== expected - 1
        )
          throw Error("storage-corrupt");
        cachedStream = { storage, stream, length: shape[0] };
      }
      length = cachedStream.length;
      const part = sql(storageSql.chunk, [storage, stream, chunk])[0];
      if (!part) throw Error("storage-corrupt");
      [bytes, last] = part;
      if (last !== 0 && last !== 1) throw Error("storage-corrupt");
      last = last === 1;
    }
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.length > 65520 ||
      last !== bytes.length < 65520 ||
      chunk * 65520 + bytes.length > length ||
      (last && chunk * 65520 + bytes.length !== length)
    )
      throw Error("storage-corrupt");
    return { bytes: bytes.slice(), length, last };
  }
  return { read, descriptor };
}
globalThis.chunkReader = chunkReader;
