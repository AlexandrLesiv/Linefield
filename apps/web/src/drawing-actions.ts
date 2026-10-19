import { t } from "./locale.ts";
import { showMenu } from "./menu.ts";
import { renameDrawing } from "./rename.ts";
import { revealRemoval } from "./action-motion.ts";
import { record } from "./diagnostics.ts";
import type { Drawing } from "./model.ts";
export function drawingActions(
  gallery: HTMLElement,
  render: () => void,
  announce: (text: string) => void,
  drawing: Drawing,
  origin: HTMLElement,
): void {
  const card = () =>
    gallery.querySelector<HTMLElement>('[data-id="' + CSS.escape(drawing.id) + '"]');
  const items = [
    {
      label: t("action.rename"),
      handoff: true,
      run: (bounds: DOMRect) =>
        renameDrawing(
          drawing.name,
          (name) => {
            drawing.name = name;
            record("renamed");
            render();
          },
          () => card()?.querySelector<HTMLElement>(".drawing-tile")?.focus({ preventScroll: true }),
          bounds,
          card(),
        ),
    },
    {
      label: t("action.delete"),
      destructive: true,
      run: () => {
        const previous = card()?.querySelector<HTMLElement>(".drawing-tile") ?? null;
        drawing.deleted = true;
        record("removed");
        render();
        revealRemoval(card()?.querySelector<HTMLElement>(".removal") ?? null, previous);
        announce(t("drawing.removedAnnouncement"));
        const undo = card()?.querySelector<HTMLElement>(".undo");
        undo?.focus({ preventScroll: true });
        return undo ?? undefined;
      },
    },
  ];
  showMenu(origin, items);
}
