import { newCell, mobileCreate, newTile, newLabel } from "./gallery-creation.css.ts";
import { removed, empty } from "./states.css.ts";
import {
  drawingGrid,
  drawingCard,
  drawingTile,
  artwork,
  drawingName,
  removal,
  undo,
  artworkImage,
} from "./cards.css.ts";
import { t } from "./locale.ts";
import { button, element } from "./dom.ts";
import { installGalleryActions } from "./gallery-actions.ts";
import type { Drawing } from "./model.ts";
interface Actions {
  open: (drawing: Drawing, origin: HTMLElement) => void;
  create: (origin: HTMLElement) => void;
  menu: (drawing: Drawing, origin: HTMLElement) => void;
  undo: (drawing: Drawing) => void;
}
export function renderGallery(root: HTMLElement, drawings: Drawing[], actions: Actions): void {
  root.replaceChildren();
  const grid = element("div", `drawing-grid ${drawingGrid}`);
  grid.setAttribute("aria-label", t("gallery.label"));
  {
    const add = button("+", `new-tile ${newTile}`, () => actions.create(add));
    add.append(element("span", newLabel, t("drawing.create")));
    add.setAttribute("aria-label", t("drawing.create"));
    const cell = element("article", `new-cell ${newCell}`);
    cell.append(add);
    grid.append(cell);
  }
  for (const drawing of drawings) {
    const card = element("article", `drawing-card ${drawingCard}`);
    card.dataset.id = drawing.id;
    const open = button("", `drawing-tile ${drawingTile}`, () => actions.open(drawing, card));
    open.setAttribute("aria-label", t("drawing.open", { name: drawing.name }));
    const art = element("div", `artwork ${artwork}`);
    if (drawing.image) {
      const img = element("img", artworkImage);
      img.src = drawing.image;
      img.alt = "";
      img.draggable = false;
      art.append(img);
    }
    open.append(art, element("span", `drawing-name ${drawingName}`, drawing.name));
    card.append(open);
    if (drawing.deleted) {
      card.classList.add("removed", removed);
      open.inert = true;
      const pending = element("div", `removal ${removal}`);
      pending.append(
        element("span", "", t("drawing.deleted", { name: drawing.name })),
        button(t("action.undo"), `undo ${undo}`, () => actions.undo(drawing)),
      );
      card.append(pending);
    }
    grid.append(card);
  }
  root.append(grid);
  installGalleryActions(root, drawings, actions.menu);
  const add = button("+ " + t("drawing.create"), `mobile-create ${mobileCreate}`, () =>
    actions.create(add),
  );
  root.append(add);
  root.classList.toggle("empty", drawings.length === 0);
  root.classList.toggle(empty, drawings.length === 0);
}
