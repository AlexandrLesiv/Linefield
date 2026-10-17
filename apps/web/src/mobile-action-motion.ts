import { reducedMotion } from "./dom.ts";
const deletedLayers = new WeakMap<HTMLElement, HTMLElement>();
const active = new WeakMap<HTMLElement, { visual: HTMLElement; finish: () => void }>();

function visualTile(tile: HTMLElement): HTMLElement {
  const ghost = tile.cloneNode(true) as HTMLElement;
  ghost.inert = true;
  ghost.setAttribute("aria-hidden", "true");
  ghost.dataset.mobileSlide = "true";
  Object.assign(ghost.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    visibility: "visible",
    pointerEvents: "none",
    transition: "none",
    zIndex: "3",
    borderRadius: "inherit",
    margin: "0",
  });
  return ghost;
}

function slide(
  card: HTMLElement,
  visual: HTMLElement,
  from: number,
  to: number,
  done: () => void,
  cancelOnInput = false,
) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let finished = false;
  const overflow = card.style.overflow;
  card.style.overflow = "clip";
  card.append(visual);
  const motion = visual.animate(
    [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
    { duration: 320, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" },
  );
  const observer = new MutationObserver(() => {
    if (!card.isConnected) finish();
  });
  const finish = () => {
    if (finished) return;
    finished = true;
    active.delete(card);
    controller.abort();
    observer.disconnect();
    visual.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    visual.remove();
    card.style.overflow = overflow;
    done();
  };
  active.set(card, { visual, finish });
  void motion.finished.then(finish, finish);
  observer.observe(document.body, { childList: true, subtree: true });
  if (cancelOnInput) {
    document.addEventListener("pointerdown", finish, { ...options, capture: true });
    document.addEventListener("keydown", finish, { ...options, capture: true });
  }
  window.visualViewport?.addEventListener("resize", finish, options);
  window.addEventListener("resize", finish, options);
  window.addEventListener("scroll", finish, { ...options, capture: true });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", finish, options);
}

export function prepareMobileDelete(
  card: HTMLElement | null,
): (target: HTMLElement | null) => void {
  const tile = card?.querySelector<HTMLElement>(".drawing-tile");
  if (!card || !tile || reducedMotion()) return () => {};
  // Preserve the complete currently visible swipe layer, including its action rail.
  const ghost = visualTile(card);
  ghost.removeAttribute("data-id");
  const artwork = ghost.querySelector<HTMLElement>(".drawing-tile");
  const rail = ghost.querySelector<HTMLElement>(".swipe-actions");
  if (artwork)
    Object.assign(artwork.style, {
      transform: getComputedStyle(tile).transform,
      transition: "none",
      visibility: "visible",
    });
  const sourceRail = card.querySelector<HTMLElement>(".swipe-actions");
  if (rail && sourceRail) {
    rail.style.opacity = getComputedStyle(sourceRail).opacity;
    rail.style.transition = "none";
  }
  return (target) => {
    if (target?.isConnected && !reducedMotion()) {
      deletedLayers.set(target, visualTile(ghost));
      slide(target, ghost, 0, -target.getBoundingClientRect().width, () => {});
    }
  };
}

export function prepareMobileUndo(card: HTMLElement | null): (target: HTMLElement | null) => void {
  if (!card || reducedMotion()) return () => {};
  const pending = active.get(card);
  const offset = pending
    ? pending.visual.getBoundingClientRect().left - card.getBoundingClientRect().left
    : -card.getBoundingClientRect().width;
  const saved = pending?.visual ?? deletedLayers.get(card);
  const returning = saved ? visualTile(saved) : null;
  deletedLayers.delete(card);
  const returningArtwork = returning?.querySelector<HTMLElement>(".drawing-tile");
  const currentArtwork = saved?.querySelector<HTMLElement>(".drawing-tile");
  const artworkTransform = currentArtwork
    ? pending
      ? getComputedStyle(currentArtwork).transform
      : currentArtwork.style.transform
    : "translateX(-160px)";
  const removal = card.querySelector<HTMLElement>(".removal")?.cloneNode(true);
  pending?.finish();
  return (target) => {
    const tile = target?.querySelector<HTMLElement>(".drawing-tile");
    if (!target?.isConnected || !tile || reducedMotion()) return;
    const ghost = returning ?? visualTile(target);
    ghost.removeAttribute("data-id");
    const artwork = returningArtwork ?? ghost.querySelector<HTMLElement>(".drawing-tile");
    const rail = ghost.querySelector<HTMLElement>(".swipe-actions");
    if (rail && !returning) Object.assign(rail.style, { opacity: "1", transition: "none" });
    if (artwork)
      artwork.animate(
        [
          { transform: artworkTransform },
          { transform: artworkTransform, offset: 0.5, easing: "cubic-bezier(.4,0,.2,1)" },
          { transform: "translateX(0px)" },
        ],
        {
          duration: 320,
          fill: "both",
        },
      );
    if (removal instanceof HTMLElement) {
      removal.inert = true;
      removal.setAttribute("aria-hidden", "true");
      removal.style.pointerEvents = "none";
      target.append(removal);
    }
    const opacity = tile.style.opacity;
    tile.style.opacity = "0";
    slide(
      target,
      ghost,
      offset,
      0,
      () => {
        tile.style.opacity = opacity;
        if (removal instanceof HTMLElement) removal.remove();
      },
      true,
    );
  };
}
