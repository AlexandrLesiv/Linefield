const duration = 260;
const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.dataset.motion === "reduced";

function frame(rect: DOMRect): Keyframe {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

export function placeMenu(
  box: HTMLElement,
  content: HTMLElement,
  origin: HTMLElement,
  point?: { x: number; y: number },
): DOMRect {
  const anchor = point ? new DOMRect(point.x, point.y, 0, 0) : origin.getBoundingClientRect();
  const width = Math.min(224, Math.max(0, innerWidth - 16));
  box.style.width = `${width}px`;
  content.style.width = `${width}px`;
  const height = Math.min(content.scrollHeight, Math.max(0, innerHeight - 16));
  const right = point ? point.x + width > innerWidth - 8 : anchor.right >= width + 8;
  const up = anchor.top + height > innerHeight - 8;
  const left = Math.max(
    8,
    Math.min(innerWidth - width - 8, right ? anchor.right - width : anchor.left),
  );
  const top = Math.max(
    8,
    Math.min(innerHeight - height - 8, up ? anchor.bottom - height : anchor.top),
  );
  Object.assign(box.style, { left: `${left}px`, top: `${top}px`, height: `${height}px` });
  Object.assign(content.style, {
    position: "absolute",
    height: `${height}px`,
    [right ? "right" : "left"]: "0px",
    [up ? "bottom" : "top"]: "0px",
  });
  return anchor;
}

export function openMotion(
  box: HTMLElement,
  content: HTMLElement,
  anchor: DOMRect,
  contextual: boolean,
): void {
  if (reduced()) return;
  box.animate(
    contextual
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [frame(anchor), frame(box.getBoundingClientRect())],
    {
      duration,
      easing: "cubic-bezier(.2,.75,.25,1)",
    },
  );
  content.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration,
    easing: "ease-out",
  });
}

export function closeMotion(
  box: HTMLElement,
  content: HTMLElement,
  anchor: DOMRect | null,
  reveal: () => void,
  done: () => void,
): () => void {
  const current = box.getBoundingClientRect();
  box.getAnimations().forEach((animation) => animation.cancel());
  content.getAnimations().forEach((animation) => animation.cancel());
  if (reduced()) {
    reveal();
    done();
    return () => {};
  }
  const timer = window.setTimeout(reveal, anchor ? duration * 0.72 : 0);
  content.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: duration * 0.72,
    fill: "forwards",
  });
  const frames = anchor
    ? [
        { ...frame(current), opacity: 1, easing: "ease" },
        { ...frame(anchor), opacity: 1, offset: 0.72, easing: "ease-out" },
        { ...frame(anchor), opacity: 0 },
      ]
    : [{ opacity: 1 }, { opacity: 0 }];
  const animation = box.animate(frames, { duration, easing: "linear", fill: "forwards" });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    reveal();
    done();
  };
  void animation.finished.then(finish, finish);
  return () => {
    animation.cancel();
    finish();
  };
}
