import type { Resources } from "./resources.ts";
const counts = {
  rebuilds: 0,
  committedDraws: 0,
  prefixPublications: 0,
  invalidations: 0,
  panPreviewPublications: 0,
};
let pendingSince: number | undefined;
let maxPendingMs = 0;
let maxOperationMs = 0;
let snapshotCount = 0;
let maxSnapshotMs = 0;
let peakImages = 0;
let maxPanTranslateMs = 0;
let live = { context: 0, surface: 0, image: 0, builder: 0, path: 0, paint: 0 };
export function renderCount(name: keyof typeof counts): void {
  counts[name] = Math.min(Number.MAX_SAFE_INTEGER, counts[name] + 1);
}
export function renderPending(): void {
  pendingSince ??= performance.now();
}
export function renderCaughtUp(): void {
  if (pendingSince !== undefined)
    maxPendingMs = Math.max(maxPendingMs, performance.now() - pendingSince);
  pendingSince = undefined;
}
export function renderOperation<T>(operation: () => T): T {
  const start = performance.now();
  try {
    return operation();
  } finally {
    maxOperationMs = Math.max(maxOperationMs, performance.now() - start);
  }
}
export function renderResources(resources: Resources): void {
  live = { ...resources.live };
  peakImages = Math.max(peakImages, resources.peak.image);
}
export function renderSnapshot<T>(operation: () => T): T {
  const start = performance.now();
  try {
    return operation();
  } finally {
    snapshotCount = Math.min(Number.MAX_SAFE_INTEGER, snapshotCount + 1);
    maxSnapshotMs = Math.max(maxSnapshotMs, performance.now() - start);
  }
}
export function renderPanTranslation(operation: () => void): void {
  const start = performance.now();
  try {
    renderOperation(operation);
  } finally {
    maxPanTranslateMs = Math.max(maxPanTranslateMs, performance.now() - start);
  }
}
export function renderMetrics() {
  return {
    ...counts,
    maxPendingMs,
    maxOperationMs,
    snapshotCount,
    maxSnapshotMs,
    peakImages,
    maxPanTranslateMs,
    live: { ...live },
    pendingMs: pendingSince === undefined ? 0 : performance.now() - pendingSince,
    measurement:
      "Synchronous render operations and pending content age; not whole tasks, GPU completion or physical latency",
  };
}
