import { loadEngine } from "../../../src/memory/loader.ts";
import { gpuWakeSlots } from "./gpu-wake-slots.ts";
import { gpuWakeLifecycle } from "./gpu-wake-lifecycle.ts";
import { gpuWakeDeadline } from "./gpu-wake-deadline.ts";
import { gpuWakeProgress } from "./gpu-wake-progress.ts";
export function gpuWakeActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  for (const [name, run] of [
    ["slots", () => gpuWakeSlots(canvas, false)],
    ["reservation", () => gpuWakeSlots(canvas, true)],
    ["lifecycle", () => gpuWakeLifecycle(canvas)],
    ["deadline", () => gpuWakeDeadline(canvas)],
    ["progress", () => gpuWakeProgress(canvas, "visible")],
    ["progress hidden", () => gpuWakeProgress(canvas, "hidden")],
    ["progress retire", () => gpuWakeProgress(canvas, "retire")],
  ] satisfies [string, () => Promise<unknown>][])
    action(`Run GPU wake ${name}`, async () => {
      await loadEngine();
      return run();
    });
}
