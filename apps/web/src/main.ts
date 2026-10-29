import { hasVectorSession } from "./vector-editor.ts";
import { gallery as galleryStyle, srOnly, prototypeLabel } from "./styles.css.ts";
import { createOverlayScrollbar } from "./overlay-scrollbar.ts";
import { t } from "./locale.ts";
import "./styles.css.ts";
import { createAppHeader } from "./app-header.ts";
import { element } from "./dom.ts";
import { sampleDrawings } from "./model.ts";
import type { Drawing } from "./model.ts";
import { renderGallery } from "./gallery.ts";
import { createNavigation } from "./navigation.ts";
import { closeMenu } from "./menu.ts";
import { drawingActions } from "./drawing-actions.ts";
import { prepareUndoMotion } from "./undo-motion.ts";
import { record } from "./diagnostics.ts";
import { drawingRoute, openRoute, initializeRoute } from "./routes.ts";
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw Error("Missing app root");
let drawings = sampleDrawings();
let currentId: string | null = null;
const blankPreview: Drawing = {
  id: "preview-new",
  name: t("save.title"),
  image: null,
  deleted: false,
};
const toolbar = createAppHeader();
const gallery = element("main", `gallery ${galleryStyle}`);
const status = element("p", `sr-only ${srOnly}`);
status.setAttribute("role", "status");
const notice = element("p", `prototype-label ${prototypeLabel}`, t("preview.disclaimer"));
app.append(toolbar, gallery, notice, status);
const announce = (text: string) => {
  status.textContent = text;
};
const navigation = createNavigation(gallery, (restoreFocus) => {
  toolbar.inert = false;
  const id = currentId;
  currentId = null;
  render();
  const origin =
    id === blankPreview.id
      ? creationOrigin()
      : gallery.querySelector<HTMLElement>(`[data-id="${id}"] .drawing-tile`);
  if (restoreFocus) origin?.focus({ preventScroll: true });
});
function creationOrigin(): HTMLElement | null {
  return (
    [...gallery.querySelectorAll<HTMLElement>(".new-tile, .mobile-create")].find(
      (node) => node.getBoundingClientRect().width > 0,
    ) ?? null
  );
}
function render(): void {
  renderGallery(gallery, drawings, actions);
  if (hasVectorSession()) notice.textContent = t("save.local");
}
function open(drawing: Drawing, origin: HTMLElement): void {
  if (navigation.active) return;
  try {
    openRoute(drawing.id);
  } catch {
    announce(t("memory.navigationUnavailable"));
    return;
  }
  closeMenu();
  toolbar.inert = true;
  currentId = drawing.id;
  drawings = drawings.filter((item) => !item.deleted);
  void navigation.open(drawing, origin, () => history.back());
}
const actions = {
  open,
  create(origin: HTMLElement) {
    if (navigation.active) return;
    record("preview-opened");
    open(blankPreview, origin);
  },
  undo(drawing: Drawing) {
    if (navigation.active) return;
    if (!drawing.deleted) return;
    const previous = gallery.querySelector<HTMLElement>(`[data-id="${drawing.id}"]`);
    const restoreVisual = prepareUndoMotion(previous?.querySelector<HTMLElement>(".undo") ?? null);
    drawing.deleted = false;
    record("restored");
    render();
    const card = gallery.querySelector<HTMLElement>(`[data-id="${drawing.id}"]`);
    const target = card?.querySelector<HTMLElement>(".more") ?? null;
    (target ?? card?.querySelector<HTMLElement>(".drawing-tile"))?.focus({ preventScroll: true });
    restoreVisual(target ?? card?.querySelector<HTMLElement>(".drawing-tile") ?? null);
    announce(t("drawing.restored"));
  },
  menu(drawing: Drawing, origin: HTMLElement) {
    if (navigation.active) return;
    drawingActions(gallery, render, announce, drawing, origin);
  },
};
let reconciling = false;
async function syncRoute(): Promise<void> {
  if (reconciling) return;
  reconciling = true;
  try {
    while (true) {
      const id = drawingRoute();
      const drawing =
        drawings.find((item) => item.id === id && !item.deleted) ??
        (id === blankPreview.id ? blankPreview : undefined);
      if (navigation.active && drawing?.id === currentId) break;
      if (navigation.active) {
        if (!(await navigation.close())) {
          if (currentId) openRoute(currentId);
          break;
        }
        continue;
      }
      const source =
        drawing === blankPreview
          ? creationOrigin()
          : drawing
            ? gallery.querySelector<HTMLElement>(`[data-id="${drawing.id}"]`)
            : null;
      if (drawing && source) open(drawing, source);
      break;
    }
  } finally {
    reconciling = false;
  }
}
window.addEventListener("popstate", () => void syncRoute());
initializeRoute([...drawings.map((drawing) => drawing.id), blankPreview.id]);
render();
void syncRoute();

const disposeScrollbar = createOverlayScrollbar(t("gallery.scroll"));
import.meta.hot?.dispose(disposeScrollbar);
