import { frames } from "./frame-bridge.ts";
import { FrameCommands, commandTurn } from "./frame-commands.ts";
import { batchObservation } from "./performance-observation.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { ReplyValue } from "./bridge.ts";
export async function buildFrame(
  state: () => ReplyValue,
  prepared: PreparedCache,
  renderer: GpuRenderer,
  receipt: { id: bigint; through: bigint },
  detail: number,
  alive: () => boolean,
  signal: AbortSignal,
  extension?: { after: bigint; predecessor: bigint; issuing: () => void },
) {
  if (!alive()) return false;
  prepared.begin();
  const commands = new FrameCommands(
    state,
    prepared,
    receipt.through,
    detail,
    receipt.id,
    extension?.after,
    extension?.predecessor,
  );
  const cancel = () => commands.stop();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  let initialized = false,
    serial = 0;
  try {
    // Preparation awaits happen BEFORE GPU admission. Only ready commands hold slots.
    while (await commands.ready()) {
      if (!alive()) return false;
      const slotStarted = performance.now();
      await renderer.slot();
      const started = performance.now(),
        slotWait = started - slotStarted;
      const budget = { deadline: started + 2, remaining: 1024 };
      let count = 0,
        bytes = 0,
        queued = 0,
        readyBytes = 0,
        reason = "cap";
      try {
        if (!alive()) return false;
        if (!initialized) {
          renderer.begin(!extension);
          initialized = true;
        }
        for (; count < 256; count++) {
          if (performance.now() >= budget.deadline) {
            reason = "deadline";
            break;
          }
          const filled = commands.fill(budget),
            snapshot = commands.snapshot();
          queued = Math.max(queued, snapshot.queued);
          readyBytes = Math.max(readyBytes, snapshot.bytes);
          if (filled === "budget") {
            reason = "deadline";
            break;
          }
          const command = commands.take();
          if (!command) {
            reason = filled;
            break;
          }
          if (command.kind === "group") renderer.group();
          else if (command.kind === "composite") {
            extension?.issuing();
            renderer.composite();
          } else
            try {
              bytes += command.page.data.byteLength;
              const p = frames.placement(state(), receipt.id, command.stroke, command.page.page);
              if (p.code !== "ok") throw Error(p.code);
              if (p.available)
                renderer.draw(command.page.data, p.matrix, command.color, command.page.page);
            } finally {
              command.page.release?.();
            }
        }
      } finally {
        serial = renderer.check();
        batchObservation(
          state(),
          receipt.id,
          serial,
          count,
          bytes,
          performance.now() - started,
          slotWait,
          queued,
          readyBytes,
          reason,
        );
      }
      // A genuine task turn prevents warm resolved producers/fences from monopolizing
      // the microtask queue. No GPU reservation survives this yield.
      await commandTurn();
    }
    if (!alive()) return false;
    if (!initialized) {
      await renderer.slot();
      try {
        if (!alive()) return false;
        renderer.begin(!extension);
      } finally {
        serial = renderer.check();
      }
    }
    await renderer.validated(serial);
    return alive() && frames.transform(state(), receipt.id).code === "ok";
  } finally {
    signal.removeEventListener("abort", cancel);
    await commands.dispose();
  }
}
