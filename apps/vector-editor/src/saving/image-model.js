// Validate one retained original per maintenance turn; tombstones are scanned in
// bounded groups and never become asset roots.
async function* imageModelReferences(core, token, read) {
  if (
    imageStorageFingerprint.some((word, index) => core.image_fingerprint_word(index) >>> 0 !== word)
  )
    throw Error("storage-image-boundary");
  for (let index = 0; ; index++) {
    const state = core.image_restore_asset(token, index);
    if (state === 2) return;
    if (state === 3) {
      if (index % 32 === 31) yield;
      continue;
    }
    if (state !== 1) throw Error("storage-image-boundary");
    const expected = Array.from(
      new Float64Array(core.memory.buffer, core.image_asset_output_ptr(), 5),
    );
    const digest = new TextDecoder().decode(
      new Uint8Array(core.memory.buffer, core.image_asset_digest_ptr(), 64),
    );
    const actual = await read(digest);
    if (
      ["version", "mime", "width", "height", "bytes"].some((key, i) => actual[key] !== expected[i])
    )
      throw Error("storage-image-conflict");
    yield;
  }
}
globalThis.imageModelReferences = imageModelReferences;
