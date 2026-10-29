import { source, checksum, consumer, MAX } from "./transport.js";
async function recoverMode(mode) {
  const { buffer, size } = source(10000, mode === "shared"),
    hash = checksum(buffer, 0, size);
  const worker = await consumer(mode === "shared" ? buffer : undefined, 7),
    checks = [];
  try {
    for (const bad of [
      { generation: 6, offset: 0, length: size },
      { generation: 7, offset: -40, length: 40 },
      { generation: 7, offset: 0, length: MAX },
      { generation: 7, offset: 1, length: 40 },
    ]) {
      const result = await worker.request({
        ...bad,
        buffer: mode === "transfer" ? buffer.slice(0) : undefined,
      });
      if (result.kind !== "rejected") throw Error("invalid descriptor accepted");
      checks.push("reject-invalid");
    }
    const swapped = new Uint8Array(buffer, 0, size).slice();
    const first = swapped.slice(0, 40);
    swapped.copyWithin(0, 40, 80);
    swapped.set(first, 40);
    if (checksum(swapped.buffer, 0, size) === hash) throw Error("order check failed");
    checks.push("order-swap-detected");
    await worker.request({ generation: 7, offset: 0, length: 40, invalid: () => {} }).then(
      () => {
        throw Error("clone failure accepted");
      },
      () => checks.push("clone-failure-settled"),
    );
    const payload =
      mode === "transfer" ? new Uint8Array(buffer, 0, size).slice().buffer : undefined;
    const pending = worker.request(
      { generation: 7, offset: 0, length: size, buffer: payload },
      payload ? [payload] : [],
    );
    try {
      worker.request({ generation: 7, offset: 0, length: 40 });
      throw Error("unbounded queue");
    } catch (error) {
      if (error.message !== "capacity") throw error;
      checks.push("bounded-queue");
    }
    worker.stop();
    try {
      worker.request({ generation: 7, offset: 0, length: 40 });
      throw Error("retired admission");
    } catch (error) {
      if (error.message !== "retired") throw error;
      checks.push("retired-admission");
    }
    await pending.then(
      () => {
        throw Error("retired request accepted");
      },
      () => checks.push("retired-pending"),
    );
    if (checksum(buffer, 0, size) !== hash) throw Error("source lost on worker termination");
    checks.push("source-retained");
    // New worker gets new generation; no inference of a database commit is made.
    const replacement = await consumer(mode === "shared" ? buffer : undefined, 8);
    try {
      const stale = await replacement.request({
        generation: 7,
        offset: 0,
        length: size,
        buffer: mode === "transfer" ? buffer.slice(0) : undefined,
      });
      if (stale.kind !== "rejected") throw Error("stale generation");
      checks.push("reject-old-generation");
      const retry =
        mode === "transfer" ? new Uint8Array(buffer, 0, size).slice().buffer : undefined;
      const result = await replacement.request(
        { generation: 8, offset: 0, length: size, buffer: retry },
        retry ? [retry] : [],
      );
      if (result.hash !== hash) throw Error("recovery mismatch");
      checks.push("ordered-checksum-reread");
    } finally {
      replacement.stop();
    }
    await consumer(undefined, 1, "./missing-worker.js").then(
      () => {
        throw Error("startup failure accepted");
      },
      () => checks.push("startup-failure-settled"),
    );
    const throwing = await consumer(buffer, 9);
    await throwing.request({ generation: 9, offset: 0, length: 40, fault: "throw" }).then(
      () => {
        throw Error("runtime failure accepted");
      },
      () => checks.push("runtime-failure-settled"),
    );
    throwing.stop();
    const stalled = await consumer(buffer, 10);
    await stalled.request({ generation: 10, offset: 0, length: 40, fault: "stall" }).then(
      () => {
        throw Error("stalled request accepted");
      },
      () => checks.push("watchdog-settled"),
    );
    stalled.stop();
    if (checksum(buffer, 0, size) !== hash) throw Error("watchdog changed source");
    checks.push("watchdog-source-retained");
    return {
      mode,
      checks,
      hash,
      note: "Transport recovery only; no database commit or durability claim.",
    };
  } finally {
    worker.stop();
  }
}

export async function recovery() {
  return { variants: [await recoverMode("transfer"), await recoverMode("shared")] };
}
