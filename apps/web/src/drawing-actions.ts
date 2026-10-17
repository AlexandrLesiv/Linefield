import { t } from "./locale.ts";
import { showMenu } from "./menu.ts";
import { renameDrawing } from "./rename.ts";
import { prepareMobileDelete } from "./mobile-action-motion.ts";
import { revealRemoval } from "./action-motion.ts";
import { record } from "./diagnostics.ts";
import type { Drawing } from "./model.ts";
export type ActionPoint = { x: number; y: number };
export type DrawingAction = "rename" | "delete";
export function drawingActions(
  gallery: HTMLElement,
  render: () => void,
  announce: (text: string) => void,
  drawing: Drawing,
  origin: HTMLElement,
  contextual: boolean,
  point?: ActionPoint,
  selected?: DrawingAction,
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
          selected === "rename",
        ),
    },
    {
      label: t("action.delete"),
      destructive: true,
      run: () => {
        const previous = card()?.querySelector<HTMLElement>(".drawing-tile") ?? null;
        const mobileRemoval = selected === "delete" ? prepareMobileDelete(card()) : null;
        drawing.deleted = true;
        record("removed");
        render();
        if (mobileRemoval) mobileRemoval(card());
        else revealRemoval(card()?.querySelector<HTMLElement>(".removal") ?? null, previous);
        announce(t("drawing.removedAnnouncement"));
        const undo = card()?.querySelector<HTMLElement>(".undo");
        undo?.focus({ preventScroll: true });
        return undo ?? undefined;
      },
    },
  ];
  if (selected) items[selected === "rename" ? 0 : 1]?.run(origin.getBoundingClientRect());
  else showMenu(origin, items, contextual, point);
}
