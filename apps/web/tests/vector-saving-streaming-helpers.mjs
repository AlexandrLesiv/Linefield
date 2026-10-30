/** Exercise the shipping decoder through the running application's checked Rust boundary. */
export async function installReplay(page, data) {
  await page.evaluate((batches) => {
    globalThis.replayBatches = batches;
    globalThis.replayCleanupMetrics = [];
    globalThis.drainReplay = async (token) => {
      const e = lab.core;
      let maxMs = 0;
      if (e.restore_cleanup(token, 0) !== 0 || e.restore_cleanup(token, 65) !== 0) return false;
      for (let steps = 0; steps < 10000; steps++) {
        const started = performance.now(),
          status = e.restore_cleanup(token, 1);
        maxMs = Math.max(maxMs, performance.now() - started);
        if (status === 2) {
          replayCleanupMetrics.push({ steps: steps + 1, budget: 1, maxMs });
          return true;
        }
        if (status !== 1 || e.restore_begin() !== 0) return false;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return false;
    };
    globalThis.rawState = () => {
      const e = lab.core;
      return JSON.stringify({
        paper: e.document_paper(),
        grid: e.document_grid(),
        count: e.count(),
        strokes: Array.from({ length: e.count() }, (_, id) => ({
          brush: e.brush(id),
          width: e.stroke_width(id),
          color: e.color(id),
          opacity: e.opacity(id),
          raw: Array.from({ length: e.raw_length(id) }, (_sample, i) => [
            String(e.raw_region(id, i, 0)),
            e.raw_local(id, i, 0),
            String(e.raw_region(id, i, 1)),
            e.raw_local(id, i, 1),
            e.raw_point(id, i, 2),
          ]),
        })),
      });
    };
    globalThis.feed = (token, fragment = 65520, mode = "valid") => {
      const e = lab.core;
      const append = (stream, bytes) => {
        for (let offset = 0; offset < bytes.length; offset += fragment) {
          const part = bytes.subarray(offset, Math.min(bytes.length, offset + fragment));
          new Uint8Array(e.memory.buffer, e.restore_input_ptr(), part.length).set(part);
          if (e.restore_append(token, stream, part.length) !== 1) return false;
        }
        return true;
      };
      for (let index = 0; index < replayBatches.length; index++) {
        const batch = replayBatches[index];
        if (
          e.restore_batch_begin(
            token,
            batch.streams.length,
            BigInt(batch.base),
            BigInt(batch.result),
          ) !== 1
        )
          return false;
        for (let stream = 0; stream < batch.streams.length; stream++) {
          let bytes = Uint8Array.from(batch.streams[stream]);
          if (
            stream === 0 &&
            ((mode === "bad-header" && index === 0) || (mode === "second-batch" && index === 1))
          )
            bytes[0] = 0;
          if (mode === "truncated" && index === 0 && stream === batch.streams.length - 1)
            bytes = bytes.subarray(0, bytes.length - 1);
          if (!append(stream, bytes)) return false;
        }
        if (mode !== "missing-replay") {
          if (e.restore_metadata_replay(token) !== 1) return false;
          const bytes = Uint8Array.from(batch.streams[0]);
          if (mode === "changed-replay" && index === 0) bytes[bytes.length - 1] ^= 1;
          if (!append(0, bytes)) return false;
        }
        if (e.restore_batch_end(token) !== 1) return false;
      }
      return true;
    };
  }, data);
}
