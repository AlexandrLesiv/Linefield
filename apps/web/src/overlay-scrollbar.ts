import * as styles from "./overlay-scrollbar.css.ts";

/** Native document scrolling remains authoritative; this control only reflects it. */
export function createOverlayScrollbar(label: string, controlsId = "app"): () => void {
  const root = document.documentElement;
  const content = document.getElementById(controlsId);
  if (!content) throw Error("Missing scrollbar content");
  const track = document.createElement("div");
  track.className = styles.track;
  track.dataset.overlayTrack = "";
  const thumb = document.createElement("div");
  thumb.className = styles.thumb;
  thumb.tabIndex = 0;
  thumb.setAttribute("role", "scrollbar");
  thumb.setAttribute("aria-label", label);
  thumb.setAttribute("aria-controls", controlsId);
  thumb.setAttribute("aria-orientation", "vertical");
  thumb.setAttribute("aria-valuemin", "0");
  track.append(thumb);
  document.body.append(track);
  const events = new AbortController();
  const options = { signal: events.signal };
  let frame = 0;
  let maximum = 0;
  let travel = 0;
  let drag: { id: number; y: number; scroll: number } | null = null;
  function refresh(): void {
    frame = 0;
    maximum = Math.max(0, root.scrollHeight - root.clientHeight);
    const blocked =
      document.body.classList.contains("drawing-open") || !!document.querySelector("dialog[open]");
    track.hidden = maximum < 1 || blocked;
    if (track.hidden) {
      if (drag && thumb.hasPointerCapture(drag.id)) thumb.releasePointerCapture(drag.id);
      drag = null;
      return;
    }
    const height = track.clientHeight;
    const size = Math.min(height, Math.max(32, (height * root.clientHeight) / root.scrollHeight));
    travel = Math.max(0, height - size);
    thumb.style.height = size + "px";
    thumb.style.transform = `translateY(${(Math.max(0, Math.min(maximum, scrollY)) / maximum) * travel}px)`;
    thumb.setAttribute("aria-valuemax", String(Math.round(maximum)));
    thumb.setAttribute(
      "aria-valuenow",
      String(Math.round(Math.max(0, Math.min(maximum, scrollY)))),
    );
  }
  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(refresh);
  }
  function scrollToPosition(top: number): void {
    window.scrollTo({ top: Math.max(0, Math.min(maximum, top)), behavior: "instant" });
    schedule();
  }
  thumb.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || track.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      refresh();
      thumb.focus({ preventScroll: true });
      drag = { id: event.pointerId, y: event.clientY, scroll: scrollY };
      thumb.setPointerCapture(event.pointerId);
    },
    options,
  );
  thumb.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || drag.id !== event.pointerId || !travel) return;
      scrollToPosition(drag.scroll + ((event.clientY - drag.y) / travel) * maximum);
    },
    options,
  );
  const stop = () => {
    drag = null;
  };
  thumb.addEventListener("pointerup", stop, options);
  thumb.addEventListener("pointercancel", stop, options);
  thumb.addEventListener("lostpointercapture", stop, options);
  track.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || event.target !== track) return;
      event.preventDefault();
      refresh();
      const direction = event.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
      scrollToPosition(scrollY + direction * root.clientHeight * 0.9);
      thumb.focus({ preventScroll: true });
    },
    options,
  );
  thumb.addEventListener(
    "keydown",
    (event) => {
      const page = root.clientHeight * 0.9;
      const positions: Record<string, number> = {
        ArrowDown: scrollY + 40,
        ArrowUp: scrollY - 40,
        PageDown: scrollY + page,
        PageUp: scrollY - page,
        Home: 0,
        End: maximum,
        " ": scrollY + (event.shiftKey ? -page : page),
      };
      const top = positions[event.key];
      if (top === undefined) return;
      event.preventDefault();
      scrollToPosition(top);
    },
    options,
  );
  window.addEventListener("scroll", schedule, { ...options, passive: true });
  window.addEventListener("resize", schedule, options);
  window.visualViewport?.addEventListener("resize", schedule, options);
  const sizes = new ResizeObserver(schedule);
  sizes.observe(content);
  sizes.observe(root);
  const changes = new MutationObserver(schedule);
  changes.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "open", "inert"],
  });
  root.dataset.overlayScrollbar = "ready";
  refresh();
  return () => {
    events.abort();
    sizes.disconnect();
    changes.disconnect();
    cancelAnimationFrame(frame);
    track.remove();
    delete root.dataset.overlayScrollbar;
  };
}
