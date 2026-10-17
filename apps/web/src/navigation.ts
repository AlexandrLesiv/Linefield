import { attachComposeEdge } from "./compose-edge.ts";
import { attachCreationVisual, readSurfaceAppearance } from "./creation-motion.ts";
import { t } from "./locale.ts";
import { button, element } from "./dom.ts";
import { artworkBounds, moveSurface } from "./surface-motion.ts";
import type { Drawing } from "./model.ts";
import { record } from "./diagnostics.ts";
export function createNavigation(gallery: HTMLElement, onReturn: () => void) {
  let surface: HTMLElement | null = null;
  let origin: HTMLElement | null = null;
  let generation = 0;
  let closing = false;
  let elevatedShadow = "none";
  let motion: ReturnType<typeof moveSurface> | null = null;
  const viewport = () => new DOMRect(0, 0, innerWidth, innerHeight);
  function settle(): void {
    const target = closing && origin ? origin.getBoundingClientRect() : viewport();
    motion?.finish(target, closing && origin ? artworkBounds(origin) : target);
  }
  window.addEventListener("resize", settle);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", settle);
  async function move(from: DOMRect, to: DOMRect, imageFrom: DOMRect | null): Promise<void> {
    const node = surface;
    if (!node || !origin) return;
    const token = ++generation;
    const appearance = readSurfaceAppearance(node);
    motion?.cancel();
    motion = moveSurface(
      node,
      from,
      to,
      imageFrom,
      closing ? artworkBounds(origin) : to,
      closing,
      getComputedStyle(origin).borderRadius,
      appearance,
      elevatedShadow,
      getComputedStyle(origin.closest(".drawing-card") ?? origin).boxShadow,
      closing && origin.matches(".new-tile")
        ? getComputedStyle(origin).backgroundColor
        : getComputedStyle(node).getPropertyValue("--paper").trim(),
    );
    try {
      await motion.finished;
    } catch {
      /* A newer navigation owns presentation. */
    }
    if (token === generation) {
      motion?.cancel();
      motion = null;
    }
  }
  return {
    get active() {
      return surface !== null;
    },
    async open(drawing: Drawing, source: HTMLElement, requestBack: () => void): Promise<void> {
      if (surface) return;
      closing = false;
      origin = source;
      const rect = source.getBoundingClientRect();
      const imageRect = artworkBounds(source);
      elevatedShadow = getComputedStyle(source.closest(".drawing-card") ?? source).boxShadow;
      surface = element("section", "drawing-surface");
      surface.style.boxShadow = elevatedShadow;
      surface.setAttribute("aria-label", drawing.name);
      attachCreationVisual(surface, source);
      attachComposeEdge(surface, source);
      if (drawing.image) {
        const image = element("img", "canvas-art");
        image.src = drawing.image;
        image.alt = "";
        surface.append(image);
      }
      const bar = element("header", "canvas-toolbar");
      const back = button(t("navigation.back"), "back", requestBack);
      surface.addEventListener("keydown", (event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          back.focus();
        }
      });
      bar.append(back, element("span", "canvas-title", drawing.name));
      surface.append(bar);
      document.body.append(surface);
      const current = surface;
      bar.style.opacity = "0";
      source.style.visibility = "hidden";
      gallery.inert = true;
      gallery.classList.add("away");
      document.body.classList.add("drawing-open");
      record("opened");
      await move(rect, viewport(), imageRect);
      if (surface === current && !closing) {
        bar.style.opacity = "";
        back.focus({ preventScroll: true });
      }
    },
    async close(): Promise<void> {
      if (!surface || !origin || closing) return;
      closing = true;
      const current = surface;
      const rect = current.getBoundingClientRect();
      const imageRect = current.querySelector(".canvas-art")?.getBoundingClientRect() ?? null;
      current.querySelector<HTMLElement>(".canvas-toolbar")?.style.setProperty("opacity", "0");
      gallery.classList.remove("away");
      await move(rect, origin.getBoundingClientRect(), imageRect);
      if (surface !== current) return;
      current.remove();
      origin.style.visibility = "";
      surface = null;
      origin = null;
      gallery.inert = false;
      document.body.classList.remove("drawing-open");
      record("returned");
      onReturn();
    },
  };
}
