import { edit } from "./edit-bridge.ts";
import { startCommandTiming } from "./command-timing.ts";
import { commandPhaseObservation } from "./performance-observation.ts";
import { localPoint } from "./input-state.ts";
import type { Commands, contactState } from "./input-state.ts";
export function inputBatch(
  canvas: HTMLCanvasElement,
  commands: Commands,
  owner: ReturnType<typeof contactState>,
) {
  return function append(events: readonly PointerEvent[], release = false) {
    for (let offset = 0; offset < events.length; offset += 256) {
      const timing = startCommandTiming();
      const contact = owner.current;
      if (!contact) return;
      const part = events.slice(offset, offset + 256),
        x = new Float64Array(part.length),
        y = new Float64Array(part.length),
        p = new Float64Array(part.length),
        flags = new Uint8Array(part.length);
      for (let i = 0; i < part.length; i++) {
        const event = part[i];
        if (!event) continue;
        const point = localPoint(canvas, event);
        x[i] = point[0];
        y[i] = point[1];
        p[i] = release ? contact.pressure : event.pointerType === "pen" ? event.pressure : 0;
        flags[i] = contact.source === "pen" ? 1 : 0;
        contact.x = event.clientX;
        contact.y = event.clientY;
        if (!release) contact.pressure = p[i] ?? 0;
      }
      if (timing) timing.acquisitionEnd = performance.now();
      const result = commands.run(
        () => edit.append(contact.token, contact.next, x, y, p, flags),
        timing,
      );
      if (result?.code !== "ok") {
        owner.release();
        if (timing && result) commandPhaseObservation(result, timing);
        return;
      }
      contact.token = result;
      contact.next += BigInt(part.length);
      if (timing) commandPhaseObservation(result, timing);
    }
  };
}
