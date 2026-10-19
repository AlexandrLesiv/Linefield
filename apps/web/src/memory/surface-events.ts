export function observeSurface(
  canvas: HTMLCanvasElement,
  resize: () => void,
  lost: (event: Event) => void,
  restored: () => void,
) {
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
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
