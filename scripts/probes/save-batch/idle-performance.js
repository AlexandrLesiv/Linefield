import { ink } from "./fixture.js";
import { abandonCapturedSource } from "./idle-boundary.js";
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    calls: values.length,
    totalMs: values.reduce((a, b) => a + b, 0),
    maxMs: sorted.at(-1) ?? 0,
    p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
  };
}
// A measurement driver, not the application scheduler. Every measured Rust call
// gets its own yielded browser task; fixture creation and task wait are separate.
export async function idlePerformance(load, count = 100000, mode = "idle", shape = "tiny") {
  if (!["idle", "legacy"].includes(mode) || !["tiny", "long"].includes(shape)) throw Error("mode");
  const e = await load(),
    channel = new MessageChannel();
  let yields = 0;
  let taskStart = null;
  const taskWork = [];
  const endTask = () => {
    if (taskStart !== null) taskWork.push(performance.now() - taskStart);
    taskStart = null;
  };
  const yieldTask = () =>
    new Promise((resolve) => {
      endTask();
      channel.port1.onmessage = () => {
        taskStart = performance.now();
        resolve();
      };
      channel.port2.postMessage(0);
      yields++;
    });
  const fixtureStart = performance.now();
  if (shape === "long") ink(e, count);
  else
    for (let i = 0; i < count; i++) {
      ink(e, 1, i);
      if (i % 1000 === 0) await yieldTask();
    }
  const fixtureMs = performance.now() - fixtureStart,
    fixtureWasmBytes = e.memory.buffer.byteLength;
  const phases = { freeze: [], prepare: [], metadata: [], ack: [], cleanup: [] };
  const call = (phase, fn) => {
    const start = performance.now(),
      result = fn();
    phases[phase].push(performance.now() - start);
    return result;
  };
  const boundary =
    mode === "idle"
      ? {
          begin: e.idle_begin,
          base: e.idle_base,
          target: e.idle_target,
          chunk: e.idle_chunk,
          ack: e.idle_ack,
        }
      : {
          begin: e.delta_prepare,
          base: e.delta_base,
          target: e.delta_target,
          chunk: e.delta_chunk,
          ack: e.delta_ack,
        };
  const windowStart = performance.now(),
    initialYields = yields;
  taskStart = null;
  taskWork.length = 0;
  let metadataBytes = 0,
    finalCleanupMs = null,
    cleanupUnits = 0;
  try {
    await yieldTask();
    const token = call("freeze", () => boundary.begin());
    if (!token) throw Error("capture rejected");
    if (mode === "idle") {
      for (;;) {
        await yieldTask();
        const status = call("prepare", () => e.idle_step(token, 64));
        if (status === 2) break;
        if (status !== 1) throw Error("prepare rejected");
      }
    }
    for (let chunk = 0; ; chunk++) {
      await yieldTask();
      const size = call("metadata", () => boundary.chunk(token, 0, chunk)) >>> 0;
      if (size === 0xffffffff) throw Error("metadata rejected");
      metadataBytes += size;
      if (size < 65520) break;
    }
    const abandonStart = performance.now();
    if (shape === "long") abandonCapturedSource(e);
    const abandonMs = performance.now() - abandonStart;
    await yieldTask();
    if (call("ack", () => boundary.ack(token, boundary.base(token), boundary.target(token))) !== 1)
      throw Error("ack rejected");
    if (mode === "idle") {
      // Known fixture ownership lets the final bare-allocator call be measured
      // alone. Shared tiny sources have no Point blocks to destroy here.
      const totalUnits =
        shape === "long" ? Math.ceil(count / 256) + 4 : count + Math.ceil(count / 256) + 1;
      for (;;) {
        const budget = totalUnits - cleanupUnits > 64 ? 64 : 1;
        await yieldTask();
        const status = call("cleanup", () => e.idle_cleanup(budget)) >>> 0;
        cleanupUnits += budget;
        if (status === 0) {
          finalCleanupMs = phases.cleanup.at(-1);
          break;
        }
        if (status !== 1 || cleanupUnits > totalUnits) throw Error("cleanup rejected");
      }
      if (cleanupUnits !== totalUnits) throw Error("unexpected source ownership");
    }
    endTask();
    return {
      mode,
      shape,
      count,
      fixtureMs,
      fixtureWasmBytes,
      wasmBytes: e.memory.buffer.byteLength,
      windowMs: performance.now() - windowStart,
      yields: yields - initialYields,
      taskWork: summary(taskWork),
      taskSamples: taskWork,
      phaseSamples: phases,
      metadataBytes,
      abandonMs,
      phases: Object.fromEntries(
        Object.entries(phases).map(([name, times]) => [name, summary(times)]),
      ),
      finalCleanupMs,
      cleanupUnits,
      syntheticAcknowledgement: true,
    };
  } finally {
    channel.port1.close();
    channel.port2.close();
  }
}
