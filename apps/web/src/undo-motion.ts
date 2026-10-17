import { revealRestoredArtwork } from "./restored-artwork.ts";
import { reducedMotion } from "./dom.ts";
import { deleteVisual } from "./delete-menu-motion.ts";

/** Small disposable presentation snapshot, including the current interrupted menu appearance. */
function snapshot(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  originals.forEach((node, index) => {
    const copy = copies[index];
    if (!copy) return;
    const style = getComputedStyle(node);
    for (const property of style)
      copy.style.setProperty(property, style.getPropertyValue(property));
    copy.removeAttribute("id");
    copy.removeAttribute("role");
    copy.removeAttribute("class");
    copy.style.pointerEvents = "none";
    copy.style.transition = "none";
    copy.style.animation = "none";
  });
  clone.inert = true;
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

/** Capture before restoration; start presentation only after synchronous render/focus. */
export function prepareUndoMotion(
  source: HTMLElement | null,
): (target: HTMLElement | null) => void {
  if (!source || reducedMotion()) return () => {};
  const removal = source.closest<HTMLElement>(".removal");
  const previousPaper = getComputedStyle(removal ?? source).backgroundColor;
  const pending = deleteVisual(source);
  const visual = pending?.box ?? source;
  const bounds = visual.getBoundingClientRect();
  const style = getComputedStyle(visual);
  const initial = {
    background: style.backgroundColor,
    radius: style.borderRadius,
    border: style.borderWidth,
    shadow: style.boxShadow,
  };
  const content = snapshot(visual);
  pending?.finish();
  let started = false;
  return (target) => {
    if (started || !target?.isConnected || reducedMotion()) return;
    started = true;
    const finishArtwork = revealRestoredArtwork(target, previousPaper);
    if (!target.matches(".more")) return;
    const destination = target.getBoundingClientRect();
    const final = getComputedStyle(target);
    const shell = document.createElement("div");
    shell.dataset.undoMotion = "true";
    shell.inert = true;
    shell.setAttribute("aria-hidden", "true");
    Object.assign(shell.style, {
      position: "fixed",
      zIndex: "1000",
      pointerEvents: "none",
      overflow: "clip",
      boxSizing: "border-box",
      borderStyle: "solid",
      borderColor: final.borderColor,
      outlineStyle: final.outlineStyle,
      outlineColor: final.outlineColor,
      outlineOffset: final.outlineOffset,
    });
    Object.assign(content.style, {
      position: "absolute",
      left: "0",
      top: "0",
      margin: "0",
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      borderColor: "transparent",
      background: "transparent",
      boxShadow: "none",
      opacity: "1",
    });
    const end = snapshot(target);
    Object.assign(end.style, {
      position: "absolute",
      inset: "0",
      margin: "0",
      width: "100%",
      height: "100%",
      minWidth: "0",
      minHeight: "0",
      background: "transparent",
      border: "0",
      boxShadow: "none",
      outline: "none",
      opacity: "1",
    });
    shell.append(content, end);
    document.body.append(shell);
    const animations: Animation[] = [];
    const controller = new AbortController();
    const options = { signal: controller.signal };
    let finished = false;
    const observer = new MutationObserver(() => {
      if (!target.isConnected) finish();
    });
    const finish = () => {
      if (finished) return;
      finished = true;
      finishArtwork();
      controller.abort();
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      shell.remove();
    };
    const frame = (
      rect: DOMRect,
      background: string,
      radius: string,
      border: string,
      shadow: string,
    ): Keyframe => ({
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      backgroundColor: background,
      borderRadius: radius,
      borderWidth: border,
      boxShadow: shadow,
    });
    const targetFrame = frame(
      destination,
      final.backgroundColor,
      final.borderRadius,
      final.borderWidth,
      final.boxShadow,
    );
    targetFrame.outlineWidth = final.outlineWidth;
    const motion = shell.animate(
      [
        {
          ...frame(bounds, initial.background, initial.radius, initial.border, initial.shadow),
          easing: "cubic-bezier(.2,.75,.25,1)",
          outlineWidth: "0px",
        },
        { ...targetFrame, offset: 0.8 },
        targetFrame,
      ],
      { duration: 300, fill: "both" },
    );
    animations.push(
      motion,
      content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "both" }),
    );
    animations.push(
      end.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }],
        { duration: 300, fill: "both" },
      ),
    );
    animations.push(
      target.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 300, fill: "both" }),
    );
    void motion.finished.then(finish, finish);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", finish, { ...options, capture: true });
    document.addEventListener("keydown", finish, { ...options, capture: true });
    window.addEventListener("resize", finish, options);
    window.addEventListener("scroll", finish, { ...options, capture: true });
    window.visualViewport?.addEventListener("resize", finish, options);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", finish, options);
    matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
  };
}
