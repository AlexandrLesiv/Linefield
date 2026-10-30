import type { Core } from "./core";
import { createSaveStatus } from "./save-status";

type Saving = {
  changed(): void;
  flush(exit?: boolean): Promise<unknown>;
  retry(): Promise<unknown>;
  state(): { phase: string; error?: string };
};
/** Host lifecycle only: never synthesize a pointer release or commit a gesture. */
export function saveLifecycle(
  core: Core & { delta_revision(): bigint; delta_durable(): bigint },
  saving: Saving,
  ui: ReturnType<typeof createSaveStatus>,
  active: () => boolean,
  canvas: HTMLCanvasElement,
) {
  let leaving = false,
    generation = 0,
    observed = core.delta_revision();
  let waiters: (() => void)[] = [];
  const unsaved = () =>
    active() || saving.state().phase === "error" || core.delta_revision() !== core.delta_durable();
  const cancel = () => {
    generation++;
    leaving = false;
    waiters.splice(0).forEach((resolve) => resolve());
    canvas.focus({ preventScroll: true });
    update();
  };
  const save = async () => {
    try {
      if (saving.state().phase === "error") await saving.retry();
      else await saving.flush(true);
      if (!unsaved()) ui.announceSaved();
    } catch {
      /* The adapter owns the persistent failure state. */
    }
    update();
  };
  function state() {
    const adapter = saving.state();
    return {
      phase:
        adapter.phase === "error" || adapter.phase === "saving"
          ? adapter.phase
          : unsaved()
            ? "pending"
            : "saved",
      error: adapter.error,
      adapterPhase: adapter.phase,
      active: active(),
      hasUnsaved: unsaved(),
    };
  }
  function update() {
    if (leaving) {
      ui.set(active() ? "waitStroke" : "leaving", undefined, cancel);
      return;
    }
    const current = state();
    const phase = current.phase;
    ui.set(
      phase === "error"
        ? current.error?.includes("capacity")
          ? "capacity"
          : "failed"
        : phase === "saving"
          ? "saving"
          : unsaved()
            ? "pending"
            : "saved",
      () => void save(),
    );
  }
  function tick() {
    const revision = core.delta_revision();
    if (revision !== observed) {
      observed = revision;
      saving.changed();
    }
    if (!active()) waiters.splice(0).forEach((resolve) => resolve());
    update();
  }
  // Prevent new commands while a controlled exit is pending; continue delivering the
  // current gesture's move/up events. The Stay action is always available.
  for (const kind of ["click", "keydown"] as const)
    document.addEventListener(
      kind,
      (event) => {
        if (!leaving || (event.target as Element)?.closest("#save-stay")) return;
        if (event instanceof KeyboardEvent && event.key === "Tab") return;
        if (event instanceof KeyboardEvent && event.key === "Escape") {
          event.preventDefault();
          cancel();
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      true,
    );
  window.addEventListener("beforeunload", (event) => {
    if (unsaved()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void saving.flush(true).catch(() => {});
  });
  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  });
  return {
    tick,
    update,
    state,
    hasUnsaved: unsaved,
    get leaving() {
      return leaving;
    },
    async requestLeave() {
      if (leaving) return false;
      leaving = true;
      const token = ++generation;
      update();
      if (active()) await new Promise<void>((resolve) => waiters.push(resolve));
      if (token !== generation) return false;
      try {
        do {
          await saving.flush(true);
          if (token !== generation) return false;
          if (active()) await new Promise<void>((resolve) => waiters.push(resolve));
          if (token !== generation) return false;
        } while (unsaved());
        leaving = false;
        update();
        return true;
      } catch {
        if (token === generation) {
          leaving = false;
          update();
        }
        return false;
      }
    },
  };
}
