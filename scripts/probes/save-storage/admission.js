// Pinned SQLite 3.54.1 SAH metadata, disposable bounded fixture only.
// No SQLite init/open/repair is called by inspection. Unknown layouts reject.
async function inspectPool(name) {
  const root = await navigator.storage.getDirectory();
  let directory;
  try {
    directory = await (
      await root.getDirectoryHandle(`.save02-${name}`)
    ).getDirectoryHandle(".opaque");
  } catch (error) {
    if (error.name === "NotFoundError") return { admitted: false, reason: "missing" };
    throw error;
  }
  const files = [],
    paths = new Set();
  let total = 0,
    reason = "";
  for await (const [fileName, handle] of directory) {
    if (handle.kind !== "file" || files.length >= 32) throw Error("inspection bound/type");
    const file = await handle.getFile();
    total += file.size;
    if (total > 1048576 || file.size < 4096) throw Error("inspection size bound");
    const bytes = new Uint8Array(await file.arrayBuffer()),
      view = new DataView(bytes.buffer);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    files.push({ fileName, size: bytes.length, hash });
    const flags = view.getUint32(512),
      end = bytes.subarray(0, 512).indexOf(0);
    const mapped = bytes[0] !== 0;
    if (end < 0 || flags & ~0x84986 || (mapped && (!(flags & 0x84900) || !(flags & 0x80)))) {
      reason ||= "unknown-flags-or-path";
      continue;
    }
    let h1 = 0,
      h2 = 0;
    if (flags & 0x80) {
      h1 = 0xdeadbeef;
      h2 = 0x41c6ce57;
      for (const byte of bytes.subarray(0, 516)) {
        h1 = Math.imul(h1 ^ byte, 2654435761);
        h2 = Math.imul(h2 ^ byte, 104729);
      }
    }
    if (view.getUint32(516, true) !== h1 >>> 0 || view.getUint32(520, true) !== h2 >>> 0)
      reason ||= "bad-digest";
    if (!mapped) {
      if (file.size !== 4096 || flags !== 0) reason ||= "unmapped-payload";
      continue;
    }
    let path;
    try {
      path = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, end));
    } catch {
      reason ||= "invalid-path";
      continue;
    }
    if (!path.startsWith("/") || path.includes("..") || paths.has(path))
      reason ||= "ambiguous-path";
    paths.add(path);
  }
  if (!paths.has("/drawing.sqlite")) reason ||= "missing-drawing";
  return {
    admitted: !reason && files.length > 0,
    reason: reason || (files.length ? "known-fixture-layout" : "empty"),
    files,
  };
}

globalThis.inspectPool = inspectPool;
