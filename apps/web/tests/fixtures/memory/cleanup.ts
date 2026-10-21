import type { CanvasKit } from "canvaskit-wasm";
import { Presentation } from "./canvaskit/presentation.ts";
export function cleanupFailure(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const display = new Presentation(kit, canvas, 1024, 768);
  display.render();
  const staging = display.owner.staging;
  if (!staging) throw Error("missing fixture surface");
  const original = staging.delete.bind(staging);
  let attempts = 0;
  staging.delete = () => {
    attempts += 1;
    original();
    throw Error("fixture-delete-uncertain");
  };
  display.dispose();
  const first = display.stats();
  display.dispose();
  const second = display.stats();
  if (
    attempts !== 1 ||
    first.deletionFailures !== 1 ||
    first.live.surface !== 1 ||
    first.live.context !== 0 ||
    first.live.image !== 0 ||
    display.owner.handle !== null ||
    JSON.stringify(first) !== JSON.stringify(second)
  )
    throw Error("best-effort cleanup accounting");
  return {
    attempts,
    first,
    physicalRelease:
      "injected exception after native deletion; counter deliberately remains uncertain",
  };
}
