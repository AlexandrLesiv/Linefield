import { cleanupFrame } from "./frame-cleanup.ts";
import { renderStep } from "./frame-render-step.ts";
import { copyRegion } from "./gpu-region-copy.ts";
import { area, type RegionRead } from "./gpu-regions.ts";
import { recipe, type Recipe } from "./frame-recipe.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { frames } from "./frame-bridge.ts";
import { FrameCommands, commandTurn, type FrameCommand } from "./frame-commands.ts";
import { batchObservation } from "./performance-observation.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { ReplyValue } from "./bridge.ts";
import type { ResidencyToken } from "./residency.ts";
import { cleanupSync } from "./cleanup-failure.ts";
export async function buildFrame(
  state: () => ReplyValue,
  prepared: PreparedCache,
  renderer: GpuRenderer,
  receipt: { id: bigint; through: bigint; recipe?: Recipe },
  detail: number,
  alive: () => boolean,
  signal: AbortSignal,
  extension?: { after: bigint; predecessor: bigint; issuing: () => void },
  region?: RegionRead,
  exact = false,
) {
  if (!alive()) return false;
  let cpu: ResidencyToken | undefined, gpu: ResidencyToken | undefined;
  let commands: FrameCommands | undefined;
  let accepted = false;
  let pending: FrameCommand | undefined;
  let step: ReturnType<typeof renderStep> | undefined;
  let validated = false,
    copyStarted = false;
  const uncertain = () => {
    if (copyStarted) region?.uncertain();
  };
  const submit = () => {
    try {
      return renderer.check();
    } catch (error) {
      uncertain();
      throw error;
    }
  };
  const provenance = (receipt.recipe ??= recipe(detail, renderer.epoch));
  const initialize = () => {
    renderer.begin(!extension && !region, region?.dirty);
    if (region) {
      copyStarted = true;
      copyRegion(renderer, region);
      metrics.panCopies++;
      metrics.panCopiedPixels += area(region.overlap);
      metrics.panDirtyPixels += region.dirty.reduce((sum, rect) => sum + area(rect), 0);
    }
    return region ? 1 : 0;
  };
  const cancel = () => commands?.stop();
  let initialized = false,
    serial = 0;
  try {
    cpu = prepared.begin();
    gpu = renderer.protect();
    commands = new FrameCommands(
      state,
      prepared,
      receipt.through,
      detail,
      receipt.id,
      extension?.after,
      extension?.predecessor,
      exact,
    );
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    // Preparation awaits happen BEFORE GPU admission. Only ready commands hold slots.
    while (pending || (await commands.ready())) {
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
          count += initialize();
          initialized = true;
        }
        while (count < 256) {
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
          pending ??= commands.take();
          if (!pending) {
            reason = filled;
            break;
          }
          step ??= renderStep(pending, renderer, state(), receipt.id, provenance, !!region);
          if (performance.now() >= budget.deadline) {
            reason = "deadline";
            break;
          }
          if (count + step.cost > 256) {
            reason = "cap";
            break;
          }
          if (pending.kind === "composite") extension?.issuing();
          if (pending.kind === "page") bytes += pending.page.data.byteLength;
          step.run();
          count += Math.max(1, step.cost);
          if (pending.kind === "page")
            cleanupSync(() => pending?.kind === "page" && pending.page.release?.());
          pending = undefined;
          step = undefined;
        }
      } finally {
        serial = submit();
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
      const waitStarted = performance.now();
      await renderer.slot();
      const started = performance.now();
      let count = 0;
      try {
        if (!alive()) return false;
        count = initialize();
      } finally {
        serial = submit();
        batchObservation(
          state(),
          receipt.id,
          serial,
          count,
          0,
          performance.now() - started,
          started - waitStarted,
          0,
          0,
          "done",
        );
      }
    }
    await renderer.validated(serial);
    validated = true;
    accepted = alive() && frames.transform(state(), receipt.id).code === "ok";
  } finally {
    signal.removeEventListener("abort", cancel);
    let credit = false;
    try {
      await cleanupFrame(pending, commands, renderer, serial, validated, uncertain);
      credit =
        accepted &&
        !extension &&
        !signal.aborted &&
        alive() &&
        frames.transform(state(), receipt.id).code === "ok";
    } finally {
      cleanupSync(() => {
        try {
          if (gpu) renderer.unprotect(gpu, credit);
        } finally {
          if (cpu) prepared.end(cpu, credit);
        }
      });
    }
  }
  return accepted && !signal.aborted && alive();
}
