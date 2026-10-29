import { source, checksum, consumer, nextFrame, CHUNK } from "./transport.js";
async function trial(count, mode) {
  const setupStart = performance.now();
  const { buffer, size } = source(count, mode === "shared-direct");
  const expectedChunks = [];
  for (let offset = 0; offset < size; offset += CHUNK)
    expectedChunks.push(checksum(buffer, offset, Math.min(CHUNK, size - offset)));
  const expected = expectedChunks.reduce((sum, value) => (sum + value) >>> 0, 0);
  const setupMs = performance.now() - setupStart;
  const staged =
    mode === "shared-staged" ? new SharedArrayBuffer(Math.min(CHUNK, size)) : undefined;
  const workerStart = performance.now();
  const worker = await consumer(mode === "shared-direct" ? buffer : staged);
  const workerStartMs = performance.now() - workerStart;
  let running = true,
    previous = performance.now(),
    hash = 0,
    workerMs = 0,
    detached = true;
  const frames = [],
    preparations = [],
    trips = [];
  let frameHandle = 0;
  function tick(now) {
    if (!running) return;
    frames.push(now - previous);
    previous = now;
    if (running) frameHandle = requestAnimationFrame(tick);
  }
  frameHandle = requestAnimationFrame(tick);
  await nextFrame();
  const start = performance.now();
  try {
    for (let offset = 0; offset < size; offset += CHUNK) {
      const length = Math.min(CHUNK, size - offset),
        begin = performance.now();
      const payload =
        mode === "transfer" ? new Uint8Array(buffer, offset, length).slice().buffer : undefined;
      if (staged) new Uint8Array(staged, 0, length).set(new Uint8Array(buffer, offset, length));
      preparations.push(performance.now() - begin);
      const sent = performance.now();
      const promise = worker.request(
        { generation: 1, offset: payload || staged ? 0 : offset, length, buffer: payload },
        payload ? [payload] : [],
      );
      if (payload) detached &&= payload.byteLength === 0;
      const result = await promise;
      trips.push(performance.now() - sent);
      workerMs += result.workerMs;
      if (
        result.kind !== "read" ||
        result.generation !== 1 ||
        result.hash !== expectedChunks[offset / CHUNK]
      )
        throw Error("unexpected response");
      hash = (hash + result.hash) >>> 0;
      // Same bounded per-frame scheduling for both transports, never unbounded copying.
      await nextFrame();
    }
    running = false;
    cancelAnimationFrame(frameHandle);
    const elapsedMs = performance.now() - start,
      validationStart = performance.now();
    if (hash !== expected || checksum(buffer, 0, size) !== expected || !detached)
      throw Error("data changed");
    return {
      mode,
      count,
      setupMs,
      workerStartMs,
      elapsedMs,
      validationMs: performance.now() - validationStart,
      preparations,
      trips,
      frames,
      workerMs,
      canonicalBytes: buffer.byteLength,
      maxExtraPayloadBytes: mode === "shared-direct" ? 0 : Math.min(CHUNK, size),
      hash,
      detached,
      chunks: preparations.length,
    };
  } finally {
    running = false;
    cancelAnimationFrame(frameHandle);
    worker.stop();
  }
}
export async function compare(count, permutation = 0) {
  const orders = [
    ["transfer", "shared-staged", "shared-direct"],
    ["transfer", "shared-direct", "shared-staged"],
    ["shared-staged", "transfer", "shared-direct"],
    ["shared-staged", "shared-direct", "transfer"],
    ["shared-direct", "transfer", "shared-staged"],
    ["shared-direct", "shared-staged", "transfer"],
  ];
  const results = [];
  for (const mode of orders[permutation]) results.push(await trial(count, mode));
  if (results.some((result) => result.hash !== results[0].hash))
    throw Error("cross-transport mismatch");
  return results;
}
