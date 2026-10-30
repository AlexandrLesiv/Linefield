import type { library } from "../../vector-editor/src/saving/library.ts";
import { savedDrawing, type Drawing } from "./model.ts";
import { t, locale } from "./locale.ts";
import { element, button } from "./dom.ts";

type Host = {
  store: ReturnType<typeof library>;
  gallery: HTMLElement;
  status: HTMLElement;
  blocked(): boolean;
  working(value: boolean): void;
  render(): void;
  open(drawing: Drawing, origin: HTMLElement, settled: () => void): Promise<void>;
  adopt(drawing: Drawing): void;
  finished(): void;
};

export function savedDrawingCreation(host: Host) {
  let pending: { id: string; locale: "en" | "uk" } | undefined;
  return async function create(origin: HTMLElement): Promise<void> {
    if (host.blocked()) return;
    host.working(true);
    host.gallery.inert = true;
    host.status.textContent = t("library.creating");
    pending ??= { id: crypto.randomUUID(), locale };
    try {
      const drawing = savedDrawing(await host.store.create(pending));
      pending = undefined;
      host.status.textContent = t("library.created");
      host.working(false);
      // Keep the clicked source and gallery layout until expansion settles. Adoption
      // runs before navigation releases its busy gate, including queued browser Back.
      await host.open(drawing, origin, () => host.adopt(drawing));
    } catch {
      const selector = origin.matches(".mobile-create") ? ".mobile-create" : ".new-tile";
      host.render();
      host.gallery.append(
        element("p", "", t("library.createFailed")),
        button(t("library.retry"), "", () => {
          const source = host.gallery.querySelector<HTMLElement>(selector);
          if (source) void create(source);
        }),
      );
    } finally {
      host.working(false);
      host.finished();
    }
  };
}
