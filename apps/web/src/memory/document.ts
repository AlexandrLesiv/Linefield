import { loadEngine } from "./loader.ts";
import type { ReplyValue, Bridge } from "./bridge.ts";
import { attachGpuDisplay } from "./gpu-display.ts";
import { createMemoryView } from "./view.ts";
import type { MemoryView } from "./view.ts";
import { diagnostic } from "./diagnostics.ts";
let owner = 0n;
let api: Bridge | undefined;
let current: ReplyValue | undefined;
let generation = 0;
let sequence = 0n;
let fatal = false;
let releaseDisplay: (() => void) | undefined;
export const temporaryFailed = () => fatal;
export const hasTemporary = () => owner !== 0n;
export function attachMemory(surface: HTMLElement): () => void {
  const attachment = ++generation;
  let attempt = 0;
  let view: MemoryView;
  const alive = () => generation === attachment;
  const fail = () => {
    fatal = true;
    view.status("fatal");
    diagnostic("display", "failed");
  };
  async function start(): Promise<void> {
    if (!alive()) return;
    if (fatal) {
      view.status("fatal");
      return;
    }
    releaseDisplay?.();
    releaseDisplay = undefined;
    if (fatal) {
      view.status("fatal");
      return;
    }
    const token = ++attempt;
    const valid = () => alive() && token === attempt && !fatal;
    view.status("loading");
    try {
      const engine = await loadEngine();
      if (!valid()) return;
      api = engine.bridge;
    } catch {
      if (valid()) view.status("loadFailed");
      return;
    }
    try {
      if (!api) return;
      if (!owner) {
        const created = api.create();
        if (created.code !== "ok") {
          fail();
          return;
        }
        owner = created.owner;
      }
      if (!current?.session) {
        current = api.enter(owner);
        sequence = 0n;
        if (current.code !== "ok" && current.code !== "noop") {
          fail();
          return;
        }
      }
    } catch {
      if (valid()) fail();
      return;
    }
    try {
      if (!valid() || !api || !current) return;
      const bridge = api;
      releaseDisplay = attachGpuDisplay(
        view,
        bridge,
        current,
        valid,
        () => ++sequence,
        (state) => {
          current = state;
        },
        fail,
      );
    } catch {
      if (valid()) view.status("loadFailed");
    }
  }
  view = createMemoryView(surface, () => void start());
  void start();
  return () => {
    if (!alive()) return;
    generation += 1;
    attempt += 1;
    if (api && current?.session && !fatal) {
      try {
        const result = api.leave(current);
        if (result.code === "ok") current = result;
        else fatal = true;
      } catch {
        fatal = true;
      }
    }
    releaseDisplay?.();
    releaseDisplay = undefined;
    view.dispose();
  };
}
window.addEventListener("pagehide", (event) => {
  // A bfcache suspension is not deliberate disposal; its DOM and page owner remain alive.
  if (event.persisted) return;
  generation += 1;
  releaseDisplay?.();
  releaseDisplay = undefined;
  if (api && owner && !fatal) {
    try {
      api.dispose(owner);
    } catch {
      fatal = true;
    }
  }
});
