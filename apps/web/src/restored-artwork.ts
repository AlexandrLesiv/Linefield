import { reducedMotion } from "./dom.ts";

/** Reveal restored content without delaying its semantics or pointer/keyboard availability. */
export function revealRestoredArtwork(target: HTMLElement, previousPaper: string): () => void {
  const tile = target.closest(".drawing-card")?.querySelector<HTMLElement>(".drawing-tile");
  if (!tile || reducedMotion()) return () => {};
  const motions = [...tile.querySelectorAll<HTMLElement>(".artwork, .drawing-name")].map(
    (content) =>
      content.animate(
        [
          { opacity: 0, backgroundColor: previousPaper },
          { opacity: 1, backgroundColor: getComputedStyle(tile).backgroundColor },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(.4,0,.2,1)",
          fill: "both",
        },
      ),
  );
  motions.push(
    tile.animate(
      [
        { backgroundColor: previousPaper },
        { backgroundColor: getComputedStyle(tile).backgroundColor },
      ],
      { duration: 300, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" },
    ),
  );
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const observer = new MutationObserver(() => {
    if (!tile.isConnected) finish();
  });
  const finish = () => {
    controller.abort();
    observer.disconnect();
    motions.forEach((motion) => motion.cancel());
  };
  void Promise.all(motions.map((motion) => motion.finished)).then(finish, finish);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("pointerdown", finish, { ...options, capture: true });
  document.addEventListener("keydown", finish, { ...options, capture: true });
  window.addEventListener("resize", finish, options);
  window.addEventListener("scroll", finish, { ...options, capture: true });
  window.visualViewport?.addEventListener("resize", finish, options);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", finish, options);
  return finish;
}
