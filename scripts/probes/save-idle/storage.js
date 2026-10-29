// Worker-only staging: no whole-batch assembly or hashing on the input thread.
let staged;
globalThis.idleStorage = async (db, m) => {
  if (m.kind === "idle-start") {
    if (staged || !Number.isInteger(m.streams) || m.streams < 1 || m.streams > 100001)
      throw Error("busy-or-capacity");
    if (
      Object.keys(m.context).some(
        (k) => !["document", "incarnation", "grant", "operation", "base", "result"].includes(k),
      )
    )
      throw Error("context fields");
    staged = {
      context: m.context,
      count: m.streams,
      parts: [],
      next: 0,
      bytes: 4 + 4 * m.streams,
      payload: null,
      digest: null,
    };
    return "accepted";
  }
  if (!staged) throw Error("missing-batch");
  const validatePart = (part, next, total) => {
    if (
      staged.payload ||
      part.stream !== next ||
      part.stream >= staged.count ||
      typeof part.last !== "boolean" ||
      !(part.bytes instanceof Uint8Array) ||
      part.bytes.length > 65520 ||
      (!part.last && part.bytes.length !== 65520) ||
      (part.last && part.bytes.length === 65520) ||
      total + part.bytes.length > 48 * 1024 * 1024
    )
      throw Error("range");
  };
  if (m.kind === "idle-parts") {
    if (
      !Array.isArray(m.parts) ||
      !m.parts.length ||
      m.parts.length > 256 ||
      m.parts.reduce((n, p) => n + p.bytes.byteLength, 0) > 262080
    )
      throw Error("parts capacity");
    let next = staged.next,
      total = staged.bytes;
    for (const part of m.parts) {
      if (Object.keys(part).some((k) => !["stream", "bytes", "last"].includes(k)))
        throw Error("part fields");
      validatePart(part, next, total);
      total += part.bytes.length;
      if (part.last) next++;
    }
    for (const part of m.parts) await idleStorage(db, { ...part, kind: "idle-part" });
    return "released";
  }
  if (m.kind === "idle-part") {
    validatePart(m, staged.next, staged.bytes);
    (staged.parts[m.stream] ||= []).push(m.bytes);
    staged.bytes += m.bytes.length;
    if (m.last) staged.next++;
    return "released";
  }
  if (m.kind === "idle-seal") {
    if (staged.payload) return { ...staged.context, digest: staged.digest };
    if (staged.next !== staged.count) throw Error("incomplete");
    const payload = new Uint8Array(staged.bytes),
      view = new DataView(payload.buffer);
    view.setUint32(0, staged.count, true);
    let offset = 4;
    for (const parts of staged.parts) {
      const length = parts.reduce((n, p) => n + p.length, 0);
      view.setUint32(offset, length, true);
      offset += 4;
      for (const part of parts) {
        payload.set(part, offset);
        offset += part.length;
      }
    }
    staged.payload = payload;
    staged.parts = [];
    staged.digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", payload)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    return { ...staged.context, digest: staged.digest };
  }
  if (m.kind === "idle-commit") {
    if (!staged.payload || !staged.digest) throw Error("unsealed");
    if (m.injectFailure) throw Error("injected-storage-failure");
    const receipt = await receiptCommand(db, {
      ...staged.context,
      kind: "receipt-apply",
      digest: staged.digest,
      payload: staged.payload,
      fault: m.fault,
    });
    staged = undefined;
    return receipt;
  }
  throw Error("command");
};
