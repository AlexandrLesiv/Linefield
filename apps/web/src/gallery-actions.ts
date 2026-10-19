import { more as moreStyle } from "./cards.css.ts";
import { button } from "./dom.ts";
import { t } from "./locale.ts";
import type { Drawing } from "./model.ts";

export function installGalleryActions(
  root: HTMLElement,
  drawings: Drawing[],
  run: (drawing: Drawing, origin: HTMLElement) => void,
): void {
  for (const drawing of drawings) {
    if (drawing.deleted) continue;
    const card = root.querySelector<HTMLElement>('[data-id="' + CSS.escape(drawing.id) + '"]');
    if (!card) continue;
    const more = button("···", `more ${moreStyle}`, () => run(drawing, more));
    more.setAttribute("aria-label", t("drawing.actions", { name: drawing.name }));
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-expanded", "false");
    card.append(more);
  }
}
