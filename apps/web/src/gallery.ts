import { documentPlus } from "./icons.ts";
import { t } from "./locale.ts";
import { button, element } from "./dom.ts";
import { disposeGalleryActions, installGalleryActions } from "./gallery-actions.ts";
import type { ActionPoint, DrawingAction } from "./drawing-actions.ts";
import type { Drawing, Platform } from "./model.ts";
import { viewer } from "./model.ts";
interface Actions {
  open: (drawing: Drawing, origin: HTMLElement) => void;
  create: (origin: HTMLElement) => void;
  menu: (
    drawing: Drawing,
    origin: HTMLElement,
    contextual: boolean,
    point?: ActionPoint,
    selected?: DrawingAction,
  ) => void;
  undo: (drawing: Drawing) => void;
}
export function renderGallery(
  root: HTMLElement,
  drawings: Drawing[],
  platform: Platform,
  actions: Actions,
): void {
  disposeGalleryActions(root);
  root.replaceChildren();
  const readonly = viewer(platform);
  const grid = element("div", "drawing-grid");
  grid.setAttribute("aria-label", t("gallery.label"));
  if (!readonly && (platform !== "ios" || drawings.length === 0)) {
    const add = button("+", "new-tile", () => actions.create(add));
    add.append(element("span", "", t("drawing.create")));
    add.setAttribute("aria-label", t("drawing.create"));
    const cell = element("article", "new-cell");
    cell.append(add);
    grid.append(cell);
  }
  for (const drawing of drawings) {
    if (readonly && drawing.deleted) continue;
    const card = element("article", "drawing-card");
    card.dataset.id = drawing.id;
    const open = button("", "drawing-tile", () => actions.open(drawing, card));
    open.setAttribute("aria-label", t("drawing.open", { name: drawing.name }));
    const art = element("div", "artwork");
    if (drawing.image) {
      const img = element("img");
      img.src = drawing.image;
      img.alt = "";
      img.draggable = false;
      art.append(img);
    }
    open.append(art, element("span", "drawing-name", drawing.name));
    card.append(open);
    if (drawing.deleted) {
      card.classList.add("removed");
      open.inert = true;
      const pending = element("div", "removal");
      pending.append(
        element("span", "", t("drawing.deleted", { name: drawing.name })),
        button(t("action.undo"), "undo", () => actions.undo(drawing)),
      );
      card.append(pending);
    }
    grid.append(card);
  }
  root.append(grid);
  if (!readonly) installGalleryActions(root, drawings, platform, actions.menu);
  if (!readonly && platform !== "ios") {
    const add = button("+ " + t("drawing.create"), "mobile-create", () => actions.create(add));
    if (platform === "ipados") {
      add.replaceChildren(documentPlus(), element("span", "", t("drawing.createShort")));
      add.setAttribute("aria-label", t("drawing.create"));
      const toolbar = element("div", "mobile-actions");
      toolbar.setAttribute("role", "toolbar");
      toolbar.setAttribute("aria-label", t("gallery.toolbar"));
      toolbar.append(add);
      root.append(toolbar);
    } else root.append(add);
  }
  const hasVisibleDrawings = drawings.some((drawing) => !readonly || !drawing.deleted);
  if (!hasVisibleDrawings) {
    root.classList.add("empty");
  } else root.classList.remove("empty");
  if (readonly && !hasVisibleDrawings)
    root.append(element("p", "empty-message", t("gallery.emptyViewer")));
}
