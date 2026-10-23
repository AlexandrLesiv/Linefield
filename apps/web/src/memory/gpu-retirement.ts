export type CpuRetirement = {
  resources: () => {
    bytes: number;
    pages: number;
    tickets?: number;
    metadataEstimate?: number;
    uncertainDescriptors?: number;
    uncertainTickets?: number;
    receiptLeases?: number;
    uncertainReceiptLeases?: number;
  };
  cleanup: () => Promise<void>;
};
type Retirement = {
  bytes: number;
  context: WebGL2RenderingContext;
  drained: () => boolean;
  release: () => void;
  metadata?: () => number;
  samplerObjects?: number;
};
type Record = {
  gpu: Retirement;
  cpu: CpuRetirement | undefined;
  cpuDone: boolean;
  cpuFailed: boolean;
  gpuDone: boolean;
};
let current: Record | undefined;
let failed = false;
let scheduled = 0;
let subscriber: { wake: () => void } | undefined;
export function watchGpuAdmission(wake: () => void) {
  const value = { wake };
  subscriber = value;
  return () => {
    if (subscriber === value) subscriber = undefined;
  };
}
function finish(record: Record) {
  if (current !== record || !record.cpuDone || !record.gpuDone) return;
  current = undefined;
  failed = false;
  subscriber?.wake();
}
function poll() {
  scheduled = 0;
  const record = current;
  if (!record || record.gpuDone) return;
  try {
    if (record.gpu.drained()) {
      record.gpu.release();
      record.gpuDone = true;
      record.gpu.context.canvas.removeEventListener("webglcontextlost", pollGpuRetirement);
      finish(record);
      return;
    }
  } catch {
    // Unknown GPU completion stays charged until explicit Retry or context loss.
    failed = true;
    subscriber?.wake();
    return;
  }
  scheduled = requestAnimationFrame(poll);
}
export function retireGpu(value: Retirement, cpu?: CpuRetirement) {
  if (current) throw Error("gpu-retirement-capacity");
  const record: Record = { gpu: value, cpu, cpuDone: !cpu, cpuFailed: false, gpuDone: false };
  // Register both exact owners before any fallible cleanup, including synchronous throws.
  current = record;
  value.context.canvas.addEventListener("webglcontextlost", pollGpuRetirement);
  if (cpu) {
    let cleanup: Promise<void>;
    try {
      cleanup = cpu.cleanup();
    } catch (error) {
      cleanup = Promise.reject(error);
    }
    void cleanup
      .then(() => {
        const remaining = cpu.resources();
        if (remaining.bytes || remaining.pages || remaining.tickets)
          throw Error("cpu-retirement-ownership");
        record.cpuDone = true;
        finish(record);
      })
      .catch(() => {
        if (current === record) {
          record.cpuFailed = true;
          subscriber?.wake();
        }
      });
  }
  poll();
}
export function gpuAdmission() {
  if (failed || current?.cpuFailed) throw Error("gpu-retirement");
  return !current;
}
export const gpuRetirementPolling = () => !!current && !current.gpuDone;
export function retiringCpuResources() {
  const cpu = current?.cpu?.resources() ?? { bytes: 0, pages: 0, metadataEstimate: 0 };
  return {
    ...cpu,
    metadataEstimate:
      (cpu.metadataEstimate ?? 0) +
      (current && !current.gpuDone ? (current.gpu.metadata?.() ?? 0) : 0) +
      (current ? 192 : 0),
  };
}
export function retiringGpuBytes() {
  return current && !current.gpuDone ? current.gpu.bytes : 0;
}
export function retiringGpuSamplers() {
  return current && !current.gpuDone ? (current.gpu.samplerObjects ?? 0) : 0;
}
export function pollGpuRetirement() {
  if (scheduled) cancelAnimationFrame(scheduled);
  poll();
}
// Explicit attachment is a Retry boundary. CPU failure never proves ownership zero.
export function retryGpuRetirement() {
  failed = false;
  pollGpuRetirement();
}
