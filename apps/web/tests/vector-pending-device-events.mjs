export function install(source) {
  const canvas = document.querySelector("canvas"),
    rect = canvas.getBoundingClientRect(),
    captured = new Set();
  let time = performance.now();
  canvas.setPointerCapture = (id) => captured.add(id);
  canvas.hasPointerCapture = (id) => captured.has(id);
  canvas.releasePointerCapture = (id) => captured.delete(id);
  const send = (kind, id, x, extra = {}, outside = false, stale = false) => {
    const event = new PointerEvent(kind, {
      bubbles: true,
      pointerId: id,
      pointerType: source,
      isPrimary: true,
      buttons: kind === "pointerup" ? 0 : 1,
      button: kind === "pointerdown" || kind === "pointerup" ? 0 : -1,
      pressure: 0.5,
      clientX: rect.left + x,
      clientY: rect.top + 200,
      ...extra,
    });
    Object.defineProperty(event, "timeStamp", { value: stale ? 1 : ++time });
    (outside ? document.body : canvas).dispatchEvent(event);
  };
  const raw = (id) =>
    Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
      String(lab.core.raw_region(id, i, 0)),
      lab.core.raw_local(id, i, 0),
      String(lab.core.raw_region(id, i, 1)),
      lab.core.raw_local(id, i, 1),
      lab.core.raw_point(id, i, 2),
    ]);
  globalThis.testPending = {
    send,
    raw,
    captured,
    source,
    foreign: source === "pen" ? "mouse" : "pen",
  };
  send("pointerdown", 10, 100);
  send("pointermove", 10, 110);
  send("pointerup", 10, 110);
}
export function pending() {
  const { send, raw, foreign } = testPending;
  send("pointerdown", 20, 200);
  for (let i = 1; i <= 20; i++) send("pointermove", 20, 200 + i);
  const before = raw(1);
  send("pointerdown", 30, 700, { pointerType: foreign });
  send("pointermove", 30, 710, { pointerType: foreign });
  send("pointerup", 30, 710, { pointerType: foreign });
  const active = lab.inputDiagnostics();
  testPending.captured.delete(20);
  send("lostpointercapture", 20, 220, { buttons: 0 });
  testPending.captured.add(20);
  // A pending flag alone is insufficient: capture must actually be gone.
  send("pointerdown", 30, 700, { pointerType: foreign });
  const held = lab.inputDiagnostics();
  testPending.captured.delete(20);
  for (const [kind, extra, outside, stale] of [
    ["pointermove", {}, false, false],
    ["pointerup", {}, false, false],
    ["pointerdown", { isPrimary: false }, false, false],
    ["pointerdown", {}, true, false],
    ["pointerdown", {}, false, true],
    ["pointerdown", { button: 2, buttons: 2 }, false, false],
  ])
    send(kind, 30, 700, { pointerType: foreign, ...extra }, outside, stale);
  return { before, after: raw(1), active, held, rejected: lab.inputDiagnostics() };
}
export function recover(failCapture) {
  const { send, raw, foreign } = testPending;
  let captureFailure = null;
  if (failCapture) {
    const canvas = document.querySelector("canvas"),
      original = canvas.setPointerCapture;
    canvas.setPointerCapture = () => {
      throw new DOMException("injected capture failure", "NotFoundError");
    };
    send("pointerdown", 30, 400, { pointerType: foreign });
    captureFailure = lab.inputDiagnostics();
    canvas.setPointerCapture = original;
  }
  send("pointerdown", 30, 400, { pointerType: foreign });
  const recovered = lab.inputDiagnostics(),
    old = raw(1);
  send("pointermove", 30, 410, { pointerType: foreign });
  send("pointerup", 20, 999);
  send("pointercancel", 20, 999);
  send("lostpointercapture", 20, 999, { buttons: 0 });
  const late = lab.inputDiagnostics();
  send("pointermove", 30, 420, { pointerType: foreign });
  send("pointerup", 30, 420, { pointerType: foreign });
  send("pointerup", 30, 420, { pointerType: foreign });
  return { old, recovered, late, captureFailure, newRaw: raw(2), log: lab.inputDiagnostics() };
}
