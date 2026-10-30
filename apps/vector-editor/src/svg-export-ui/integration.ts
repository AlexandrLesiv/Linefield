import type { Core } from "../core";
import { checkedSvgExportCore } from "../svg-export-boundary";
import { SvgExportController } from "../svg-export";
import type { ExportDiagnostic } from "../svg-export/types";
import { installSvgExportUi } from ".";

/** Host event scheduling only; canonical gesture state remains owned by the editor. */
export function installSvgExport(
  core: Core,
  gestureActive: () => boolean,
  note: (event: ExportDiagnostic) => void,
) {
  const canvas = document.querySelector("canvas")!;
  let activityUntil = 0;
  const active = () => gestureActive() || performance.now() < activityUntil;
  let controller: SvgExportController | undefined;
  const getController = () => {
    controller ??= new SvgExportController(checkedSvgExportCore(core), {
      isInputActive: active,
      onDiagnostic: note,
      onProgress: (progress) => ui.progress(progress),
    });
    return controller;
  };
  const ui = installSvgExportUi({
    canStart: () => !active(),
    start: (options) => getController().start(options),
    cancel: () => controller?.cancel(),
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => controller?.setInputActive(active());
  const pointer = (event: PointerEvent) => {
    if (event.target === canvas && event.type === "pointerdown") {
      activityUntil = performance.now() + 50;
      controller?.setInputActive(true);
      clearTimeout(timer);
      timer = setTimeout(refresh, 60);
    }
    queueMicrotask(refresh);
  };
  const wheel = (event: WheelEvent) => {
    if (event.target !== canvas) return;
    activityUntil = performance.now() + 150;
    controller?.setInputActive(true);
    clearTimeout(timer);
    timer = setTimeout(refresh, 160);
  };
  const kinds = ["pointerdown", "pointerup", "pointercancel", "pointermove"] as const;
  for (const kind of kinds) document.addEventListener(kind, pointer, true);
  document.addEventListener("wheel", wheel, { capture: true, passive: true });
  const dispose = () => {
    clearTimeout(timer);
    for (const kind of kinds) document.removeEventListener(kind, pointer, true);
    document.removeEventListener("wheel", wheel, true);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", pageshow);
    ui.dispose();
    controller?.dispose();
  };
  const pagehide = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      dispose();
      return;
    }
    clearTimeout(timer);
    ui.suspend();
    controller?.dispose();
  };
  const pageshow = (event: PageTransitionEvent) => {
    if (event.persisted) refresh();
  };
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  return dispose;
}
