import { button } from "./dom.ts";
import { t } from "./locale.ts";
import { attachSwipeActions } from "./swipe-actions.ts";
import { attachActions } from "./gestures.ts";
import { closeMenu } from "./menu.ts";
import type { Drawing, Platform } from "./model.ts";
import type { ActionPoint, DrawingAction } from "./drawing-actions.ts";
const disposals = new WeakMap<HTMLElement, () => void>();
export function disposeGalleryActions(root: HTMLElement): void {
  disposals.get(root)?.();
}
export function usesSwipe(root: HTMLElement, platform: Platform): boolean {
  const grid = root.querySelector(".drawing-grid");
  return (
    (platform === "ios" || platform === "android") &&
    !!grid &&
    getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length === 1
  );
}
export function installGalleryActions(
  root: HTMLElement,
  drawings: Drawing[],
  platform: Platform,
  run: (
    drawing: Drawing,
    origin: HTMLElement,
    contextual: boolean,
    point?: ActionPoint,
    selected?: DrawingAction,
  ) => void,
): void {
  const grid = root.querySelector<HTMLElement>(".drawing-grid");
  if (!grid) return;
  const records: { dispose: () => void; card: HTMLElement; open: HTMLElement; drawing: Drawing }[] =
    [];
  for (const drawing of drawings) {
    const card = grid.querySelector<HTMLElement>(`[data-id="${CSS.escape(drawing.id)}"]`);
    const open = card?.querySelector<HTMLElement>(".drawing-tile");
    if (card && open && !drawing.deleted) records.push({ card, open, drawing, dispose: () => {} });
  }
  let mode = "";
  const update = () => {
    if (mode && (root.inert || document.querySelector("dialog[open]"))) return;
    const next = usesSwipe(root, platform)
      ? "swipe"
      : ["web", "ios", "ipados", "android"].includes(platform)
        ? "more"
        : "context";
    if (next === mode) return;
    closeMenu();
    for (const record of records) {
      const { card, open, drawing } = record;
      const focused = card.contains(document.activeElement);
      record.dispose();
      if (next === "swipe")
        record.dispose = attachSwipeActions(card, open, drawing.name, (kind, origin) =>
          run(drawing, origin, true, undefined, kind),
        );
      else if (next === "more") {
        const more = button("···", "more", () => run(drawing, more, false));
        more.setAttribute("aria-label", t("drawing.actions", { name: drawing.name }));
        more.setAttribute("aria-haspopup", "menu");
        more.setAttribute("aria-expanded", "false");
        card.append(more);
        record.dispose = () => more.remove();
      } else attachActions(card, open, (point) => run(drawing, open, true, point));
      if (focused && document.activeElement !== open) open.focus({ preventScroll: true });
    }
    mode = next;
  };
  update();
  const resize = new ResizeObserver(update);
  resize.observe(grid);
  const mutations = new MutationObserver(update);
  mutations.observe(document.body, { childList: true });
  disposals.set(root, () => {
    resize.disconnect();
    mutations.disconnect();
    records.forEach((record) => record.dispose());
  });
}
