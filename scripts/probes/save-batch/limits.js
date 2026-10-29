import { ink, bytes } from "./fixture.js";
export async function limits(load) {
  const e = await load(),
    results = [];
  ink(e, 1000000);
  const token = e.save_capture();
  if (!token) throw Error("exact sample cap rejected");
  const first = bytes(e, token, 0);
  ink(e, 1, 1);
  if (e.save_capture() !== 0 || bytes(e, token, 0).some((v, i) => v !== first[i]))
    throw Error("busy snapshot replaced");
  e.save_release(token);
  if (e.save_capture() !== 0) throw Error("sample cap not enforced");
  results.push("exact sample cap accepted; excess rejected; retained capture unchanged");
  const metadata = await load();
  for (let i = 0; i < 100000; i++) ink(metadata, 1, i);
  const wasmBeforeCapture = metadata.memory.buffer.byteLength;
  const start = performance.now(),
    large = metadata.save_capture();
  const captureMs = performance.now() - start;
  if (!large || metadata.save_stream_count(large) !== 100001)
    throw Error("metadata boundary rejected");
  const metadataBytes = bytes(metadata, large, 0).length;
  metadata.save_release(large);
  ink(metadata, 1, 100000);
  if (metadata.save_capture() !== 0) throw Error("scan cap not enforced");
  results.push("100000 stroke scan accepted; excess rejected");
  return {
    results,
    metadataCapture: {
      strokes: 100000,
      captureMs,
      metadataBytes,
      wasmBeforeCapture,
      wasmBytes: metadata.memory.buffer.byteLength,
    },
  };
}
