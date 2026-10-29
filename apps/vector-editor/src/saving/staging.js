function staging(database) {
  let state;
  return async (m) => {
    if (m.kind === "begin") {
      if (state || !Number.isInteger(m.streams) || m.streams < 1 || m.streams > 100001)
        throw Error("storage-capacity");
      database.context(m.context);
      state = {
        context: m.context,
        count: m.streams,
        parts: [],
        next: 0,
        bytes: 4 + m.streams * 4,
      };
      return null;
    }
    if (!state || state.poisoned) throw Error("storage-state");
    if (m.kind === "parts") {
      if (state.payload || !Array.isArray(m.parts) || !m.parts.length || m.parts.length > 256)
        throw Error("storage-parts");
      let next = state.next,
        bytes = state.bytes,
        added = 0;
      for (const part of m.parts) {
        if (
          Object.keys(part).some((k) => !["stream", "bytes", "last"].includes(k)) ||
          part.stream !== next ||
          next >= state.count ||
          typeof part.last !== "boolean" ||
          !(part.bytes instanceof Uint8Array) ||
          part.bytes.length > 65520 ||
          (!part.last && part.bytes.length !== 65520) ||
          (part.last && part.bytes.length === 65520)
        )
          throw Error("storage-parts");
        added += part.bytes.length;
        bytes += part.bytes.length;
        if (part.last) next++;
      }
      if (added > 262080 || bytes > 48 * 1024 * 1024) throw Error("storage-capacity");
      for (const part of m.parts) (state.parts[part.stream] ||= []).push(part.bytes);
      state.next = next;
      state.bytes = bytes;
      return null;
    }
    if (m.kind === "seal") {
      if (state.next !== state.count) throw Error("storage-incomplete");
      if (!state.payload) {
        const payload = new Uint8Array(state.bytes),
          view = new DataView(payload.buffer);
        view.setUint32(0, state.count, true);
        let offset = 4;
        for (const parts of state.parts) {
          view.setUint32(
            offset,
            parts.reduce((n, p) => n + p.length, 0),
            true,
          );
          offset += 4;
          for (const p of parts) {
            payload.set(p, offset);
            offset += p.length;
          }
        }
        // No rejected seal may leave commit-capable bytes behind.
        const digest = await hashBytes(payload);
        if (digest !== state.context.digest) {
          state = { poisoned: true };
          throw Error("storage-digest");
        }
        state.parts = [];
        state.payload = payload;
        state.digest = digest;
      }
      return { ...state.context, digest: state.digest };
    }
    if (m.kind === "commit") {
      if (!state.payload || !state.digest) throw Error("storage-unsealed");
      const receipt = await database.commit(state.context, state.payload, state.digest);
      state = undefined;
      return receipt;
    }
    throw Error("storage-command");
  };
}
globalThis.staging = staging;
