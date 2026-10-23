import { frameReuse } from "./frame-reuse.ts";
import { framePanReuse } from "./frame-pan-reuse.ts";
import { eligible, recipe } from "./frame-recipe.ts";
import { regionCopy } from "./gpu-regions.ts";
import { copyPrefix } from "./gpu-seed.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { Seed } from "./candidate-build.ts";
import type { ReceiptLease } from "./receipt-lease.ts";
import type { Receipt } from "./frame-receipt.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { CandidatePolicy } from "./candidate-policy.ts";
export function candidateSeed(
  state: ReplyValue,
  renderer: GpuRenderer,
  source: ReceiptLease,
  next: Receipt,
  detail: number,
  policy: CandidatePolicy,
): { seed: Seed; predecessor?: Receipt } | undefined {
  metrics.prefixSeedAttempts++;
  const reuse = frameReuse(state, source.receipt.id, next.id);
  if (reuse.code !== "ok") throw Error(reuse.code);
  if (reuse.reusable) {
    next.recipe = recipe(detail, renderer.epoch, source.receipt.recipe);
    if (!source.receipt.recipe) next.recipe.eligible = false;
    return {
      predecessor: source.receipt,
      seed: {
        release: source.borrow(),
        copy: () => {
          copyPrefix(renderer);
          metrics.prefixSeedCopies++;
          metrics.prefixSeedPixels += renderer.width * renderer.height;
          metrics.prefixSeedSkippedSources += Number(reuse.sourceCount);
        },
      },
    };
  }
  if (reuse.missReason === "view") metrics.prefixSeedViewMisses++;
  else if (reuse.missReason === "same-prefix") metrics.prefixSeedSameMisses++;
  else metrics.prefixSeedCountMisses++;
  metrics.panAttempts++;
  if (!renderer.resources.integerQuad) {
    metrics.panCapabilityMisses++;
    return;
  }
  if (!renderer.resources.baseReusable) {
    metrics.panRangeMisses++;
    return;
  }
  if (!eligible(source.receipt.recipe, detail, renderer.epoch)) {
    metrics.panRecipeMisses++;
    policy.preferExact(state);
    return;
  }
  const pan = framePanReuse(state, source.receipt.id, next.id);
  if (pan.code !== "ok") throw Error(pan.code);
  if (!pan.reusable) {
    metrics.panPhaseMisses++;
    return;
  }
  const region = regionCopy(renderer.width, renderer.height, pan.shift);
  if (!region) {
    metrics.panRangeMisses++;
    return;
  }
  const value = recipe(detail, renderer.epoch, source.receipt.recipe);
  value.epoch = pan.epoch;
  value.offset = [value.offset[0] + pan.shift[0], value.offset[1] + pan.shift[1]];
  next.recipe = value; // Rebase only after the typed integer-copy certificate succeeds.
  const image = renderer.resources.base.texture,
    generation = renderer.resources.baseGeneration;
  const release = source.borrow();
  let transferred = false;
  return {
    seed: {
      release: () => {
        if (!transferred) release();
      },
      region: {
        ...region,
        uncertain: () => {
          source.defer(renderer.resources.copyReader, release);
          transferred = true;
        },
        valid: () =>
          renderer.resources.baseReusable &&
          renderer.resources.base.texture === image &&
          renderer.resources.baseGeneration === generation,
      },
    },
  };
}
