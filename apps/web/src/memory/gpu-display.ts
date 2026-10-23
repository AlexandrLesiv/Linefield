import { DetailRetention } from "./detail-retention.ts";
import { retireScene } from "./scene-retirement.ts";
import { frames } from "./frame-bridge.ts";
import { runObservedCommand } from "./command-timing.ts";
import type { CommandTiming } from "./command-timing.ts";
import { editorHealthy } from "./editor-health.ts";
import { acknowledged, submitted } from "../developer-diagnostics/render-observation.ts";
import { diagnostic } from "./diagnostics.ts";
import type { Bridge, ReplyValue } from "./bridge.ts";
import type { MemoryView } from "./view.ts";
import { GpuRenderer } from "./gpu-renderer.ts";
import { ProgressiveScene } from "./progressive-scene.ts";
import { attachInput } from "./input.ts";
import { attachEditorControls } from "./editor-controls.ts";
import { reportResources } from "./resource-monitor.ts";
import * as retirement from "./gpu-retirement.ts";
export function attachGpuDisplay(
  view: MemoryView,
  api: Bridge,
  initial: ReplyValue,
  alive: () => boolean,
  nextSequence: () => bigint,
  update: (state: ReplyValue) => void,
  fatal: () => void,
) {
  retirement.retryGpuRetirement();
  let state = initial,
    frame = 0,
    stopped = false,
    lost = false,
    failed = false,
    size = "",
    automaticRetry = 0;
  let renderer: GpuRenderer | undefined;
  const detail = new DetailRetention(schedule);
  const accept = (next: ReplyValue) => {
    state = next;
    update(next);
    if (next.code === "ok" || next.code === "noop")
      detail.accept(next, () => api.mapping(next.owner, next.session));
    return next.code === "ok" || next.code === "noop";
  };
  let cache: ProgressiveScene | undefined;
  const valid = () => !stopped && alive();
  const retire = () => {
    retireScene(renderer, cache);
    cache = undefined;
    renderer = undefined;
    detail.reset();
  };
  const waitRetirement = () => {
    if (retirement.gpuRetirementPolling()) schedule();
  };
  const commands = {
    read: () => state,
    run(action: (s: ReplyValue) => ReplyValue, timing?: CommandTiming) {
      if (!valid() || lost || failed) return undefined;
      try {
        return runObservedCommand(
          () => action(state),
          accept,
          () => controls?.sync(),
          () => input?.sync(),
          schedule,
          timing,
        );
      } catch (error) {
        fatal();
        failDisplay(error);
        return undefined;
      }
    },
    view: () => api.mapping(state.owner, state.session),
    fail: () => {
      fatal();
      failDisplay(Error("editor-fatal"));
    },
  };
  let input: ReturnType<typeof attachInput> | undefined;
  let controls: ReturnType<typeof attachEditorControls> | undefined;
  const sync = () => {
    controls?.sync();
    input?.sync();
  };
  const report = () =>
    alive() && reportResources(api.read(state.owner), cache?.resources(), renderer);
  function schedule() {
    if (valid() && !lost && !failed && !frame) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (!valid() || lost || failed) return;
    try {
      if (!retirement.gpuAdmission()) return waitRetirement();
      const { clientWidth: width, clientHeight: height } = view.canvas;
      const backing = devicePixelRatio;
      const dimensions = `${width}:${height}:${backing}`;
      if (dimensions !== size || !renderer) {
        input?.cancel();
        retire();
        if (
          !width ||
          !height ||
          !accept(api.metrics(state, nextSequence(), width, height, backing))
        ) {
          accept(api.suspend(state, nextSequence()));
          view.status("sizeUnavailable");
          report();
          sync();
          return;
        }
        if (!retirement.gpuAdmission()) {
          report();
          sync();
          return waitRetirement();
        }
        sync();
        renderer = new GpuRenderer(view.canvas, width, height, backing);
        cache = new ProgressiveScene(() => state, renderer, schedule, failDisplay);
        size = dimensions;
      }
      if (!renderer.available()) return schedule();
      cache?.render(detail.current);
      const serial = renderer.check();
      submitted(state, renderer.epoch, serial, cache?.inputComplete ?? false);
      if (!cache?.ready) return;
      report();
      const receipt = cache?.acknowledgement;
      if (receipt && accept(frames.ready(state, receipt)) && accept(api.presented(state)))
        acknowledged(state, renderer.epoch, receipt, serial);
      view.status("ready");
      automaticRetry = 0;
      sync();
    } catch (error) {
      failDisplay(error);
    }
  }
  function failDisplay(error: unknown) {
    diagnostic("display", error instanceof Error ? error.message : "failed", state.session);
    if (!editorHealthy()) fatal();
    input?.cancel();
    try {
      retire();
      if (!valid()) return;
      accept(api.suspend(state, nextSequence()));
      sync();
    } catch {
      fatal();
      return;
    }
    view.status("resourceUnavailable");
    report();
    if (automaticRetry++ === 0) schedule();
    else failed = true;
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
      retire();
      accept(api.suspend(state, nextSequence()));
      sync();
    } catch {
      fatal();
    }
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
  const unwatch = retirement.watchGpuAdmission(schedule);
  schedule();
  return () => {
    input?.dispose();
    controls?.dispose();
    stopped = true;
    unwatch();
    retire();
    observer.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    view.canvas.removeEventListener("webglcontextlost", onLost);
    view.canvas.removeEventListener("webglcontextrestored", onRestored);
    report();
  };
}
