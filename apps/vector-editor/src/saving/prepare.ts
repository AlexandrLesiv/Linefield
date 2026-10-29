import type { Context, Part, SaveCore } from "./types";
import type { Storage } from "./adapter";
export const inputPending = () =>
  (
    navigator as Navigator & { scheduling?: { isInputPending(): boolean } }
  ).scheduling?.isInputPending() ?? false;
export type Measure = <T>(phase: string, call: () => T) => T;
export function writeJson(core: SaveCore, value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 2048) throw Error("save-boundary");
  new Uint8Array(core.memory.buffer, core.save_input_ptr(), bytes.length).set(bytes);
  return bytes.length;
}
export async function submit(
  core: SaveCore,
  storage: Storage,
  token: number,
  yieldWork: () => Promise<void>,
  measure: Measure,
) {
  let status = 1;
  while (status === 1) {
    await yieldWork();
    const start = performance.now();
    let calls = 0;
    do {
      status = measure("prepare", () => core.idle_step(token, 16));
    } while (status === 1 && ++calls < 64 && performance.now() - start < 1 && !inputPending());
  }
  if (status !== 2 || core.save_seal_begin(token) !== 1) throw Error("save-prepare");
  do {
    await yieldWork();
    const start = performance.now();
    let calls = 0;
    do {
      status = measure("seal", () => core.save_seal_step(token));
    } while (status === 1 && ++calls < 64 && performance.now() - start < 1 && !inputPending());
  } while (status === 1);
  if (status !== 2) throw Error("save-seal");
  const n = core.save_request_len(token);
  if (!n || n > 2048) throw Error("save-request");
  const context = JSON.parse(
    new TextDecoder().decode(new Uint8Array(core.memory.buffer, core.save_request_ptr(token), n)),
  ) as Context;
  const count = core.idle_stream_count(token);
  await storage.begin(context, count);
  let stream = 0,
    chunk = 0;
  while (stream < count) {
    await yieldWork();
    const start = performance.now(),
      parts: Part[] = [];
    let size = 0;
    do {
      const bytes = measure("encode-copy", () => {
        const length = core.idle_chunk(token, stream, chunk) >>> 0;
        if (length === 0xffffffff) throw Error("save-chunk");
        return new Uint8Array(core.memory.buffer, core.idle_chunk_ptr(), length).slice();
      });
      const last = bytes.length < 65520;
      parts.push({ stream, bytes, last });
      size += bytes.length;
      if (last) {
        stream++;
        chunk = 0;
      } else chunk++;
    } while (
      stream < count &&
      parts.length < 256 &&
      size < 196560 &&
      performance.now() - start < 1 &&
      !inputPending()
    );
    await storage.parts(parts);
  }
  const receipt = await storage.commit();
  if (measure("receipt", () => core.save_receipt(token, writeJson(core, receipt))) !== 1)
    throw Error("save-receipt");
}
