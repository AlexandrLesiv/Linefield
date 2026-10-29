import type { Drawing } from "./model.ts";
import { drawingRoute, openRoute } from "./routes.ts";
interface Host {
  blocked(): boolean;
  active(): boolean;
  current(): string | null;
  close(): Promise<boolean>;
  find(id: string): Promise<Drawing | undefined>;
  open(drawing: Drawing): Promise<void>;
  refresh(): Promise<void>;
  missing(): void;
  failed(): void;
}
/** Drain route intents after asynchronous save/admission, always rereading the URL. */
export function libraryRoutes(host: Host) {
  let reconciling = false,
    pending = false;
  async function sync() {
    pending = true;
    if (reconciling || host.blocked()) return;
    reconciling = true;
    let returned = false;
    try {
      while (pending) {
        pending = false;
        const id = drawingRoute();
        if (host.active() && id === host.current()) continue;
        if (host.active()) {
          if (!(await host.close())) {
            const current = host.current();
            if (current) openRoute(current);
            pending = false;
            break;
          }
          returned = true;
          pending = true;
          continue;
        }
        if (!id) {
          if (returned) await host.refresh();
          continue;
        }
        const drawing = await host.find(id);
        if (drawingRoute() !== id) {
          pending = true;
          continue;
        }
        if (drawing) await host.open(drawing);
        else host.missing();
        if (drawingRoute() !== id) pending = true;
      }
    } catch {
      host.failed();
    } finally {
      reconciling = false;
    }
  }
  return {
    sync,
    resume: () => {
      if (pending) void sync();
    },
  };
}
