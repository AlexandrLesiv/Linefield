import { reducedMotion } from "./dom.ts";

const activeVisuals = new WeakMap<HTMLElement, { box: HTMLElement; finish: () => void }>();
export function deleteVisual(target: HTMLElement) {
  return activeVisuals.get(target);
}

/** The accepted deletion is already committed; this surface only explains its Undo target. */
export function morphDeleteMenu(
  box: HTMLElement,
  content: HTMLElement,
  source: DOMRect,
  target: HTMLElement | void,
  done: () => void,
): () => void {
  const sourceStyle = getComputedStyle(box);
  const background = sourceStyle.backgroundColor;
  const radius = sourceStyle.borderRadius;
  const contentOpacity = getComputedStyle(content).opacity;
  box.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  box.inert = true;
  box.setAttribute("aria-hidden", "true");
  box.style.pointerEvents = "none";
  // A focused menu item can leave the clipped shell scrolled by a few pixels.
  // The motion surface must not be a scroll container while its bounds shrink.
  box.style.overflow = "clip";
  box.scrollTop = 0;
  box.scrollLeft = 0;
  if (!target?.isConnected || reducedMotion()) {
    done();
    return () => {};
  }
  const destination = target.getBoundingClientRect();
  const style = getComputedStyle(target);
  const clone = target.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    done();
    return () => {};
  }
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const animations: Animation[] = [];
  let finished = false;
  const observer = new MutationObserver(() => {
    if (!target.isConnected) finish();
  });
  const finish = () => {
    if (finished) return;
    finished = true;
    activeVisuals.delete(target);
    controller.abort();
    observer.disconnect();
    animations.forEach((animation) => animation.cancel());
    done();
  };
  Object.assign(content.style, { width: `${source.width}px`, height: `${source.height}px` });
  Object.assign(clone.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    margin: "0",
    background: "transparent",
    border: "0",
    boxShadow: "none",
    pointerEvents: "none",
    color: style.color,
    font: style.font,
    padding: style.padding,
    minHeight: style.minHeight,
    minWidth: style.minWidth,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  });
  clone.inert = true;
  clone.removeAttribute("id");
  box.append(clone);
  const frame = (bounds: DOMRect, color: string, borderRadius: string): Keyframe => ({
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    backgroundColor: color,
    borderRadius,
  });
  const shell = box.animate(
    [
      {
        ...frame(source, background, radius),
        borderWidth: sourceStyle.borderWidth,
        boxShadow: sourceStyle.boxShadow,
        easing: "cubic-bezier(.2,.75,.25,1)",
      },
      {
        ...frame(destination, style.backgroundColor, style.borderRadius),
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        offset: 0.8,
      },
      {
        ...frame(destination, style.backgroundColor, style.borderRadius),
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
      },
    ],
    { duration: 300, fill: "both" },
  );
  animations.push(shell);
  animations.push(
    content.animate([{ opacity: contentOpacity }, { opacity: 0 }], {
      duration: 110,
      fill: "both",
    }),
  );
  animations.push(
    clone.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }],
      {
        duration: 300,
        fill: "both",
      },
    ),
  );
  // One opaque label/surface owner until an exact-geometry atomic handoff.
  // Opacity never affects the live target's hit testing or keyboard focus.
  animations.push(
    target.animate([{ opacity: 0 }, { opacity: 0 }], {
      duration: 300,
      fill: "both",
    }),
  );
  activeVisuals.set(target, { box, finish });
  void shell.finished.then(finish, finish);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", finish, options);
  window.addEventListener("scroll", finish, { ...options, capture: true });
  window.visualViewport?.addEventListener("resize", finish, options);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
  return finish;
}
