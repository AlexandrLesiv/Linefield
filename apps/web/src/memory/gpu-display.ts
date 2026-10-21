import { diagnostic } from "./diagnostics.ts";
import type { Bridge, ReplyValue } from "./bridge.ts";
import type { MemoryView } from "./view.ts";
import { GpuRenderer } from "./gpu-renderer.ts";
import { GeometryPages } from "./geometry-pages.ts";
import { scene } from "./scene-bridge.ts";
import { attachInput } from "./input.ts";
import { attachEditorControls } from "./editor-controls.ts";
import { observeResources } from "./resource-monitor.ts";
import { wasmBytes } from "./loader.ts";
export function attachGpuDisplay(
  view: MemoryView,
  api: Bridge,
  initial: ReplyValue,
  alive: () => boolean,
  nextSequence: () => bigint,
  update: (state: ReplyValue) => void,
  fatal: () => void,
) {
  let state = initial,
    frame = 0,
    stopped = false,
    lost = false,
    failed = false,
    size = "",
    automaticRetry = 0;
  let renderer: GpuRenderer | undefined;
  const accept = (next: ReplyValue) => {
    state = next;
    update(next);
    return next.code === "ok" || next.code === "noop";
  };
  const cache = new GeometryPages(() => state);
  const valid = () => !stopped && alive();
  const commands = {
    read: () => state,
    run(action: (s: ReplyValue) => ReplyValue) {
      if (!valid() || lost || failed) return undefined;
      try {
        const result = action(state);
        accept(result);
        controls?.sync();
        input?.sync();
        schedule();
        return result;
      } catch {
        fatal();
        return undefined;
      }
    },
    view: () => api.mapping(state.owner, state.session),
    fail: fatal,
  };
  let input: ReturnType<typeof attachInput> | undefined;
  let controls: ReturnType<typeof attachEditorControls> | undefined;
  const report = () => {
    if (
      observeResources(
        api.read(state.owner),
        cache.resources(),
        wasmBytes(),
        renderer?.width ?? 0,
        renderer?.height ?? 0,
      )
    )
      diagnostic("display", "soft-target", state.session);
  };
  function schedule() {
    if (valid() && !lost && !failed && !frame) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (!valid() || lost || failed) return;
    try {
      const width = view.canvas.clientWidth,
        height = view.canvas.clientHeight,
        backing = devicePixelRatio;
      const dimensions = `${width}:${height}:${backing}`;
      if (dimensions !== size || !renderer) {
        input?.cancel();
        cache.dispose();
        renderer?.dispose();
        renderer = undefined;
        if (
          !width ||
          !height ||
          !accept(api.metrics(state, nextSequence(), width, height, backing))
        ) {
          accept(api.suspend(state, nextSequence()));
          view.status("sizeUnavailable");
          report();
          controls?.sync();
          input?.sync();
          return;
        }
        renderer = new GpuRenderer(
          view.canvas,
          Math.ceil(width * backing),
          Math.ceil(height * backing),
        );
        size = dimensions;
      }
      const mapping = api.mapping(state.owner, state.session);
      const detail = 2 ** Math.ceil(Math.log2(mapping.zoom * backing));
      cache.begin();
      renderer.begin();
      let after = 0n;
      for (;;) {
        const ids = scene.ids(state, after);
        if (ids.code !== "ok") throw Error(ids.code);
        for (const id of ids.ids) {
          const stroke = scene.stroke(state, id);
          if (stroke.code !== "ok") throw Error(stroke.code);
          renderer.group();
          for (const page of cache.read(id, stroke.count, detail)) {
            const placement = scene.placement(state, id, page.page);
            if (placement.code !== "ok") throw Error(placement.code);
            if (placement.available) renderer.draw(page.data, placement.matrix, stroke.color);
          }
          renderer.composite();
          after = id;
        }
        if (ids.done) break;
      }
      renderer.publish();
      cache.finish();
      report();
      accept(api.presented(state));
      view.status("ready");
      automaticRetry = 0;
      controls?.sync();
      input?.sync();
    } catch (error) {
      diagnostic("display", error instanceof Error ? error.message : "failed", state.session);
      input?.cancel();
      renderer?.dispose();
      renderer = undefined;
      try {
        cache.reduce();
        accept(api.suspend(state, nextSequence()));
      } catch {
        fatal();
        return;
      }
      view.status("resourceUnavailable");
      report();
      if (automaticRetry++ === 0) schedule();
      else failed = true;
    }
  }
  input = attachInput(view.canvas, commands);
  controls = attachEditorControls(view.canvas, commands, api);
  const observer = new ResizeObserver(schedule);
  observer.observe(view.canvas);
  const onLost = (e: Event) => {
    e.preventDefault();
    if (!valid()) return;
    input?.cancel();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    try {
      cache.dispose();
      accept(api.suspend(state, nextSequence()));
    } catch {
      fatal();
    }
    renderer?.dispose();
    renderer = undefined;
    report();
    view.status("displayLost");
  };
  const onRestored = () => {
    lost = false;
    automaticRetry = 0;
    schedule();
  };
  view.canvas.addEventListener("webglcontextlost", onLost);
  view.canvas.addEventListener("webglcontextrestored", onRestored);
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    input?.dispose();
    controls?.dispose();
    try {
      cache.dispose();
    } catch {
      /* Session may already have left; derived descriptors retire with it. */
    }
    stopped = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    view.canvas.removeEventListener("webglcontextlost", onLost);
    view.canvas.removeEventListener("webglcontextrestored", onRestored);
    renderer?.dispose();
    renderer = undefined;
    report();
  };
}
