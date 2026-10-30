export function replay(scenario) {
  const canvas = document.querySelector("canvas"),
    rect = canvas.getBoundingClientRect();
  const captured = new Set();
  canvas.setPointerCapture = (id) => captured.add(id);
  canvas.hasPointerCapture = (id) => captured.has(id);
  canvas.releasePointerCapture = (id) => captured.delete(id);
  let time = performance.now();
  const event = (kind, id, x, extra = {}) => {
    const value = new PointerEvent(kind, {
      bubbles: true,
      pointerType: "pen",
      pointerId: id,
      isPrimary: true,
      button: kind === "pointerdown" || kind === "pointerup" ? 0 : -1,
      buttons: kind === "pointerup" ? 0 : 1,
      pressure: 0.6,
      clientX: rect.left + x,
      clientY: rect.top + 200,
      ...extra,
    });
    Object.defineProperty(value, "timeStamp", { value: ++time, configurable: true });
    return value;
  };
  const send = (kind, id, x, extra = {}, target = canvas) =>
    target.dispatchEvent(event(kind, id, x, extra));
  const raw = (id) =>
    Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
      String(lab.core.raw_region(id, i, 0)),
      lab.core.raw_local(id, i, 0),
      String(lab.core.raw_region(id, i, 1)),
      lab.core.raw_local(id, i, 1),
      lab.core.raw_point(id, i, 2),
    ]);
  send("pointerdown", 528, 100);
  for (let i = 1; i < 528; i++) send("pointermove", 528, 100 + i / 2);
  const before = raw(0),
    initial = lab.inputDiagnostics();
  send("pointerdown", 1, 900, { pointerType: "mouse" });
  send("pointermove", 1, 910, { pointerType: "mouse" });
  send("pointerup", 1, 910, { pointerType: "mouse", pressure: 0 });
  const afterMouse = raw(0),
    mouseState = lab.inputDiagnostics();
  if (["pending-owner", "new-pen"].includes(scenario)) {
    captured.delete(528);
    send("lostpointercapture", 528, 0, { buttons: 0, pressure: 0 });
  }
  const pending = lab.inputDiagnostics(),
    beforeMissing = raw(0);
  // No pen positions are delivered here: foreign delivery must not invent samples.
  for (let i = 0; i < 10; i++)
    send(
      "pointermove",
      1,
      920 + i,
      { pointerType: "mouse", buttons: 0, pressure: 0 },
      document.body,
    );
  const afterMissing = raw(0),
    missingState = lab.inputDiagnostics();
  if (["cancel", "pressed-loss", "blur", "hidden"].includes(scenario)) {
    if (scenario === "cancel") send("pointercancel", 528, 0, {}, document.body);
    if (scenario === "pressed-loss") {
      captured.delete(528);
      send("lostpointercapture", 528, 0, { buttons: 1 });
    }
    if (scenario === "blur") window.dispatchEvent(new Event("blur"));
    if (scenario === "hidden") {
      globalThis.originalAnimationFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = () => 0;
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }
    send("pointerup", 528, 0);
  } else if (scenario === "new-pen") {
    send("pointerdown", 529, 400);
    send("pointermove", 529, 410);
    send("pointerup", 529, 410);
  } else {
    const samples = [
      event("pointermove", 528, 365),
      event("pointermove", 528, 366, { buttons: 3 }),
    ];
    const move = event("pointermove", 528, 366);
    Object.defineProperty(move, "getCoalescedEvents", { value: () => samples });
    canvas.dispatchEvent(move);
    const staleUp = event("pointerup", 528, 999);
    Object.defineProperty(staleUp, "timeStamp", { value: move.timeStamp - 1 });
    canvas.dispatchEvent(staleUp);
    send("pointermove", 528, 367, {}, document.body);
    send("pointerup", 528, 367, {}, document.body);
  }
  return {
    before,
    afterMouse,
    initial,
    mouseState,
    pending,
    beforeMissing,
    afterMissing,
    missingState,
    raw: Array.from({ length: lab.core.count() }, (_, id) => raw(id)),
    log: lab.inputDiagnostics(),
  };
}
