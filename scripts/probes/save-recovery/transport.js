import { client } from "/client.js";
import { digest } from "/cases.js";
// Explicit framing binds stream order and lengths. This fixture aggregates one bounded batch;
// production streaming/SQLite blob writes are a separate gate.
export function pack(streams) {
  const size = streams.reduce((n, s) => n + 4 + s.byteLength, 4);
  if (!streams.length || streams.length > 100001 || size > 48 * 1024 * 1024)
    throw Error("capacity");
  const bytes = new Uint8Array(size),
    view = new DataView(bytes.buffer);
  view.setUint32(0, streams.length, true);
  let offset = 4;
  for (const stream of streams) {
    view.setUint32(offset, stream.byteLength, true);
    offset += 4;
    bytes.set(stream, offset);
    offset += stream.byteLength;
  }
  return bytes;
}
export function unpack(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 4 || bytes.byteLength > 48 * 1024 * 1024) throw Error("length");
  const count = view.getUint32(0, true),
    streams = [];
  if (!count || count > 100001) throw Error("count");
  let offset = 4;
  for (let i = 0; i < count; i++) {
    if (offset + 4 > bytes.byteLength) throw Error("truncated");
    const length = view.getUint32(offset, true);
    offset += 4;
    if (length > bytes.byteLength - offset) throw Error("truncated");
    streams.push(bytes.slice(offset, offset + length));
    offset += length;
  }
  if (offset !== bytes.byteLength) throw Error("trailing");
  return streams;
}
export async function persistence(pool = "roundtrip", faultFirst) {
  const context = { document: "drawing", incarnation: "roundtrip1", grant: "writer1" };
  let c = client();
  const measurements = [];
  await c.call("open", { pool });
  await c.call("receipt-init", context);
  return {
    measurements,
    async save(streams, base, result) {
      const started = performance.now();
      const payload = pack(streams),
        framed = performance.now(),
        bytes = payload.byteLength,
        hash = await digest(payload),
        hashed = performance.now();
      const expected = {
        ...context,
        operation: `revision${result}`,
        base: String(base),
        result: String(result),
        digest: hash,
      };
      let receipt;
      const fault = measurements.length === 0 ? faultFirst : undefined;
      if (fault) {
        const notice = c.fault(),
          pending = c
            .call("receipt-apply", { ...expected, payload, fault }, [payload.buffer])
            .catch(() => {});
        await notice;
        c.terminate();
        await pending;
        c = client();
        await c.call("open", { pool, guarded: true });
        receipt = await c.call("receipt-reconcile", expected);
        if (fault === "before-commit") {
          if (receipt.outcome !== "unknown") throw Error("unexpected precommit receipt");
          const rebuilt = pack(streams);
          receipt = await c.call("receipt-apply", { ...expected, payload: rebuilt }, [
            rebuilt.buffer,
          ]);
        } else if (receipt.outcome !== "committed") throw Error("missing committed receipt");
      } else receipt = await c.call("receipt-apply", { ...expected, payload }, [payload.buffer]);
      validateReceipt(receipt, expected);
      measurements.push({
        bytes,
        fault: fault || null,
        frameMs: framed - started,
        hashMs: hashed - framed,
        submitThroughReceiptMs: performance.now() - hashed,
      });
      if (payload.byteLength !== 0) throw Error("not transferred");
      return receipt;
    },
    async reload() {
      await c.call("close");
      c.terminate();
      c = client();
      await c.call("open", { pool, guarded: true });
      return decodeSaved(await c.call("receipt-load", context));
    },
    async close() {
      await c.call("close");
      c.terminate();
    },
  };
}

export async function decodeSaved(loaded) {
  const validRevision = (s) =>
    typeof s === "string" && /^(0|[1-9][0-9]{0,19})$/.test(s) && BigInt(s) <= 18446744073709551615n;
  if (!validRevision(loaded.revision) || loaded.batches.length > 128) throw Error("invalid head");
  let revision = "0",
    total = 0;
  const batches = [];
  for (const [operation, base, result, hash, payload] of loaded.batches) {
    total += payload.byteLength;
    if (
      !/^[a-zA-Z0-9_-]{1,64}$/.test(operation) ||
      !validRevision(base) ||
      !validRevision(result) ||
      total > 48 * 1024 * 1024 ||
      base !== revision ||
      BigInt(result) <= BigInt(base) ||
      (await digest(payload)) !== hash
    )
      throw Error("invalid saved chain");
    batches.push({
      operation,
      base: BigInt(base),
      result: BigInt(result),
      streams: unpack(payload),
    });
    revision = result;
  }
  if (revision !== loaded.revision) throw Error("head mismatch");
  return batches;
}

export function validateReceipt(receipt, expected) {
  if (
    receipt.outcome !== "committed" ||
    ["document", "incarnation", "grant", "operation", "base", "result", "digest"].some(
      (key) => receipt[key] !== expected[key],
    )
  )
    throw Error("receipt mismatch");
  return receipt;
}
