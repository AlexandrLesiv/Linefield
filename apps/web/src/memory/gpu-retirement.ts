type Retirement = {
  bytes: number;
  context: WebGL2RenderingContext;
  drained: () => boolean;
  release: () => void;
};
let current: Retirement | undefined;
let failed = false;
let scheduled = 0;
function poll() {
  scheduled = 0;
  if (!current) return;
  try {
    if (current.drained()) {
      current.context.canvas.removeEventListener("webglcontextlost", pollGpuRetirement);
      current.release();
      current = undefined;
      failed = false;
      return;
    }
  } catch {
    // Uncertain completion stays charged; a later context loss can retire it safely.
    failed = true;
    return;
  }
  scheduled = requestAnimationFrame(poll);
}
export function retireGpu(value: Retirement) {
  if (current) throw Error("gpu-retirement-capacity");
  current = value;
  value.context.canvas.addEventListener("webglcontextlost", pollGpuRetirement);
  poll();
}
export function gpuAdmission() {
  if (failed) throw Error("gpu-retirement");
  return !current;
}
export function retiringGpuBytes() {
  return current?.bytes ?? 0;
}
export function pollGpuRetirement() {
  if (scheduled) cancelAnimationFrame(scheduled);
  poll();
}
// A new editor attachment is an explicit Retry/Back→Resume boundary, not a RAF retry.
export function retryGpuRetirement() {
  failed = false;
  pollGpuRetirement();
}
