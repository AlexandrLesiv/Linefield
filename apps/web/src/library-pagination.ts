import type { library } from "../../vector-editor/src/saving/library.ts";
import type { Drawing } from "./model.ts";
/** Restartable pages tolerate durable removal slots without skipping shifted catalog rows. */
export async function nextDrawingPage(
  store: ReturnType<typeof library>,
  drawings: Drawing[],
  offset: number,
  locale: "en" | "uk",
) {
  for (;;) {
    const page = await store.list({ offset, locale });
    const fresh = page.drawings.filter(
      (entry) => !drawings.some((drawing) => drawing.id === entry.id),
    );
    if (fresh.length || page.nextOffset === null) return { ...page, drawings: fresh };
    offset = page.nextOffset;
  }
}
