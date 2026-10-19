import { EngineBoundaryError } from "./bridge.ts";
import { editorCommands } from "./commands.ts";
import { observeSurface, surfaceMetrics, surfaceIsCurrent } from "./surface-events.ts";
import type { CanvasKit } from "canvaskit-wasm";
import type { Bridge, ReplyValue } from "./bridge.ts";
import type { MemoryView } from "./view.ts";
import { Presentation } from "./presentation.ts";
import { SceneRenderer } from "./scene-renderer.ts";
import { attachPenInput } from "./pen-input.ts";
import { attachEditorControls } from "./editor-controls.ts";
import { recoverDisplay } from "./display-failure.ts";
import { observePointerLifecycle } from "./pointer-diagnostics.ts";
export function attachDisplay(
  kit: CanvasKit,
  view: MemoryView,
  api: Bridge,
  initial: ReplyValue,
  alive: () => boolean,
  nextSequence: () => bigint,
  update: (state: ReplyValue) => void,
  fatal: () => void,
): () => void {
  let state = initial;
  let presentation: Presentation | undefined;
  let renderer: SceneRenderer | undefined;
  let frame = 0;
  let stopped = false;
  let lost = false;
  let size = "";
  let running = false;
  let dirty = false;
  let input: ReturnType<typeof attachPenInput> | undefined;
  let controls: ReturnType<typeof attachEditorControls> | undefined;
  const valid = () => !stopped && alive();
  function accept(next: ReplyValue): boolean {
    view.command(state, next);
    state = next;
    update(next);
    input?.sync();
    controls?.refresh();
    return next.code === "ok" || next.code === "noop";
  }
  function suspend(): void {
    if (!accept(api.suspend(state, nextSequence()))) throw Error("engine-unavailable");
  }
  function destroy(): void {
    renderer?.dispose();
    renderer = undefined;
    presentation?.dispose();
    presentation = undefined;
  }
  const failure = () => recoverDisplay(suspend, destroy, view, state.session, fatal);
  function schedule(): void {
    dirty = true;
    if (valid() && !frame && !running && !lost) frame = requestAnimationFrame(() => void render());
  }
  async function render(): Promise<void> {
    frame = 0;
    if (!valid() || lost || view.surface.dataset.entryReady !== "true") return;
    running = true;
    dirty = false;
    try {
      const { width, height, backing, key: nextSize } = surfaceMetrics(view.canvas);
      if (!presentation || nextSize !== size) {
        try {
          if (presentation) {
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
          presentation = new Presentation(
            kit,
            view.canvas,
            Math.ceil(width * backing),
            Math.ceil(height * backing),
          );
          renderer = new SceneRenderer(kit, presentation);
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
            if (!valid() || renderer !== currentRenderer) return;
            try {
              if (!accept(api.presented(shown))) throw Error("engine-unavailable");
              view.status("ready");
            } catch {
              fatal();
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
    valid: () => valid() && !lost && surfaceIsCurrent(view.canvas, size, remap),
    accept,
    cancelled: () => {
      try {
        renderer?.restore();
      } catch {
        failure();
      }
    },
    changed: schedule,
    fatal,
  });
  input = attachPenInput(view.canvas, commands);
  const stopPointerTrace = observePointerLifecycle(view.canvas, () => state);
  controls = attachEditorControls(view.surface, commands);
  const remap = () => {
    if (!valid()) return;
    const measured = surfaceMetrics(view.canvas).key;
    if (presentation && measured !== size) {
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
  const lostContext = (event: Event) => {
    event.preventDefault();
    if (!valid() || lost) return;
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    try {
      suspend();
    } catch {
      fatal();
      return;
    }
    destroy();
    view.status("displayLost");
  };
  const restored = () => {
    if (valid()) {
      lost = false;
      schedule();
    }
  };
  const stopObserving = observeSurface(view.canvas, remap, lostContext, restored);
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
    input?.dispose();
    stopPointerTrace();
    controls?.dispose();
    stopObserving();
    view.surface.removeEventListener("memory-entry-ready", schedule);
    cancelAnimationFrame(frame);
    destroy();
  };
}
