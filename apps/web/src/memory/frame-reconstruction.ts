import { frames } from "./frame-bridge.ts";
import { buildFrame } from "./frame-builder.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { retirementObservation } from "./performance-observation.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { Receipt } from "./frame-promotion.ts";

export class FrameCandidate {
  readonly id: bigint;
  readonly through: bigint;
  readonly key: string;
  readonly lifetime = new AbortController();
  constructor(state: ReplyValue) {
    const captured = frames.capture(state);
    if (captured.code !== "ok") throw Error(captured.code);
    this.id = captured.id;
    this.through = captured.through;
    this.key = captured.key;
  }
  validate(state: ReplyValue, prepared: PreparedCache) {
    if (!this.lifetime.signal.aborted && frames.transform(state, this.id).code !== "ok")
      this.cancel(prepared);
  }
  cancel(prepared: PreparedCache) {
    if (this.lifetime.signal.aborted) return;
    this.lifetime.abort();
    prepared.cancel();
  }
}

export async function reconstructFrame(
  state: () => ReplyValue,
  prepared: PreparedCache,
  renderer: GpuRenderer,
  receipt: FrameCandidate,
  detail: number,
  callbacks: {
    initialize: () => Promise<void>;
    alive: () => boolean;
    publish: (receipt: Receipt) => void;
  },
) {
  let published = false;
  const alive = () => callbacks.alive() && !receipt.lifetime.signal.aborted;
  try {
    await callbacks.initialize();
    if (!alive()) return;
    if (
      !(await buildFrame(
        state,
        prepared,
        renderer,
        receipt,
        detail,
        alive,
        receipt.lifetime.signal,
      ))
    )
      return;
    renderer.promote();
    callbacks.publish(receipt);
    published = true;
  } catch (error) {
    if (
      error instanceof Error &&
      ["stale-scene", "stale-mapping", "disposed"].includes(error.message)
    )
      metrics.stale++;
    else throw error;
  } finally {
    if (!published) frames.release(state(), receipt.id);
    retirementObservation(state(), receipt.id, receipt.lifetime.signal.aborted);
  }
}
