import { createVectorShell } from "./vector-editor.ts";
import { drawingOpen } from "./styles.css.ts";
import { away } from "./states.css.ts";
import { drawingSurface, canvasArt } from "./canvas.css.ts";
import { attachCreationVisual, readSurfaceAppearance } from "./creation-motion.ts";
import { element } from "./dom.ts";
import { artworkBounds, moveSurface } from "./surface-motion.ts";
import type { Drawing } from "./model.ts";
import { record } from "./diagnostics.ts";
export function createNavigation(gallery: HTMLElement, onReturn: (restoreFocus: boolean) => void) {
  let surface: HTMLElement | null = null;
  let chrome: Awaited<ReturnType<typeof createVectorShell>> | null = null;
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
      const nextChrome = await createVectorShell(drawing.id, drawing.name, requestBack);
      closing = false;
      origin = source;
      const rect = source.getBoundingClientRect();
      const imageRect = artworkBounds(source);
      elevatedShadow = getComputedStyle(source.closest(".drawing-card") ?? source).boxShadow;
      surface = element("section", `drawing-surface ${drawingSurface}`);
      surface.style.boxShadow = elevatedShadow;
      surface.setAttribute("aria-label", drawing.name);
      attachCreationVisual(surface, source);
      if (drawing.image) {
        const image = element("img", `canvas-art ${canvasArt}`);
        image.src = drawing.image;
        image.alt = "";
        surface.append(image);
      }
      chrome = nextChrome;
      chrome.setReady(false);
      surface.append(chrome.root);
      document.body.append(surface);

      const current = surface;
      const previousFocus = document.activeElement;
      let focusChanged = false;
      const trackFocus = () => {
        focusChanged = true;
      };
      document.addEventListener("focusin", trackFocus);
      window.addEventListener("blur", trackFocus);
      source.style.visibility = "hidden";
      gallery.inert = true;
      gallery.classList.add("away", away);
      document.body.classList.add("drawing-open", drawingOpen);
      record("opened");
      await move(rect, viewport(), imageRect);
      document.removeEventListener("focusin", trackFocus);
      window.removeEventListener("blur", trackFocus);
      if (surface === current && !closing) {
        chrome?.setReady(true);
        if (
          !focusChanged &&
          (document.activeElement === previousFocus || document.activeElement === document.body)
        )
          chrome?.back.focus({ preventScroll: true });
      }
    },
    async close(): Promise<boolean> {
      if (!surface || !origin || closing) return false;
      if (chrome && "requestLeave" in chrome && !(await chrome.requestLeave())) return false;
      if (!surface || !origin || closing) return false;
      closing = true;
      const current = surface;
      const rect = current.getBoundingClientRect();
      const imageRect = current.querySelector(".canvas-art")?.getBoundingClientRect() ?? null;
      chrome?.setReady(false);
      chrome?.dispose();
      let focusChanged = false;
      const trackFocus = () => {
        focusChanged = true;
      };
      document.addEventListener("focusin", trackFocus);
      window.addEventListener("blur", trackFocus);
      gallery.classList.remove("away", away);
      await move(rect, origin.getBoundingClientRect(), imageRect);
      document.removeEventListener("focusin", trackFocus);
      window.removeEventListener("blur", trackFocus);
      if (surface !== current) return false;
      current.remove();
      origin.style.visibility = "";
      surface = null;
      chrome = null;
      origin = null;
      gallery.inert = false;
      document.body.classList.remove("drawing-open", drawingOpen);
      record("returned");
      onReturn(!focusChanged);
      return true;
    },
  };
}
