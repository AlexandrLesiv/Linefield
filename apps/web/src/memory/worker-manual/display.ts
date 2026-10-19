import { EngineBoundaryError, type Bridge, type ReplyValue } from "../bridge.ts";
import { editorCommands } from "../commands.ts";
import { observeSurface, surfaceMetrics, surfaceIsCurrent } from "../surface-events.ts";
import type { MemoryView } from "../view.ts";
import { WorkerRenderer } from "./renderer.ts";
import { attachEditorAdapters } from "../editor-adapters.ts";
import { DisplayHealth } from "../display-health.ts";
export function attachDisplay(
  view: MemoryView,
  api: Bridge,
  initial: ReplyValue,
  alive: () => boolean,
  nextSequence: () => bigint,
  update: (state: ReplyValue) => void,
  fatal: () => void,
): () => void {
  let state = initial;
  let renderer: WorkerRenderer | undefined;
  let frame = 0;
  let stopped = false;
  let size = "";
  let running = false;
  let dirty = false;
  let adapters: ReturnType<typeof attachEditorAdapters> | undefined;
  const valid = () => !stopped && alive();
  function accept(next: ReplyValue): boolean {
    const previous = state;
    state = next;
    try {
      renderer?.changed(previous, next);
    } catch (error: unknown) {
      if (error instanceof EngineBoundaryError) fatal();
      else failure();
      return false;
    }
    view.command(previous, next);
    update(next);
    adapters?.refresh();
    return next.code === "ok" || next.code === "noop";
  }
  function suspend(): void {
    if (!accept(api.suspend(state, nextSequence()))) throw Error("engine-unavailable");
  }
  function destroy(): void {
    renderer?.dispose();
    renderer = undefined;
  }
  const health = new DisplayHealth({
    valid,
    suspend,
    destroy,
    view,
    fatal,
    schedule,
    session: () => state.session,
    cancelFrames() {
      dirty = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
  });
  const failure = health.failure;
  function schedule(): void {
    dirty = true;
    if (valid() && !frame && !running && !health.lost && !health.failed)
      frame = requestAnimationFrame(() => void render());
  }
  async function render(): Promise<void> {
    frame = 0;
    if (!valid() || health.lost || health.failed || view.surface.dataset.entryReady !== "true")
      return;
    running = true;
    dirty = false;
    try {
      const { width, height, backing, key: nextSize } = surfaceMetrics(view.canvas);
      if (!renderer || nextSize !== size) {
        try {
          if (renderer) {
            suspend();
            destroy();
          }
          if (width === 0 || height === 0) {
            suspend();
            view.status("sizeUnavailable");
            return;
          }
          if (!accept(api.metrics(state, nextSequence(), width, height, backing))) {
            view.status("sizeUnavailable");
            return;
          }
        } catch {
          fatal();
          return;
        }
        view.status("loading");
        try {
          renderer = new WorkerRenderer(
            view.canvas,
            Math.ceil(width * backing),
            Math.ceil(height * backing),
            backing,
            () => {
              if (valid()) failure();
            },
          );
          size = nextSize;
        } catch {
          failure();
          return;
        }
      }
      const currentRenderer = renderer;
      if (!currentRenderer) return;
      try {
        await currentRenderer.render(
          () => state,
          () => valid() && renderer === currentRenderer,
          (shown) => {
            if (!valid() || renderer !== currentRenderer) return false;
            if (shown.content !== state.content || shown.mapping !== state.mapping) {
              schedule();
              return false;
            }
            try {
              if (!accept(api.presented(shown))) throw Error("engine-unavailable");
              view.status("ready");
              return true;
            } catch {
              fatal();
              return false;
            }
          },
        );
      } catch (error: unknown) {
        if (valid() && renderer === currentRenderer) {
          if (error instanceof EngineBoundaryError) fatal();
          else failure();
        }
      }
    } catch {
      fatal();
    } finally {
      running = false;
      if (dirty && valid()) schedule();
    }
  }
  const commands = editorCommands({
    read: () => state,
    valid: () =>
      valid() && !health.lost && !health.failed && surfaceIsCurrent(view.canvas, size, remap),
    accept,
    cancelled: () => {},
    changed: schedule,
    fatal,
  });
  adapters = attachEditorAdapters(view, commands);
  const remap = () => {
    if (!valid()) return;
    const measured = surfaceMetrics(view.canvas).key;
    if (renderer && measured !== size) {
      try {
        suspend();
      } catch {
        fatal();
        return;
      }
      destroy();
      view.status("loading");
    }
    schedule();
  };
  const stopObserving = observeSurface(view.canvas, remap, health);
  view.surface.addEventListener("memory-entry-ready", schedule);
  schedule();
  return () => {
    if (valid()) {
      try {
        suspend();
      } catch {
        fatal();
      }
    }
    stopped = true;
    adapters?.dispose();
    stopObserving();
    view.surface.removeEventListener("memory-entry-ready", schedule);
    cancelAnimationFrame(frame);
    destroy();
  };
}
