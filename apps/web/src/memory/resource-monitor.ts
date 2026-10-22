import { geometryMetrics as m } from "./geometry-metrics.ts";
import { preparationHeap } from "./preparation-loader.ts";
import type { StateValue } from "./bridge.ts";
import { wasmBytes } from "./loader.ts";
import { diagnostic } from "./diagnostics.ts";
import { retiringGpuBytes } from "./gpu-retirement.ts";
type Geometry = { bytes: number; pages: number; streamOnly: boolean };
let highWater = 0;
let aboveTarget = false;
let current: ReturnType<typeof totals> | undefined;
function totals(
  s: StateValue,
  geometry: Geometry,
  wasm: number,
  width: number,
  height: number,
  packed = false,
) {
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
    gpuScratch: pixels * (packed ? 4 : 3),
    gpuStaging: pixels * (packed ? 4 : 3),
    gpuBase: pixels * (packed ? 4 : 3),
    gpuTargetBytes: pixels * (packed ? 16 : 13),
    gpuRetiring: retiringGpuBytes(),
    gpuGeometryLimit: Math.min(128 * 1024 ** 2, 192 * 1024 ** 2 - pixels * (packed ? 16 : 13)),
    gpuGeometryCapacity: m.gpuAllocated,
    gpuGeometryLive: m.gpuLive,
    gpuGeometryFree: m.gpuFree,
    worker: m.workerHeap,
    mainPreparation: preparationHeap(),
    preparationCopies: m.preparationCopies + m.readyBytes,
    visibilityCopies: m.visibilityBytes,
    material: 0,
    // Driver/default framebuffer estimates are separate from owned GL allocations.
    driverFramebufferEstimate: pixels * 4,
    driverFormatPaddingEstimate: pixels * 8,
    // Linear memory already contains Rust allocations; never add those charges twice.
    ownedCpu:
      wasm +
      geometry.bytes +
      m.workerHeap +
      preparationHeap() +
      m.preparationCopies +
      m.readyBytes +
      m.visibilityBytes,
    ownedGpu: pixels ? pixels * (packed ? 16 : 13) + buffers + m.gpuAllocated : retiringGpuBytes(),
  };
}
export function observeResources(
  state: StateValue,
  geometry: Geometry,
  wasm: number,
  width: number,
  height: number,
  packed = false,
) {
  current = totals(state, geometry, wasm, width, height, packed);
  const above = current.ownedCpu > 320 * 1024 ** 2 || current.ownedGpu > 384 * 1024 ** 2;
  const crossed = above && !aboveTarget;
  aboveTarget = above;
  return crossed;
}
// One overwritten metadata snapshot, not a per-frame/per-sample log or document quota.
export const resourceSnapshot = () => (current ? { ...current } : undefined);

export function reportResources(
  s: StateValue,
  geometry?: Geometry,
  dimensions?: { width: number; height: number; resources?: { packed: boolean } },
) {
  const { width = 0, height = 0 } = dimensions ?? {};
  if (
    observeResources(
      s,
      geometry ?? { bytes: 0, pages: 0, streamOnly: false },
      wasmBytes(),
      width,
      height,
      dimensions?.resources?.packed,
    )
  )
    diagnostic("display", "soft-target", s.session);
}
