export type Bounds = [number, number, number, number];
export const emptyBounds = (): Bounds => [Infinity, Infinity, -Infinity, -Infinity];
export function pageBounds(data: Float32Array, m: Float32Array): Bounds {
  const bounds = emptyBounds();
  const a = m[0] ?? 0,
    b = m[1] ?? 0,
    c = m[2] ?? 0,
    d = m[3] ?? 0,
    tx = m[4] ?? 0,
    ty = m[5] ?? 0;
  const scale = Math.hypot(a, b);
  for (let i = 0; i < data.length; i += 3) {
    const x = data[i] ?? 0,
      y = data[i + 1] ?? 0,
      r = (data[i + 2] ?? 0) * scale + 2;
    const px = a * x + c * y + tx,
      py = b * x + d * y + ty;
    bounds[0] = Math.min(bounds[0], px - r);
    bounds[1] = Math.min(bounds[1], py - r);
    bounds[2] = Math.max(bounds[2], px + r);
    bounds[3] = Math.max(bounds[3], py + r);
  }
  return bounds;
}
export function union(a: Bounds, b: Bounds) {
  a[0] = Math.min(a[0], b[0]);
  a[1] = Math.min(a[1], b[1]);
  a[2] = Math.max(a[2], b[2]);
  a[3] = Math.max(a[3], b[3]);
}
export function scissor(gl: WebGL2RenderingContext, b: Bounds, width: number, height: number) {
  const left = Math.max(0, Math.min(width, Math.floor(b[0]))),
    top = Math.max(0, Math.min(height, Math.floor(b[1])));
  const right = Math.max(left, Math.min(width, Math.ceil(b[2]))),
    bottom = Math.max(top, Math.min(height, Math.ceil(b[3])));
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(left, height - bottom, right - left, bottom - top);
}
