/** Delivered through the actual app input adapter; no direct canonical data seeding. */
export async function seedSvgDocument() {
  const canvas = document.querySelector("canvas"),
    rect = canvas.getBoundingClientRect();
  const originals = [
    canvas.setPointerCapture,
    canvas.hasPointerCapture,
    canvas.releasePointerCapture,
  ];
  const held = new Set();
  canvas.setPointerCapture = (id) => held.add(id);
  canvas.hasPointerCapture = (id) => held.has(id);
  canvas.releasePointerCapture = (id) => held.delete(id);
  const start = performance.now(),
    brush = document.querySelector("#brush");
  try {
    for (let stroke = 0; stroke < 20; stroke++) {
      brush.value = String(stroke % 3);
      brush.dispatchEvent(new Event("change", { bubbles: true }));
      for (let i = 0; i <= 500; i++) {
        const end = i === 500,
          point = Math.min(i, 499);
        canvas.dispatchEvent(
          new PointerEvent(end ? "pointerup" : i === 0 ? "pointerdown" : "pointermove", {
            bubbles: true,
            cancelable: true,
            pointerId: 2,
            pointerType: "pen",
            isPrimary: true,
            button: end || i === 0 ? 0 : -1,
            buttons: end ? 0 : 1,
            pressure: 0.7,
            clientX: rect.left + 120 + (point % 100) * 4.6,
            clientY: rect.top + 120 + stroke * 14 + (point % 2) * 5 + Math.floor(point / 100) * 0.5,
          }),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    brush.value = "0";
    brush.dispatchEvent(new Event("change", { bubbles: true }));
    while (lab.renderPending()) await new Promise((resolve) => requestAnimationFrame(resolve));
    await lab.saving.flush(true);
    return {
      seedMs: performance.now() - start,
      strokeCount: lab.core.count(),
      samples: Array.from({ length: lab.core.count() }, (_, id) => lab.core.raw_length(id)).reduce(
        (a, b) => a + b,
        0,
      ),
    };
  } finally {
    [canvas.setPointerCapture, canvas.hasPointerCapture, canvas.releasePointerCapture] = originals;
  }
}
export async function exportSameDocument() {
  const core = lab.core,
    preparation = [],
    geometry = [];
  window.svgSealed = false;
  const measure = (times, fn) => {
    const at = performance.now(),
      v = fn();
    times.push(performance.now() - at);
    return v;
  };
  const facade = {
    ...core,
    svg_prepare(token) {
      return measure(preparation, () => {
        const state = core.svg_prepare(token);
        if (state === 2) window.svgSealed = true;
        return state;
      });
    },
    svg_next(token, tolerance) {
      return measure(geometry, () => core.svg_next(token, tolerance));
    },
  };
  const start = performance.now(),
    revision = String(core.delta_revision());
  const snapshot = await svgProbe.capture(facade, 0.05),
    captured = performance.now();
  const [x, y, right, bottom] = snapshot.bounds;
  const result = await svgProbe.job(
    snapshot.groups,
    { x: x - 16, y: y - 16, width: right - x + 32, height: bottom - y + 32, density: 2 },
    "whole",
  );
  const ended = performance.now();
  return {
    revision,
    snapshotRevision: snapshot.revision,
    absoluteStart: performance.timeOrigin + start,
    absoluteJob: performance.timeOrigin + captured,
    absoluteEnd: performance.timeOrigin + ended,
    captureMs: captured - start,
    jobRoundtripMs: ended - captured,
    workerMs: result.milliseconds,
    totalMs: ended - start,
    preparationCalls: preparation,
    geometryCalls: geometry,
    svgBytes: new TextEncoder().encode(result.svg).length,
    pngBytes: result.encoded,
    rasterPixels: result.pixels,
    packets: snapshot.packets,
    derivedBytes: snapshot.derivedBytes,
    retainedLogicalBytes: snapshot.retainedBytes,
    capsules: snapshot.groups.reduce((n, g) => n + g.bytes.byteLength / 32, 0),
    wasmMemory: core.memory.buffer.byteLength,
  };
}

export function visibleBase() {
  const c = lab.core;
  return JSON.stringify(
    Array.from({ length: c.count() }, (_, id) => id)
      .filter((id) => c.visible(id))
      .map((id) => [
        id,
        c.raw_length(id),
        c.color(id),
        c.opacity(id),
        c.brush(id),
        c.stroke_width(id),
      ]),
  );
}
