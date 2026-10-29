import { refreshSavedDate } from "./library-metadata.ts";
import { libraryRoutes } from "./library-routes.ts";
import { library } from "../../vector-editor/src/saving/library.ts";
import { gallery as galleryStyle, srOnly, prototypeLabel } from "./styles.css.ts";
import { createOverlayScrollbar } from "./overlay-scrollbar.ts";
import { t, locale } from "./locale.ts";
import { createAppHeader } from "./app-header.ts";
import { element, button } from "./dom.ts";
import { savedDrawing as project, type Drawing } from "./model.ts";
import { renderGallery } from "./gallery.ts";
import { createNavigation } from "./navigation.ts";
import { drawingRoute, openRoute, initializeRoute, galleryRoute } from "./routes.ts";
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw Error("Missing app root");
let drawings: Drawing[] = [],
  currentId: string | null = null;
let busy = false,
  ready = false,
  nextOffset: number | null = null;
let pendingCreate: { id: string; locale: "en" | "uk" } | undefined;
const toolbar = createAppHeader();
const gallery = element("main", `gallery ${galleryStyle}`);
const status = element("p", srOnly);
status.setAttribute("role", "status");
const notice = element("p", prototypeLabel, t("save.local"));
app.append(toolbar, gallery, notice, status);
const store = library();
const navigation = createNavigation(gallery, (restoreFocus) => {
  toolbar.inert = false;
  const id = currentId;
  currentId = null;
  render();
  if (restoreFocus)
    card(id)?.querySelector<HTMLElement>(".drawing-tile")?.focus({ preventScroll: true });
  if (id) void refreshSavedDate(gallery, id, drawings);
});
function card(id: string | null) {
  return id ? gallery.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`) : null;
}
function feedback(message: string, retry: () => void, label = t("library.retry")) {
  gallery.replaceChildren(element("p", "", message), button(label, "", retry));
}
function render() {
  renderGallery(gallery, drawings, {
    open: (drawing, origin) => void open(drawing, origin),
    create: () => void create(),
  });
  if (nextOffset !== null) gallery.append(button(t("library.more"), "", () => void more()));
}
async function open(drawing: Drawing, origin: HTMLElement) {
  if (busy || navigation.active || !ready) return;
  busy = true;
  toolbar.inert = true;
  currentId = drawing.id;
  try {
    notice.textContent = t("save.loading");
    openRoute(drawing.id);
    await navigation.open(drawing, origin, () => history.back());
    notice.textContent = t("save.local");
  } catch {
    toolbar.inert = false;
    status.textContent = notice.textContent = t("save.openFailed");
    currentId = null;
    galleryRoute();
  } finally {
    busy = false;
    routes.resume();
  }
}
async function create() {
  if (busy || navigation.active || !ready) return;
  busy = true;
  gallery.inert = true;
  status.textContent = t("library.creating");
  pendingCreate ??= { id: crypto.randomUUID(), locale };
  try {
    const drawing = project(await store.create(pendingCreate));
    pendingCreate = undefined;
    drawings = [drawing, ...drawings.filter((item) => item.id !== drawing.id)];
    render();
    status.textContent = t("library.created");
    busy = false;
    await open(drawing, card(drawing.id)!);
  } catch {
    render();
    gallery.append(
      element("p", "", t("library.createFailed")),
      button(t("library.retry"), "", () => void create()),
    );
  } finally {
    busy = false;
    gallery.inert = navigation.active;
    routes.resume();
  }
}
async function more() {
  if (busy || nextOffset === null || navigation.active) return;
  busy = true;
  try {
    const page = await store.list({ offset: nextOffset, locale });
    drawings.push(
      ...page.drawings.map(project).filter((item) => !drawings.some((old) => old.id === item.id)),
    );
    nextOffset = page.nextOffset;
    notice.textContent = t(
      page.recoveryErrors.length || page.pendingRecovery ? "library.recovery" : "save.local",
    );
    render();
  } catch {
    status.textContent = t("library.failed");
  } finally {
    busy = false;
    routes.resume();
  }
}
async function refresh() {
  if (busy) return;
  busy = true;
  try {
    const page = await store.list({ locale });
    drawings = page.drawings.map(project);
    nextOffset = page.nextOffset;
    notice.textContent = t(
      page.recoveryErrors.length || page.pendingRecovery ? "library.recovery" : "save.local",
    );
    let id = drawingRoute();
    if (id === "preview-new") {
      id = "drawing";
      history.replaceState(history.state, "", "/drawing/drawing" + location.search);
    }
    if (id && !drawings.some((item) => item.id === id)) {
      const entry = await store.get(id, locale);
      if (entry) drawings.push(project(entry));
      else {
        ready = true;
        feedback(
          t("library.missing"),
          () => {
            galleryRoute();
            render();
          },
          t("library.back"),
        );
        return;
      }
    }
    ready = true;
    initializeRoute(drawings.map((item) => item.id));
    render();
  } catch {
    ready = false;
    feedback(t("library.failed"), () => void refresh());
  } finally {
    busy = false;
    routes.resume();
  }
  await routes.sync();
}
const routes = libraryRoutes({
  blocked: () => busy || !ready,
  active: () => navigation.active,
  current: () => currentId,
  close: () => navigation.close(),
  async find(id) {
    let drawing = drawings.find((item) => item.id === id);
    if (!drawing) {
      const entry = await store.get(id, locale);
      if (entry) {
        drawing = project(entry);
        drawings.push(drawing);
        render();
      }
    }
    return drawing;
  },
  open: (drawing) => open(drawing, card(drawing.id)!),
  refresh: async () => {},
  missing: () =>
    feedback(
      t("library.missing"),
      () => {
        galleryRoute();
        render();
      },
      t("library.back"),
    ),
  failed: () => {
    status.textContent = notice.textContent = t("library.failed");
  },
});
window.addEventListener("popstate", () => void routes.sync());
feedback(t("library.loading"), () => void refresh());
void refresh();
const disposeScrollbar = createOverlayScrollbar(t("gallery.scroll"));
import.meta.hot?.dispose(disposeScrollbar);
