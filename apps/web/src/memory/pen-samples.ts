export function localPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) * canvas.clientWidth) / rect.width,
    ((event.clientY - rect.top) * canvas.clientHeight) / rect.height,
  ] as const;
}
export function sampleBatch(canvas: HTMLCanvasElement, events: PointerEvent[], offset: number) {
  const count = Math.min(256, events.length - offset);
  const batch = {
    x: new Float64Array(count),
    y: new Float64Array(count),
    pressure: new Float64Array(count),
    hasPressure: new Uint8Array(count),
  };
  for (let i = 0; i < count; i++) {
    const sample = events[offset + i]!;
    const [x, y] = localPoint(canvas, sample);
    batch.x[i] = x;
    batch.y[i] = y;
    if (sample.pointerType === "pen") {
      batch.pressure[i] = sample.pressure;
      batch.hasPressure[i] = 1;
    }
  }
  return batch;
}
