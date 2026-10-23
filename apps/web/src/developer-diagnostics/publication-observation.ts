import { publicationObservation } from "../memory/performance-observation.ts";
import type { ReplyValue } from "../memory/bridge.ts";
import type { Receipt } from "../memory/frame-receipt.ts";
import type { GpuRenderer } from "../memory/gpu-renderer.ts";
import { canonicalIdentity, diagnosticIdentity } from "./schema.ts";
import { diagnosticsStore, identity, isCurrent } from "./runtime-port.ts";
let previous = "";
/** Called only after a checked complete prefix replaces the displayed base. */
export function published(state: ReplyValue, renderer: GpuRenderer, receipt: Receipt): void {
  publicationObservation(state, renderer, receipt);
  try {
    if (!isCurrent(state)) return;
    const key = `${state.session}:${renderer.epoch}:${receipt.id}`;
    if (key === previous) return;
    previous = key;
    const parts = receipt.key.split(":");
    const sourceRevision = parts[0],
      sourceMapping = parts[1];
    const valid =
      parts.length === 2 &&
      sourceRevision !== undefined &&
      sourceMapping !== undefined &&
      canonicalIdentity(sourceRevision) &&
      canonicalIdentity(sourceMapping);
    const operation = diagnosticIdentity(receipt.id);
    const generation = diagnosticIdentity(BigInt(renderer.epoch));
    const sourceThrough = diagnosticIdentity(receipt.through);
    if (operation === undefined || generation === undefined || sourceThrough === undefined) return;
    diagnosticsStore.record({
      event: "frame.published",
      atMs: performance.now(),
      origin: "renderer",
      outcome: "completed",
      ...identity(state),
      operation,
      generation,
      sourceThrough,
      ...(valid ? { sourceRevision, sourceMapping } : {}),
    });
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
