import { frames } from "./frame-bridge.ts";
import { buildFrame } from "./frame-builder.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { coverageObservation } from "./coverage-observation.ts";
import { CleanupFailure, finishCleanup, cleanupRelease } from "./cleanup-failure.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { Receipt } from "./frame-receipt.ts";
export type Seed = { copy: () => void; release: () => void };
type Work = {
  owner: { receipt: Receipt | undefined; ready: boolean; sealed: boolean };
  state: () => ReplyValue;
  prepared: PreparedCache;
  renderer: GpuRenderer;
  next: Receipt;
  detail: number;
  signal: AbortSignal;
  alive: () => boolean;
  retain: () => boolean;
  settled: () => void;
  predecessor: Receipt | undefined;
  seed: Seed | undefined;
};
export async function buildCandidate(w: Work) {
  const { owner, state, next, predecessor, seed } = w;
  let accepted = false,
    issued = false;
  let cleanupFailure: CleanupFailure | undefined;
  try {
    if (seed) {
      issued = true;
      seed.copy();
    }
    accepted = await buildFrame(
      state,
      w.prepared,
      w.renderer,
      next,
      w.detail,
      w.alive,
      w.signal,
      predecessor
        ? {
            after: predecessor.through,
            predecessor: predecessor.id,
            issuing: () => (issued = true),
          }
        : undefined,
    );
    accepted = accepted && w.alive();
    if (accepted) {
      if (predecessor && !seed) cleanupRelease(() => frames.release(state(), predecessor.id));
      owner.receipt = next;
      owner.ready = true;
      if (seed) metrics.prefixSeedCompleted++;
    }
  } catch (error) {
    if (error instanceof CleanupFailure) cleanupFailure = error;
    if (
      error instanceof CleanupFailure ||
      !(
        error instanceof Error &&
        ["stale-scene", "stale-mapping", "disposed"].includes(error.message)
      )
    )
      throw error;
    metrics.stale++;
  } finally {
    finishCleanup(
      () => {
        finishCleanup(
          () => {
            if (!accepted)
              finishCleanup(
                () => cleanupRelease(() => frames.release(state(), next.id)),
                () => {
                  const retain =
                    !seed &&
                    predecessor &&
                    !issued &&
                    w.retain() &&
                    frames.transform(state(), predecessor.id).code === "ok";
                  if (predecessor && !seed && !retain)
                    cleanupRelease(() => frames.release(state(), predecessor.id));
                  owner.receipt = retain ? predecessor : undefined;
                  owner.ready = !!retain;
                  owner.sealed = false;
                  if (predecessor)
                    coverageObservation(
                      state(),
                      retain ? "extension-retain" : "extension-discard",
                      next.id,
                    );
                },
              );
          },
          () => {
            seed?.release();
          },
        );
      },
      w.settled,
      cleanupFailure,
    );
  }
}
