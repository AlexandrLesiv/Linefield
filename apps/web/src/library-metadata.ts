import { library } from "../../vector-editor/src/saving/library.ts";
import { t, locale } from "./locale.ts";
import type { Drawing } from "./model.ts";
export function modifiedLabel(timestamp: number): string {
  return t("library.modified", {
    date: new Intl.DateTimeFormat(navigator.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(timestamp),
  });
}
/** Refresh only the returned drawing's date, preserving card focus and gallery scroll. */
export async function refreshSavedDate(root: HTMLElement, id: string, drawings: Drawing[]) {
  try {
    const entry = await library().get(id, locale);
    const item = drawings.find((drawing) => drawing.id === id);
    if (!entry || !item || entry.updated < (item.updated ?? 0)) return;
    item.updated = entry.updated;
    const date = root.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] [data-modified]`);
    if (date) date.textContent = modifiedLabel(entry.updated);
  } catch {
    /* The last known timestamp remains visible; drawing durability is independent. */
  }
}
