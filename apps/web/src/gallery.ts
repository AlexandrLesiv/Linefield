import { modifiedLabel } from "./library-metadata.ts";
import { savedName, savedDate, whiteThumbnail } from "./saved-cards.css.ts";
import { creationClearance } from "./memory/creation-clearance.ts";
import { newCell, mobileCreate, newTile, newLabel } from "./gallery-creation.css.ts";
import { empty } from "./states.css.ts";
import { drawingGrid, drawingCard, drawingTile, artwork } from "./cards.css.ts";
import { t } from "./locale.ts";
import { button, element } from "./dom.ts";
import type { Drawing } from "./model.ts";
interface Actions {
  open: (drawing: Drawing, origin: HTMLElement) => void;
  create: (origin: HTMLElement) => void;
}
export function renderGallery(root: HTMLElement, drawings: Drawing[], actions: Actions): void {
  root.replaceChildren();
  const createLabel = t("drawing.create");
  const grid = element("div", `drawing-grid ${drawingGrid}`);
  grid.setAttribute("aria-label", t("gallery.label"));
  const add = button("+", `new-tile ${newTile}`, () => actions.create(add));
  add.append(element("span", newLabel, createLabel));
  add.setAttribute("aria-label", createLabel);
  const cell = element("article", `new-cell ${newCell}`);
  cell.append(add);
  grid.append(cell);
  for (const drawing of drawings) {
    const card = element("article", `drawing-card ${drawingCard}`);
    card.dataset.id = drawing.id;
    const open = button("", `drawing-tile ${drawingTile}`, () => actions.open(drawing, card));
    open.setAttribute("aria-label", t("drawing.open", { name: drawing.name }));
    const art = element("div", `artwork ${artwork} ${whiteThumbnail}`);
    art.setAttribute("aria-hidden", "true");
    open.append(art, element("span", `drawing-name ${savedName}`, drawing.name));
    if (drawing.updated) {
      const date = element("span", savedDate, modifiedLabel(drawing.updated));
      date.dataset.modified = "";
      open.append(date);
    }
    card.append(open);
    grid.append(card);
  }
  root.append(grid);
  const mobile = button("+ " + createLabel, `mobile-create ${mobileCreate}`, () =>
    actions.create(mobile),
  );
  root.append(mobile);
  creationClearance(root, mobile, grid);
  root.classList.toggle("empty", drawings.length === 0);
  root.classList.toggle(empty, drawings.length === 0);
}
