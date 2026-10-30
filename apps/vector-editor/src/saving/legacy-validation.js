function legacyFraming(sql, operation, base, result, total) {
  const prefix = sql(storageSql.legacyPart, [1, 40, operation])[0]?.[0];
  if (!(prefix instanceof Uint8Array) || prefix.length !== 40) throw Error("storage-corrupt");
  const view = new DataView(prefix.buffer, prefix.byteOffset, prefix.length);
  const count = view.getUint32(0, true),
    metadata = view.getUint32(4, true);
  if (
    count < 1 ||
    count > 100001 ||
    metadata < 32 ||
    metadata > 33 * 1024 * 1024 ||
    new TextDecoder().decode(prefix.subarray(8, 12)) !== "LFD3" ||
    view.getUint32(12, true) !== 1 ||
    view.getBigUint64(16, true) !== BigInt(base) ||
    view.getBigUint64(24, true) !== BigInt(result) ||
    view.getUint32(32, true) < 1 ||
    view.getUint32(32, true) > 100000 ||
    view.getUint32(36, true) !== count - 1
  )
    throw Error("storage-corrupt");
  let offset = 4;
  for (let stream = 0; stream < count; stream++) {
    const bytes = sql(storageSql.legacyLength, [offset + 1, operation])[0]?.[0];
    if (!(bytes instanceof Uint8Array) || bytes.length !== 4) throw Error("storage-corrupt");
    const length = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
    if (stream > 0 && (length === 0 || length % 40 !== 0)) throw Error("storage-corrupt");
    offset += 4 + length;
    if (offset > total) throw Error("storage-corrupt");
  }
  if (offset !== total) throw Error("storage-corrupt");
}
async function validateLegacy(sql) {
  const rows = sql(storageSql.legacyManifest);
  if (rows.length > 10000) throw Error("storage-capacity");
  let revision = "0",
    total = 0,
    work = 0;
  for (const [operation, base, result, digest, size] of rows) {
    total += size;
    if (!Number.isSafeInteger(total)) throw Error("storage-capacity");
    if (
      !validId(operation) ||
      base !== revision ||
      !validRevision(result) ||
      BigInt(result) <= BigInt(base) ||
      !/^[a-f0-9]{64}$/.test(digest) ||
      !Number.isSafeInteger(size) ||
      size < 4
    )
      throw Error("storage-corrupt");
    legacyFraming(sql, operation, base, result, size);
    const hash = await storageHasher();
    for (let offset = 0; offset < size; offset += 65520) {
      const bytes = sql(storageSql.legacyPart, [
        offset + 1,
        Math.min(65520, size - offset),
        operation,
      ])[0]?.[0];
      if (!(bytes instanceof Uint8Array) || bytes.length !== Math.min(65520, size - offset))
        throw Error("storage-corrupt");
      hash.append(bytes);
      if (++work % 64 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (hash.finish() !== digest) throw Error("storage-corrupt");
    revision = result;
  }
  if (sql(storageSql.revision)[0]?.[0] !== revision) throw Error("storage-corrupt");
  await validateLegacyModel(sql, rows);
}
globalThis.validateLegacy = validateLegacy;
