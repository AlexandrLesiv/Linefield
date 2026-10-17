/** Follow horizontal intent without consuming native vertical scrolling. */
export function attachSwipeDrag(
  open: HTMLElement,
  offset: () => number,
  move: (value: number) => void,
  settle: (reveal: boolean) => void,
  signal: AbortSignal,
): void {
  const options = { signal };
  let start: { x: number; y: number; id: number; offset: number } | null = null;
  let direction: "pending" | "horizontal" | "vertical" = "pending";
  let dragged = false;
  let latest = 0;
  const cancel = (event: PointerEvent) => {
    if (!start || start.id !== event.pointerId) return;
    settle(start.offset < -80);
    start = null;
    direction = "pending";
  };
  open.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || start) return;
      start = { x: event.clientX, y: event.clientY, id: event.pointerId, offset: offset() };
      direction = "pending";
      dragged = false;
    },
    options,
  );
  open.addEventListener(
    "pointermove",
    (event) => {
      if (!start || start.id !== event.pointerId || direction === "vertical") return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (direction === "pending") {
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
          direction = "vertical";
          dragged = true;
          return;
        }
        if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
        direction = "horizontal";
        dragged = true;
        open.setPointerCapture(event.pointerId);
      }
      latest = Math.max(-160, Math.min(0, start.offset + dx));
      move(latest);
      event.preventDefault();
    },
    options,
  );
  open.addEventListener(
    "pointerup",
    (event) => {
      if (!start || event.pointerId !== start.id) return;
      const id = start.id;
      if (direction === "horizontal")
        settle(start.offset < -80 && event.clientX - start.x > 40 ? false : latest < -80);
      else settle(start.offset < -80);
      start = null;
      direction = "pending";
      if (open.hasPointerCapture(id)) open.releasePointerCapture(id);
    },
    options,
  );
  const resized = () => {
    if (!start) return;
    const id = start.id;
    settle(start.offset < -80);
    start = null;
    direction = "pending";
    dragged = true;
    if (open.hasPointerCapture(id)) open.releasePointerCapture(id);
  };
  window.addEventListener("resize", resized, options);
  window.visualViewport?.addEventListener("resize", resized, options);
  signal.addEventListener(
    "abort",
    () => {
      const id = start?.id;
      start = null;
      if (id !== undefined && open.hasPointerCapture(id)) open.releasePointerCapture(id);
    },
    { once: true },
  );
  open.addEventListener("pointercancel", cancel, options);
  open.addEventListener(
    "lostpointercapture",
    (event) => {
      if (event.target === open) cancel(event);
    },
    options,
  );
  open.addEventListener(
    "click",
    (event) => {
      if (dragged && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      dragged = false;
    },
    { ...options, capture: true },
  );
}
