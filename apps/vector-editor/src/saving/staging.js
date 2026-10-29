function staging(database) {
  let state;
  return async (m) => {
    if (m.kind === "begin") {
      if (state || !Number.isInteger(m.streams) || m.streams < 1 || m.streams > 100001)
        throw Error("storage-capacity");
      database.context(m.context);
      state = {
        context: m.context,
        storage: crypto.randomUUID(),
        count: m.streams,
        next: 0,
        chunk: 0,
        bytes: 4 + m.streams * 4,
      };
      return null;
    }
    if (!state || state.poisoned) throw Error("storage-state");
    if (m.kind === "parts") {
      if (
        state.sealed ||
        state.hash ||
        !Array.isArray(m.parts) ||
        !m.parts.length ||
        m.parts.length > 256
      )
        throw Error("storage-parts");
      let next = state.next,
        chunk = state.chunk,
        bytes = state.bytes,
        added = 0;
      const accepted = [];
      for (const part of m.parts) {
        if (
          !part ||
          Object.keys(part).some((k) => !["stream", "bytes", "last"].includes(k)) ||
          part.stream !== next ||
          next >= state.count ||
          typeof part.last !== "boolean" ||
          !(part.bytes instanceof Uint8Array) ||
          part.bytes.length > 65520 ||
          part.last !== part.bytes.length < 65520
        )
          throw Error("storage-parts");
        accepted.push({ ...part, chunk });
        added += part.bytes.length;
        bytes += part.bytes.length;
        chunk++;
        if (part.last) {
          next++;
          chunk = 0;
        }
      }
      if (added > 262080 || bytes > 48 * 1024 * 1024) throw Error("storage-capacity");
      try {
        database.put(state.storage, accepted);
      } catch (error) {
        state = { poisoned: true };
        throw error;
      }
      Object.assign(state, { next, chunk, bytes });
      return null;
    }
    if (m.kind === "seal") {
      if (state.next !== state.count) throw Error("storage-incomplete");
      if (!state.sealed) {
        if (!state.hash) {
          state.hash = await storageHasher();
          hashWord(state.hash, state.count);
          state.sealStream = 0;
          state.sealChunk = 0;
          state.sealTotal = 4 + state.count * 4;
          state.sealOffset = 0;
        }
        for (let work = 0; work < 64 && state.sealStream < state.count; work++) {
          if (state.sealChunk === 0) {
            state.sealLength = database.stagedLength(state.storage, state.sealStream);
            hashWord(state.hash, state.sealLength);
          }
          const part = database.stagedPart(state.storage, state.sealStream, state.sealChunk++);
          if (part.last !== part.bytes.length < 65520) {
            state = { poisoned: true };
            throw Error("storage-corrupt");
          }
          state.hash.append(part.bytes);
          state.sealOffset += part.bytes.length;
          if (part.last) {
            if (state.sealOffset !== state.sealLength) {
              state = { poisoned: true };
              throw Error("storage-corrupt");
            }
            state.sealTotal += state.sealLength;
            state.sealStream++;
            state.sealChunk = state.sealOffset = 0;
          }
        }
        if (state.sealStream < state.count) return { pending: true };
        if (state.sealTotal !== state.bytes || state.hash.finish() !== state.context.digest) {
          state = { poisoned: true };
          throw Error("storage-digest");
        }
        state.sealed = true;
        state.hash = undefined;
      }
      return { ...state.context };
    }
    if (m.kind === "commit") {
      if (!state.sealed) throw Error("storage-unsealed");
      const receipt = await database.commitChunks(
        state.context,
        state.storage,
        state.count,
        state.bytes,
      );
      state = undefined;
      // Reclaim only unreferenced staging rows, in a bounded transaction after durable publication.
      try {
        database.cleanup();
      } catch {}
      return receipt;
    }
    throw Error("storage-command");
  };
}
globalThis.staging = staging;
