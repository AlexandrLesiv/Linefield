import { reducedMotion } from "./dom.ts";
import { placeRename } from "./rename-placement.ts";

/** Resize a single anchored surface; never scale form text or discard its final position. */
export function morphRename(
  dialog: HTMLDialogElement,
  form: HTMLElement,
  source: DOMRect,
): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let shell: Animation | undefined;
  let content: Animation | undefined;
  let disposed = false;
  const settle = () => {
    shell?.cancel();
    content?.cancel();
    shell = undefined;
    content = undefined;
    form.style.width = "";
    dialog.style.height = "auto";
    dialog.style.overflow = "auto";
  };
  const reposition = () => {
    if (disposed) return;
    settle();
    placeRename(dialog, source);
  };
  const target = placeRename(dialog, source);
  if (!reducedMotion()) {
    form.style.width = `${form.getBoundingClientRect().width}px`;
    dialog.style.height = `${target.height}px`;
    dialog.style.overflow = "hidden";
    const frame = (rect: DOMRect, borderRadius: string): Keyframe => ({
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius,
    });
    shell = dialog.animate(
      [frame(source, "8px"), frame(target, getComputedStyle(dialog).borderRadius)],
      { duration: 280, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" },
    );
    content = form.animate(
      [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1 }],
      { duration: 280, fill: "both" },
    );
    // Cancellation is handled synchronously by reposition/dispose, without stale cleanup.
    void shell.finished.then(reposition, () => {});
  }
  window.addEventListener("resize", reposition, options);
  window.visualViewport?.addEventListener("resize", reposition, options);
  window.visualViewport?.addEventListener("scroll", reposition, options);
  const observer = new MutationObserver(reposition);
  observer.observe(form, { subtree: true, childList: true, characterData: true });
  return () => {
    disposed = true;
    controller.abort();
    observer.disconnect();
    settle();
  };
}
