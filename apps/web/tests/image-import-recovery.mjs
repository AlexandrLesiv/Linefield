export async function recovery() {
  const probe = window.imageProbe,
    canvas = new OffscreenCanvas(128, 128);
  canvas.getContext("2d");
  const small = await canvas.convertToBlob({ type: "image/png" });
  const checks = [];
  const reject = async (name, fn) => {
    try {
      await fn();
      throw Error("unexpected success " + name);
    } catch (error) {
      if (String(error).includes("unexpected success")) throw error;
      checks.push({ name, error: String(error) });
    }
  };
  probe.reset();
  await reject("malformed", () => probe.importBlob(new Blob(["broken"]), "worker"));
  await reject("encoded-limit", () =>
    probe.importBlob(new Blob([new Uint8Array(16777217)]), "worker"),
  );
  const oversized = new Uint8Array(await small.arrayBuffer());
  new DataView(oversized.buffer).setUint32(16, 16777217);
  await reject("pixel-limit", () => probe.importBlob(new Blob([oversized]), "worker"));
  const animated = new Uint8Array(await small.arrayBuffer());
  animated.set([97, 99, 84, 76], 37);
  await reject("declared-animation", () => probe.importBlob(new Blob([animated]), "worker"));
  const animatedWebp = new Uint8Array(30),
    wd = new DataView(animatedWebp.buffer);
  animatedWebp.set(new TextEncoder().encode("RIFF"));
  wd.setUint32(4, 22, true);
  animatedWebp.set(new TextEncoder().encode("WEBPVP8X"), 8);
  wd.setUint32(16, 10, true);
  animatedWebp[20] = 2;
  await reject("declared-webp-animation", () =>
    probe.importBlob(new Blob([animatedWebp]), "worker"),
  );
  const busy = probe.importBlob(small, "worker");
  await reject("one-job", () => probe.importBlob(small, "worker"));
  await busy;
  probe.reset();
  let entered;
  const gateEntered = new Promise((r) => (entered = r));
  probe.setUploadGate(() => {
    entered();
    return new Promise(() => {});
  });
  const blocked = probe.importBlob(small, "worker");
  await gateEntered;
  probe.cancel();
  await reject("cancel-gate", () => blocked);
  probe.reset();
  await probe.importBlob(small, "worker");
  checks.push({ name: "cancel-retry", passed: true });
  probe.reset();
  const pending = probe.importBlob(small, "worker");
  probe.cancel();
  await reject("cancel-header", () => pending);
  await probe.importBlob(small, "worker");
  probe.loseContext();
  await new Promise((r) => setTimeout(r, 20));
  await reject("lost-context", () => probe.importBlob(small, "worker"));
  probe.recoverContext();
  await probe.importBlob(small, "worker");
  checks.push({ name: "context-retry", passed: true });

  probe.reset();
  await probe.importBlob(new Blob([await small.arrayBuffer()], { type: "text/plain" }), "worker");
  checks.push({ name: "signature-over-mime", passed: true });
  probe.reset();
  for (let i = 0; i < 16; i++) await probe.importBlob(small, "worker");
  await reject("asset-count-limit", () => probe.importBlob(small, "worker"));
  probe.reset();
  const largeCanvas = new OffscreenCanvas(4096, 4096);
  largeCanvas.getContext("2d");
  const large = await largeCanvas.convertToBlob({ type: "image/png" });
  await probe.importBlob(large, "worker");
  await probe.importBlob(large, "worker");
  await reject("aggregate-pixel-limit", () => probe.importBlob(small, "worker"));
  probe.reset();
  const job = probe.importBlob(large, "worker");
  for (let i = 0; !probe.workerPending() && i < 100; i++)
    await new Promise((r) => setTimeout(r, 0));
  if (!probe.workerPending()) throw Error("worker fault injection missed pending job");
  probe.failWorker();
  await reject("worker-failure", () => job);
  await probe.importBlob(small, "worker");
  checks.push({ name: "worker-retry", passed: true });
  probe.reset();
  return checks;
}
