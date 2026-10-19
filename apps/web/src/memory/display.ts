import type { CanvasKit } from "canvaskit-wasm";
import type { Bridge, ReplyValue } from "./bridge.ts";
import type { MemoryView } from "./view.ts";
import { Presentation } from "./presentation.ts";
import { diagnostic } from "./diagnostics.ts";
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
  let frame = 0;
  let stopped = false;
  let lost = false;
  let size = "";
  const valid = () => !stopped && alive();
  function accept(next: ReplyValue): boolean {
    state = next;
    update(next);
    return next.code === "ok" || next.code === "noop";
  }
  function suspend(): void {
    if (!accept(api.suspend(state, nextSequence()))) throw Error("engine-unavailable");
  }
  function render(): void {
    frame = 0;
    if (!valid() || lost) return;
    const width = view.canvas.clientWidth;
    const height = view.canvas.clientHeight;
    const backing = devicePixelRatio;
    const nextSize = `${width}:${height}:${backing}`;
    if (presentation && nextSize === size) return;
    try {
      // Suspend before destroying/replacing any surface, even a same-size replacement.
      if (presentation) {
        suspend();
        presentation.dispose();
        presentation = undefined;
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
      const scene = api.scene(state);
      if (scene.code !== "ok" || scene.ids.length !== 0 || !scene.done)
        throw Error("engine-unavailable");
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
      presentation.render();
      if (!valid()) {
        presentation.dispose();
        presentation = undefined;
        return;
      }
      const metrics = presentation.stats();
      if (
        (metrics.canvasHeapBytes ?? 0) > 256 * 1024 * 1024 ||
        metrics.backingEstimateBytes > 96 * 1024 * 1024
      ) {
        diagnostic("display", "soft-target", state.session);
      }
    } catch {
      presentation?.dispose();
      presentation = undefined;
      try {
        suspend();
      } catch {
        fatal();
        return;
      }
      view.status("resourceUnavailable");
      diagnostic("display", "failed", state.session);
      return;
    }
    try {
      if (!accept(api.presented(state))) throw Error("engine-unavailable");
      size = nextSize;
      view.status("ready");
    } catch {
      fatal();
    }
  }
  function schedule(): void {
    if (valid() && !frame) frame = requestAnimationFrame(render);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(view.canvas);
  window.addEventListener("resize", schedule);
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
    presentation?.dispose();
    presentation = undefined;
    view.status("displayLost");
  };
  const restored = () => {
    if (!valid()) return;
    lost = false;
    schedule();
  };
  view.canvas.addEventListener("webglcontextlost", lostContext);
  view.canvas.addEventListener("webglcontextrestored", restored);
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
    observer.disconnect();
    window.removeEventListener("resize", schedule);
    view.canvas.removeEventListener("webglcontextlost", lostContext);
    view.canvas.removeEventListener("webglcontextrestored", restored);
    cancelAnimationFrame(frame);
    presentation?.dispose();
    presentation = undefined;
  };
}
