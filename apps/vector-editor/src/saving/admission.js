// Pinned SQLite 3.54.1 SAH layout. Inspect bounded headers before SQLite can repair/open it.
async function inspectDrawingPool(directory = ".linefield-save-v1", filename = "/drawing.sqlite") {
  const root = await navigator.storage.getDirectory();
  let dir;
  try {
    dir = await root.getDirectoryHandle(directory);
  } catch (e) {
    if (e.name === "NotFoundError") return { fresh: true };
    throw e;
  }
  const opaque = await dir.getDirectoryHandle(".opaque");
  const paths = new Set();
  let files = 0;
  for await (const [, handle] of opaque) {
    if (handle.kind !== "file" || ++files > 32) throw Error("storage-layout");
    const file = await handle.getFile();
    if (file.size < 4096 || !Number.isSafeInteger(file.size)) throw Error("storage-capacity");
    const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
    const view = new DataView(bytes.buffer),
      flags = view.getUint32(512),
      end = bytes.subarray(0, 512).indexOf(0);
    if (end < 0 || flags & ~0x84986) throw Error("storage-layout");
    const mapped = bytes[0] !== 0;
    if (mapped && (!(flags & 0x84900) || !(flags & 0x80))) throw Error("storage-layout");
    let a = 0,
      b = 0;
    if (flags & 0x80) {
      a = 0xdeadbeef;
      b = 0x41c6ce57;
      for (const byte of bytes.subarray(0, 516)) {
        a = Math.imul(a ^ byte, 2654435761);
        b = Math.imul(b ^ byte, 104729);
      }
    }
    if (view.getUint32(516, true) !== a >>> 0 || view.getUint32(520, true) !== b >>> 0)
      throw Error("storage-corrupt");
    if (!mapped) {
      if (file.size !== 4096 || flags !== 0) throw Error("storage-layout");
      continue;
    }
    const path = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, end));
    if (![filename, filename + "-journal"].includes(path) || paths.has(path))
      throw Error("storage-layout");
    paths.add(path);
  }
  if (!files || !paths.has(filename)) throw Error("storage-layout");
  return { fresh: false };
}
globalThis.inspectDrawingPool = inspectDrawingPool;
