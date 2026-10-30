import {
  library,
  type MutationIdentity,
  type MutationResult,
} from "../../vector-editor/src/saving/library.ts";
import { installGalleryActions } from "./gallery-actions.ts";
import { showMenu } from "./menu.ts";
import { renameDrawing } from "./rename.ts";
import { releaseVectorSession } from "./vector-editor.ts";
import { revealRemoval } from "./action-motion.ts";
import { prepareUndoMotion } from "./undo-motion.ts";
import { button, element } from "./dom.ts";
import { t } from "./locale.ts";
import { record } from "./diagnostics.ts";
import type { Drawing } from "./model.ts";
export function savedGalleryActions(
  gallery: HTMLElement,
  render: () => void,
  announce: (value: string) => void,
  working: (value: boolean) => void,
  invalidatePages: () => void,
  blocked: () => boolean,
) {
  const store = library(),
    busy = new Set<string>();
  const attempts = new Map<string, { kind: string; value: string; identity: MutationIdentity }>();
  const card = (drawing: Drawing) =>
    gallery.querySelector<HTMLElement>(`[data-id="${CSS.escape(drawing.id)}"]`);
  function request(drawing: Drawing, kind: string, value = "") {
    const key = `${drawing.id}:${kind}`;
    const old = attempts.get(key);
    if (old?.kind === kind && old.value === value) return old.identity;
    const identity = {
      document: drawing.id,
      incarnation: drawing.incarnation,
      operation: crypto.randomUUID(),
    };
    attempts.set(key, { kind, value, identity });
    return identity;
  }
  function apply(drawing: Drawing, result: MutationResult) {
    drawing.name = result.entry.title;
    drawing.updated = result.entry.updated;
    drawing.deleted = result.deletionToken !== null;
    if (result.deletionToken) drawing.deletionToken = result.deletionToken;
    else delete drawing.deletionToken;
    for (const kind of ["rename", "remove", "undo"]) attempts.delete(`${drawing.id}:${kind}`);
    invalidatePages();
    render();
  }
  const errorText = (error: unknown, rename = false) =>
    error instanceof Error && error.message === "in-use"
      ? t("save.openInUse")
      : error instanceof Error && error.message === "storage-title"
        ? t("library.invalidTitle")
        : t(rename ? "library.renameFailed" : "library.actionFailed");
  function failure(drawing: Drawing, error: unknown, retry: () => void) {
    const notice = element("div");
    notice.dataset.actionError = "";
    notice.setAttribute("role", "alert");
    notice.append(element("p", "", errorText(error)), button(t("library.retry"), "", retry));
    card(drawing)?.querySelector("[data-action-error]")?.remove();
    card(drawing)?.append(notice);
  }
  async function remove(drawing: Drawing): Promise<HTMLElement | void> {
    if (busy.size || blocked()) return;
    busy.add(drawing.id);
    working(true);
    const previous = card(drawing)?.querySelector<HTMLElement>(".drawing-tile") ?? null;
    try {
      const identity = request(drawing, "remove");
      await releaseVectorSession(drawing.id);
      apply(drawing, await store.remove(identity));
      revealRemoval(card(drawing)?.querySelector<HTMLElement>(".removal") ?? null, previous);
      record(drawing.deleted ? "removed" : "restored");
      announce(t(drawing.deleted ? "drawing.removedAnnouncement" : "drawing.restored"));
      const target = card(drawing)?.querySelector<HTMLElement>(drawing.deleted ? ".undo" : ".more");
      target?.focus({ preventScroll: true });
      return target ?? undefined;
    } catch (error) {
      failure(drawing, error, () => void remove(drawing));
    } finally {
      busy.delete(drawing.id);
      working(false);
    }
  }
  async function undo(drawing: Drawing, origin: HTMLElement) {
    if (busy.size || blocked() || !drawing.deletionToken) return;
    busy.add(drawing.id);
    working(true);
    const motion = prepareUndoMotion(origin);
    origin.setAttribute("aria-disabled", "true");
    try {
      const identity = request(drawing, "undo", drawing.deletionToken);
      apply(drawing, await store.undo({ ...identity, deletionToken: drawing.deletionToken }));
      const target =
        card(drawing)?.querySelector<HTMLElement>(drawing.deleted ? ".undo" : ".more") ?? null;
      motion(target);
      target?.focus({ preventScroll: true });
      record(drawing.deleted ? "removed" : "restored");
      announce(t(drawing.deleted ? "drawing.removedAnnouncement" : "drawing.restored"));
    } catch (error) {
      failure(drawing, error, () => void undo(drawing, origin));
    } finally {
      busy.delete(drawing.id);
      working(false);
      origin.removeAttribute("aria-disabled");
    }
  }
  return {
    undo: (drawing: Drawing, origin: HTMLElement) => void undo(drawing, origin),
    install(drawings: Drawing[]) {
      installGalleryActions(gallery, drawings, (drawing, origin) => {
        if (busy.size || blocked()) return;
        showMenu(origin, [
          {
            label: t("action.rename"),
            handoff: true,
            run: (bounds) =>
              renameDrawing(
                drawing.name,
                async (title) => {
                  if (busy.size || blocked()) throw Error(t("library.actionFailed"));
                  const identity = request(drawing, "rename", title);
                  busy.add(drawing.id);
                  working(true);
                  try {
                    apply(
                      drawing,
                      await store.rename({ ...identity, expectedTitle: drawing.name, title }),
                    );
                    record("renamed");
                  } catch (error) {
                    throw Error(errorText(error, true), { cause: error });
                  } finally {
                    busy.delete(drawing.id);
                    working(false);
                  }
                },
                () =>
                  card(drawing)
                    ?.querySelector<HTMLElement>(drawing.deleted ? ".undo" : ".drawing-tile")
                    ?.focus(),
                bounds,
                card(drawing),
              ),
          },
          { label: t("action.delete"), destructive: true, run: () => remove(drawing) },
        ]);
      });
    },
  };
}
