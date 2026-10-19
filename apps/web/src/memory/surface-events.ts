export function observeSurface(
  canvas: HTMLCanvasElement,
  resize: () => void,
  context: { contextLost(event: Event): void; contextRestored(): void },
) {
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", context.contextLost);
  canvas.addEventListener("webglcontextrestored", context.contextRestored);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", context.contextLost);
    canvas.removeEventListener("webglcontextrestored", context.contextRestored);
  };
}
export function surfaceMetrics(canvas: HTMLCanvasElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const backing = devicePixelRatio;
  return { width, height, backing, key: `${width}:${height}:${backing}` };
}

export function surfaceIsCurrent(
  canvas: HTMLCanvasElement,
  size: string,
  remap: () => void,
): boolean {
  if (surfaceMetrics(canvas).key === size) return true;
  remap();
  return false;
}
