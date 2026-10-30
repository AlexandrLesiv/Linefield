/** Serialized into the actual editor iframe by the browser E2E runner. */
export async function inputSession({ device, count = 480, interval = 8, visibleOnly = false }) {
  const c = document.querySelector("canvas"),
    core = lab.core,
    rect = c.getBoundingClientRect();
  const original = [c.setPointerCapture, c.hasPointerCapture, c.releasePointerCapture],
    held = new Set();
  c.setPointerCapture = (id) => held.add(id);
  c.hasPointerCapture = (id) => held.has(id);
  c.releasePointerCapture = (id) => held.delete(id);
  const raw = (id) =>
    Array.from({ length: core.raw_length(id) }, (_, i) => [
      String(core.raw_region(id, i, 0)),
      core.raw_local(id, i, 0),
      String(core.raw_region(id, i, 1)),
      core.raw_local(id, i, 1),
      core.raw_point(id, i, 2),
    ]);
  const oldIds = Array.from({ length: core.count() }, (_, id) => id).filter(
    (id) => !visibleOnly || core.visible(id),
  );
  const before = JSON.stringify(oldIds.map(raw));
  const frameAt = [],
    dispatchAt = [],
    longTaskAt = [];
  const frames = [],
    delays = [],
    handlers = [],
    longTasks = [],
    heap = [];
  let running = true,
    previous = 0;
  const frame = (now) => {
    if (!running) return;
    if (previous) {
      frames.push(now - previous);
      frameAt.push(performance.timeOrigin + now);
    }
    previous = now;
    requestAnimationFrame(frame);
  };
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    longTasks.push(...entries.map((e) => e.duration));
    longTaskAt.push(...entries.map((e) => performance.timeOrigin + e.startTime));
  });
  observer.observe({ type: "longtask", buffered: false });
  requestAnimationFrame(frame);
  const memoryTimer = setInterval(() => {
    if (performance.memory) heap.push(performance.memory.usedJSHeapSize);
  }, 50);
  const send = (type, i) =>
    c.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: device === "pen" ? 3 : 1,
        pointerType: device,
        isPrimary: true,
        button: type === "pointermove" ? -1 : 0,
        buttons: type === "pointerup" ? 0 : 1,
        pressure: device === "pen" ? 0.7 : 0.5,
        clientX: rect.left + 120 + i * 1.8,
        clientY: rect.top + 180 + Math.sin(i * 0.1) * 50,
      }),
    );
  const start = performance.now();
  try {
    send("pointerdown", 0);
    for (let i = 1; i <= count; i++) {
      const target = start + i * interval;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, target - performance.now())));
      const at = performance.now();
      delays.push(at - target);
      dispatchAt.push(performance.timeOrigin + at);
      send("pointermove", i);
      handlers.push(performance.now() - at);
    }
    send("pointerup", count);
    const accepted = performance.now(),
      id = core.count() - 1;
    while (lab.renderPending()) await new Promise((resolve) => requestAnimationFrame(resolve));
    const imageReadyMs = performance.now() - accepted;
    await new Promise((resolve) => setTimeout(resolve, 150));
    const result = {
      frameAt,
      dispatchAt,
      longTaskAt,
      inputStart: performance.timeOrigin + start,
      inputEnd: performance.timeOrigin + accepted,
      device,
      injected: true,
      expectedSamples: count + 1,
      raw: raw(id),
      frames,
      delays,
      handlers,
      longTasks,
      heap,
      durationMs: performance.now() - start,
      imageReadyMs,
      priorRawScope: visibleOnly ? "visible" : "all",
      priorRawUnchanged: before === JSON.stringify(oldIds.map(raw)),
    };
    running = false;
    await lab.saving.flush(true);
    result.saving = lab.inputDiagnostics().state.saving;
    return result;
  } finally {
    running = false;
    clearInterval(memoryTimer);
    observer.disconnect();
    [c.setPointerCapture, c.hasPointerCapture, c.releasePointerCapture] = original;
  }
}
