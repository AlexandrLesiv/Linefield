import { createOverlayScrollbar } from "./overlay-scrollbar.ts";
import { t } from "./locale.ts";
import "./styles.css.ts";
import "./platforms.css.ts";
import { createAppHeader } from "./app-header.ts";
import { element } from "./dom.ts";
import { platforms, readPlatform, sampleDrawings, viewer } from "./model.ts";
import type { Drawing } from "./model.ts";
import { usesSwipe } from "./gallery-actions.ts";
import { renderGallery } from "./gallery.ts";
import { createNavigation } from "./navigation.ts";
import { closeMenu } from "./menu.ts";
import { drawingActions } from "./drawing-actions.ts";
import type { ActionPoint, DrawingAction } from "./drawing-actions.ts";
import { prepareUndoMotion } from "./undo-motion.ts";
import { prepareMobileUndo } from "./mobile-action-motion.ts";
import { record } from "./diagnostics.ts";
import { drawingRoute, openRoute, initializeRoute } from "./routes.ts";
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw Error("Missing app root");
let platform = readPlatform();
let drawings = sampleDrawings();
let currentId: string | null = null;
const blankPreview: Drawing = {
  id: "preview-new",
  name: t("drawing.untitled"),
  image: null,
  deleted: false,
};
const {
  toolbar,
  selector,
  add: composeCreate,
} = createAppHeader(
  platform,
  () => {
    if (navigation.active) return;
    closeMenu();
    drawings = sampleDrawings();
    render();
    announce(t("preview.resetAnnouncement"));
  },
  (origin) => actions.create(origin),
);
const gallery = element("main", "gallery");
const status = element("p", "sr-only");
status.setAttribute("role", "status");
const notice = element("p", "prototype-label", t("preview.disclaimer"));
app.append(toolbar, gallery, notice, status);
const announce = (text: string) => {
  status.textContent = text;
};
const navigation = createNavigation(gallery, () => {
  toolbar.inert = false;
  const id = currentId;
  currentId = null;
  render();
  const origin =
    id === blankPreview.id
      ? creationOrigin()
      : gallery.querySelector<HTMLElement>(`[data-id="${id}"] .drawing-tile`);
  origin?.focus({ preventScroll: true });
});
function creationOrigin(): HTMLElement | null {
  return (
    [composeCreate, ...gallery.querySelectorAll<HTMLElement>(".new-tile, .mobile-create")].find(
      (node) => node.getBoundingClientRect().width > 0,
    ) ?? null
  );
}
function render(): void {
  document.documentElement.dataset.platform = platform;
  composeCreate.hidden = platform !== "ios" || drawings.length === 0;
  renderGallery(gallery, drawings, platform, actions);
}
function open(drawing: Drawing, origin: HTMLElement): void {
  if (navigation.active) return;
  closeMenu();
  toolbar.inert = true;
  currentId = drawing.id;
  drawings = drawings.filter((item) => !item.deleted);
  openRoute(drawing.id);
  void navigation.open(drawing, origin, () => history.back());
}
const actions = {
  open,
  create(origin: HTMLElement) {
    if (viewer(platform) || navigation.active) return;
    record("preview-opened");
    open(blankPreview, origin);
  },
  undo(drawing: Drawing) {
    if (viewer(platform) || navigation.active) return;
    if (!drawing.deleted) return;
    const mobile = usesSwipe(gallery, platform);
    const previous = gallery.querySelector<HTMLElement>(`[data-id="${drawing.id}"]`);
    const restoreVisual = mobile
      ? prepareMobileUndo(previous)
      : prepareUndoMotion(previous?.querySelector<HTMLElement>(".undo") ?? null);
    drawing.deleted = false;
    record("restored");
    render();
    const card = gallery.querySelector<HTMLElement>(`[data-id="${drawing.id}"]`);
    const target = card?.querySelector<HTMLElement>(".more") ?? null;
    (target ?? card?.querySelector<HTMLElement>(".drawing-tile"))?.focus({ preventScroll: true });
    restoreVisual(
      mobile ? card : (target ?? card?.querySelector<HTMLElement>(".drawing-tile") ?? null),
    );
    announce(t("drawing.restored"));
  },
  menu(
    drawing: Drawing,
    origin: HTMLElement,
    contextual: boolean,
    point?: ActionPoint,
    selected?: DrawingAction,
  ) {
    if (viewer(platform) || navigation.active) return;
    drawingActions(gallery, render, announce, drawing, origin, contextual, point, selected);
  },
};
selector.addEventListener("change", () => {
  const next = platforms.find((item) => item === selector.value);
  if (!next) return;
  closeMenu();
  platform = next;
  record("platform-changed");
  render();
});
let reconciling = false;
async function syncRoute(): Promise<void> {
  if (reconciling) return;
  reconciling = true;
  try {
    while (true) {
      const id = drawingRoute();
      const drawing =
        drawings.find((item) => item.id === id && !item.deleted) ??
        (id === blankPreview.id && !viewer(platform) ? blankPreview : undefined);
      if (navigation.active && drawing?.id === currentId) break;
      if (navigation.active) {
        await navigation.close();
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
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.active && !document.querySelector('[role="menu"]'))
    history.back();
});
initializeRoute([
  ...drawings.map((drawing) => drawing.id),
  ...(!viewer(platform) ? [blankPreview.id] : []),
]);
render();
void syncRoute();

const disposeScrollbar = createOverlayScrollbar(t("gallery.scroll"));
import.meta.hot?.dispose(disposeScrollbar);
