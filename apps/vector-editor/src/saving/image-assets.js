/** Opaque immutable asset storage. Rust owns metadata admission, schema and SHA-256. */
function imageAssets(db, document, grant, changed) {
  const sql = (query, bind = []) =>
    db.exec({ sql: query, bind, rowMode: "array", returnValue: "resultRows" });
  let verifiedCore;
  const codec = async () => {
    if (!verifiedCore) {
      const core = await storageCodec();
      if (
        imageStorageFingerprint.some(
          (word, index) => core.image_fingerprint_word(index) >>> 0 !== word,
        ) ||
        Object.entries(imageStorageArity).some(
          ([name, arity]) => typeof core[name] !== "function" || core[name].length !== arity,
        )
      )
        throw Error("storage-image-boundary");
      verifiedCore = core;
    }
    return verifiedCore;
  };
  const descriptor = async (version, mime, width, height, bytes) => {
    const core = await codec();
    if (
      ![version, mime, width, height, bytes].every(
        (value) => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff,
      ) ||
      core.image_asset_validate(mime, width, height, bytes, version) !== 1
    )
      throw Error("storage-image-metadata");
    return { version, mime, width, height, bytes };
  };
  const hash = async (bytes) => {
    const hasher = await storageHasher();
    for (let offset = 0; offset < bytes.length; offset += 65520) {
      hasher.append(bytes.subarray(offset, offset + 65520));
      if (offset % (65520 * 32) === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return hasher.finish();
  };
  const read = async (digest) => {
    if (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest))
      throw Error("storage-image-identity");
    const rows = sql(storageSql.readImageAsset, [document, digest]),
      row = rows[0];
    if (rows.length !== 1 || !row || !(row[5] instanceof Uint8Array))
      throw Error("storage-image-missing");
    const metadata = await descriptor(...row.slice(0, 5));
    if (row[5].length !== metadata.bytes || (await hash(row[5])) !== digest)
      throw Error("storage-image-corrupt");
    return {
      ...metadata,
      digest,
      blob: new Blob([row[5]], {
        type: ["", "image/png", "image/jpeg", "image/webp"][metadata.mime],
      }),
    };
  };
  return {
    read,
    finish(lease, revision) {
      if (!validId(lease) || (revision !== null && !validRevision(revision)))
        throw Error("storage-image-lease");
      changed();
      sql(
        revision === null ? storageSql.releaseAssetLease : storageSql.publishAssetLease,
        revision === null ? [lease, grant] : [revision, lease, grant],
      );
    },
    hold() {
      const lease = crypto.randomUUID();
      sql(storageSql.insertAssetLease, [lease, grant, "*", "export"]);
      return lease;
    },
    release(lease) {
      if (!validId(lease)) throw Error("storage-image-lease");
      sql(storageSql.releaseAssetLease, [lease, grant]);
      changed();
    },
    verifyModelSteps: (core, token) => imageModelReferences(core, token, read),
    async verifyModel(core, token) {
      for await (const step of imageModelReferences(core, token, read)) {
        void step;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    },
    async verify(references) {
      if (!Array.isArray(references) || references.length > 32)
        throw Error("storage-image-boundary");
      for (const ref of references) {
        const result = await read(ref.digest);
        if (["version", "mime", "width", "height", "bytes"].some((key) => result[key] !== ref[key]))
          throw Error("storage-image-conflict");
      }
      return null;
    },
    async stage(blob, metadata) {
      if (
        !(blob instanceof Blob) ||
        !metadata ||
        Object.keys(metadata).some((key) => !["mime", "width", "height", "version"].includes(key))
      )
        throw Error("storage-image-metadata");
      const checked = await descriptor(
        metadata.version,
        metadata.mime,
        metadata.width,
        metadata.height,
        blob.size,
      );
      const bytes = new Uint8Array(await blob.arrayBuffer()),
        digest = await hash(bytes);
      sql(storageSql.begin);
      try {
        sql(
          checked.bytes > 16777216 ? storageSql.insertLargeImageAsset : storageSql.insertImageAsset,
          [document, digest, checked.mime, checked.width, checked.height, checked.bytes, bytes],
        );
        const result = await read(digest);
        if (
          ["mime", "width", "height", "bytes", "version"].some(
            (key) => result[key] !== checked[key],
          )
        )
          throw Error("storage-image-conflict");
        const lease = crypto.randomUUID();
        sql(storageSql.insertAssetLease, [lease, grant, digest, "stage"]);
        sql(storageSql.commit);
        changed();
        return { ...checked, digest, lease };
      } catch (error) {
        sql(storageSql.rollback);
        throw error;
      }
    },
  };
}
globalThis.imageAssets = imageAssets;
