export function drawing(engine, completed = () => {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d"),
    trace = [];
  let active = false,
    blocked = false,
    stroke,
    pointerId,
    accepted = 0,
    waiters = [];
  canvas.addEventListener("pointerdown", (event) => {
    if (blocked || active) return;
    active = true;
    pointerId = event.pointerId;
    if (event.isTrusted) canvas.setPointerCapture(event.pointerId);
    stroke = engine.begin(3, 0);
    ctx.beginPath();
    ctx.moveTo(event.offsetX, event.offsetY);
    push(event);
  });
  function push(event) {
    if (!active || event.pointerId !== pointerId) return;
    engine.push_precise(event.offsetX, event.offsetY, event.pressure);
    accepted++;
    trace.push({ type: event.pointerType, kind: event.type, x: event.offsetX, y: event.offsetY });
    ctx.lineTo(event.offsetX, event.offsetY);
    ctx.stroke();
  }
  canvas.addEventListener("pointermove", push);
  const release = (event) => {
    if (!active || event.pointerId !== pointerId) return;
    push(event);
    engine.commit();
    completed();
    active = false;
    for (const resolve of waiters) resolve();
    waiters = [];
  };
  canvas.addEventListener("pointerup", release);
  addEventListener("pointerup", release);
  const cancel = (event) => {
    if (!active || event.pointerId !== pointerId) return;
    engine.cancel();
    active = false;
    for (const resolve of waiters) resolve();
    waiters = [];
  };
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", cancel);
  return {
    canvas,
    trace,
    active: () => active,
    blockNew(value) {
      blocked = value;
    },
    finishActive: () =>
      active ? new Promise((resolve) => waiters.push(resolve)) : Promise.resolve(),
    get accepted() {
      return accepted;
    },
    get stroke() {
      return stroke;
    },
    dispose() {
      removeEventListener("pointerup", release);
      canvas.remove();
    },
  };
}
export function pointer(input, kind, index = 0, type = "mouse") {
  input.canvas.dispatchEvent(
    new PointerEvent(kind, {
      bubbles: true,
      pointerId: 1,
      pointerType: type,
      clientX: 10 + (index % 700),
      clientY: 20 + (index % 400),
      pressure: type === "pen" ? 0.6 : 0.5,
      buttons: kind === "pointerup" ? 0 : 1,
    }),
  );
}
export function continuous(input, count = 80) {
  const delays = [],
    samplesBefore = input.accepted;
  return new Promise((resolve) => {
    let i = 0,
      expected = performance.now() + 4;
    const timer = setInterval(() => {
      delays.push(Math.max(0, performance.now() - expected));
      expected = performance.now() + 4;
      const type = i % 2 ? "pen" : "mouse";
      for (const kind of ["pointerdown", "pointermove", "pointerup"]) pointer(input, kind, i, type);
      if (++i === count) {
        clearInterval(timer);
        resolve({ delays, accepted: input.accepted - samplesBefore, expected: count * 3 });
      }
    }, 4);
  });
}
