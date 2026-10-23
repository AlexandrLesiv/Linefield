import type { PlacementSnapshot } from "#memory-bindings";
export function placementPhase(v: PlacementSnapshot) {
  return {
    code: v.code,
    available: v.available,
    disposition: v.disposition,
    miss: v.rasterMiss,
    epoch: v.rasterEpoch,
    offset: [v.offsetX, v.offsetY] as const,
    matrix: v.matrix,
  };
}
export class AnchorMiss extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super("anchor-miss");
    this.reason = reason;
  }
}
