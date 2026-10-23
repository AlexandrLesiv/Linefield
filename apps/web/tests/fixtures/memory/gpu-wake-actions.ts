import { loadEngine } from "../../../src/memory/loader.ts";
import { gpuWakeSlots } from "./gpu-wake-slots.ts";
import { gpuWakeLifecycle } from "./gpu-wake-lifecycle.ts";
import { gpuWakeDeadline } from "./gpu-wake-deadline.ts";
export function gpuWakeActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  for (const [name, run] of [
    ["slots", () => gpuWakeSlots(canvas, false)],
    ["reservation", () => gpuWakeSlots(canvas, true)],
    ["lifecycle", () => gpuWakeLifecycle(canvas)],
    ["deadline", () => gpuWakeDeadline(canvas)],
  ] satisfies [string, () => Promise<unknown>][])
    action(`Run GPU wake ${name}`, async () => {
      await loadEngine();
      return run();
    });
}
