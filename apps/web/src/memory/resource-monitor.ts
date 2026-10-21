import type { StateValue } from "./bridge.ts";
type Geometry = { bytes: number; pages: number; streamOnly: boolean };
let highWater = 0;
let aboveTarget = false;
let current: ReturnType<typeof totals> | undefined;
function totals(s: StateValue, geometry: Geometry, wasm: number, width: number, height: number) {
  highWater = Math.max(highWater, wasm);
  const pixels = width * height;
  const buffers = pixels ? 2 * 4096 * 32 : 0;
  return {
    canonical: s.canonicalCharge,
    historyExclusive: s.historyCharge,
    rustDerived: s.derivedCharge,
    rustOverhead: s.cpuCharge - s.canonicalCharge - s.historyCharge - s.derivedCharge,
    wasmHighWater: highWater,
    hostGeometry: geometry.bytes,
    geometryPages: geometry.pages,
    streamOnly: geometry.streamOnly,
    gpuStreamingBuffers: buffers,
    gpuMask: pixels * 4,
    gpuStaging: pixels * 4,
    worker: 0,
    material: 0,
    // Driver/default framebuffer estimates are separate from owned GL allocations.
    driverFramebufferEstimate: pixels * 4,
    // Linear memory already contains Rust allocations; never add those charges twice.
    ownedCpu: wasm + geometry.bytes,
    ownedGpu: pixels * 8 + buffers,
  };
}
export function observeResources(
  state: StateValue,
  geometry: Geometry,
  wasm: number,
  width: number,
  height: number,
) {
  current = totals(state, geometry, wasm, width, height);
  const above = current.ownedCpu > 320 * 1024 ** 2 || current.ownedGpu > 384 * 1024 ** 2;
  const crossed = above && !aboveTarget;
  aboveTarget = above;
  return crossed;
}
// One overwritten metadata snapshot, not a per-frame/per-sample log or document quota.
export const resourceSnapshot = () => (current ? { ...current } : undefined);
