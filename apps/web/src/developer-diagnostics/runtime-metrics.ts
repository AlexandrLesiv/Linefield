import type { MetricSnapshot } from "./metrics.ts";
import { MetricWindow } from "./metric-window.ts";
import { geometryMetrics } from "../memory/geometry-metrics.ts";
import { resourceSnapshot } from "../memory/resource-monitor.ts";
const window = new MetricWindow();
let wanted = false,
  lastActivity = 0,
  lastEmit = -Infinity;
let source: MetricSnapshot["source"] = "unavailable";
let emit: ((snapshot: MetricSnapshot) => void) | undefined;
let failed: (() => void) | undefined;
let pending: ReturnType<typeof setTimeout> | undefined;
let idleDeadline: ReturnType<typeof setTimeout> | undefined;
let cached: MetricSnapshot = { atMs: 0, idle: true, source, values: {} };
export function observeMetrics(
  value: boolean,
  listener?: (snapshot: MetricSnapshot) => void,
  failure?: () => void,
) {
  wanted = value;
  emit = value ? listener : undefined;
  failed = value ? failure : undefined;
  clearTimeout(pending);
  clearTimeout(idleDeadline);
  pending = idleDeadline = undefined;
  if (!value) return;
  const now = performance.now();
  window.reset(now, geometryMetrics.gpuUploadBytes);
  deliver({ ...cached, source, idle: now - lastActivity > 1000 });
  if (!cached.atMs) schedule();
  if (now - lastActivity <= 1000) settleIdle();
}
export const metricsWanted = () => wanted;
function deliver(value: MetricSnapshot): void {
  try {
    emit?.(value);
  } catch {
    wanted = false;
    failed?.();
  }
}
function schedule() {
  if (!wanted || pending !== undefined) return;
  pending = setTimeout(
    () => {
      pending = undefined;
      lastEmit = performance.now();
      try {
        cached = snapshot();
        deliver(cached);
      } catch {
        wanted = false;
        failed?.();
      }
    },
    Math.max(0, 500 - (performance.now() - lastEmit)),
  );
}
// One activity deadline, extended only if activity occurred. It stops once idle; no idle loop.
function settleIdle() {
  if (!wanted || idleDeadline !== undefined) return;
  idleDeadline = setTimeout(
    () => {
      idleDeadline = undefined;
      if (!wanted) return;
      if (performance.now() - lastActivity < 1000) return settleIdle();
      cached = { ...cached, idle: true, source };
      deliver(cached);
    },
    Math.max(1, 1001 - (performance.now() - lastActivity)),
  );
}
function activity(now: number): void {
  lastActivity = now;
  schedule();
  settleIdle();
}
export function callbackDuration(start: number) {
  if (!wanted) return;
  const now = performance.now();
  window.input(start, now);
  activity(now);
}
export function renderMetric(kind: "submitted" | "validated") {
  if (!wanted) return;
  const now = performance.now();
  window.render(kind, now, geometryMetrics.gpuUploadBytes);
  activity(now);
}
export function sourceMetric(value: MetricSnapshot["source"]) {
  if (source === value) return;
  source = value;
  activity(performance.now());
}
export function resetMetrics(): void {
  source = "unavailable";
  cached = { atMs: 0, idle: true, source: "unavailable", values: {} };
  window.reset(performance.now(), geometryMetrics.gpuUploadBytes);
}
function snapshot(): MetricSnapshot {
  const now = performance.now(),
    g = geometryMetrics,
    resources = resourceSnapshot();
  return {
    atMs: now,
    idle: now - lastActivity > 1000,
    source,
    values: {
      ...window.snapshot(now),
      queued: g.queue,
      active: g.active,
      readyBytes: g.readyBytes,
      hits: g.preparedHits,
      requests: g.preparedRequests,
      finerHits: g.preparedFinerHits,
      misses: g.preparedMisses,
      gpuLive: g.gpuLive,
      gpuAllocated: g.gpuAllocated,
      ...(resources
        ? {
            cpu: resources.ownedCpu,
            wasm: resources.wasmHighWater,
            cpuMetadata: resources.hostMetadataEstimate,
            cpuRetiring: resources.retiringHostGeometry,
            gpuTotal: resources.ownedGpu,
            gpuRetiring: resources.gpuRetiring,
            uncertainPages:
              resources.uncertainGeometryDescriptors + resources.retiringUncertainDescriptors,
            uncertainTickets:
              resources.uncertainGeometryTickets + resources.retiringUncertainTickets,
          }
        : {}),
    },
  };
}
