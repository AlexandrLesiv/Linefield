import { reducedMotion } from "./dom.ts";

/** Freeze current presentation before cancelling an interrupted opening morph. */
export function exitRename(
  dialog: HTMLDialogElement,
  form: HTMLElement,
  trigger: HTMLElement | null,
  disposeOpening: () => void,
  done: () => void,
): void {
  const current = dialog.getBoundingClientRect();
  const content = form.getBoundingClientRect();
  const opacity = getComputedStyle(form).opacity;
  const radius = getComputedStyle(dialog).borderRadius;
  disposeOpening();
  if (reducedMotion()) {
    done();
    return;
  }
  const anchor = trigger?.getBoundingClientRect();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let finished = false;
  const animations: Animation[] = [];
  const finish = () => {
    if (finished) return;
    finished = true;
    controller.abort();
    const transition = trigger?.style.transition ?? "";
    if (trigger) trigger.style.transition = "none";
    animations.forEach((animation) => animation.cancel());
    if (trigger) trigger.style.visibility = "";
    done();
    if (trigger) {
      // Resolve focused visibility before restoring hover transitions.
      void getComputedStyle(trigger).opacity;
      trigger.style.transition = transition;
    }
  };
  Object.assign(dialog.style, {
    padding: "0",
    minWidth: "0",
    minHeight: "0",
    maxHeight: "none",
    overflow: "hidden",
    pointerEvents: "none",
  });
  Object.assign(form.style, {
    position: "absolute",
    left: `${content.left - current.left}px`,
    top: `${content.top - current.top}px`,
    width: `${content.width}px`,
    height: `${content.height}px`,
    margin: "0",
  });
  dialog.inert = true;
  dialog.dataset.closing = "true";
  if (trigger) {
    animations.push(
      trigger.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.72 }, { opacity: 1 }], {
        duration: 260,
        fill: "both",
      }),
    );
  }
  const frame = (rect: DOMRect, borderRadius: string, alpha: number): Keyframe => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius,
    opacity: alpha,
  });
  const target = anchor ?? current;
  const targetRadius = trigger ? getComputedStyle(trigger).borderRadius : radius;
  const shell = dialog.animate(
    [
      { ...frame(current, radius, 1), easing: "ease" },
      { ...frame(target, targetRadius, 0.2), offset: 0.85 },
      frame(target, targetRadius, 0),
    ],
    { duration: 260, fill: "both" },
  );
  animations.push(
    shell,
    form.animate([{ opacity }, { opacity: 0 }], {
      duration: 140,
      fill: "both",
    }),
  );
  void shell.finished.then(finish, finish);
  window.addEventListener("resize", finish, options);
  window.visualViewport?.addEventListener("resize", finish, options);
  window.visualViewport?.addEventListener("scroll", finish, options);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
}
