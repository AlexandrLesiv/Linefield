import { reducedMotion } from "./dom.ts";
import { placeRename } from "./rename-placement.ts";
export function fadeMobileRename(dialog: HTMLDialogElement, source: DOMRect): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const position = () => placeRename(dialog, source);
  position();
  const animation = reducedMotion()
    ? null
    : dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 150,
        easing: "ease-out",
      });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    () => animation?.cancel(),
    options,
  );
  window.addEventListener("resize", position, options);
  window.visualViewport?.addEventListener("resize", position, options);
  window.visualViewport?.addEventListener("scroll", position, options);
  const observer = new MutationObserver(position);
  observer.observe(dialog, { subtree: true, childList: true, characterData: true });
  return () => {
    controller.abort();
    observer.disconnect();
    animation?.cancel();
  };
}
export function closeMobileRename(
  dialog: HTMLDialogElement,
  dispose: () => void,
  done: () => void,
) {
  const opacity = getComputedStyle(dialog).opacity;
  dispose();
  if (reducedMotion()) {
    done();
    return;
  }
  dialog.inert = true;
  const animation = dialog.animate([{ opacity }, { opacity: 0 }], { duration: 130, fill: "both" });
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    controller.abort();
    animation.cancel();
    done();
  };
  window.addEventListener("resize", finish, options);
  window.visualViewport?.addEventListener("resize", finish, options);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
  void animation.finished.then(finish, finish);
}
