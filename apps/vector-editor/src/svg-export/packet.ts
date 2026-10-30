/** Pack disposable Rust f64 capsules only after subtracting the raster-local origin. */
export function packPacket(values: Float64Array, anchorX: number, anchorY: number) {
  if (values.length < 24 || values[0] !== 1 || (values.length - 24) % 6 || values.length > 6168)
    throw Error("svg-invalid-packet");
  if (![...values].every(Number.isFinite)) throw Error("svg-nonfinite-packet");
  const count = (values.length - 24) / 6,
    data = new ArrayBuffer(count * 32);
  const floats = new Float32Array(data),
    bytes = new Uint8Array(data);
  const width = Math.max(
    0,
    Math.min(65535, Math.round((Math.log2(Math.max(2 ** -32, values[9])) + 32) * 1024)),
  );
  const color = values[7];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 6; k++)
      floats[i * 8 + k] =
        values[24 + i * 6 + k] - (k === 0 || k === 3 ? anchorX : k === 1 || k === 4 ? anchorY : 0);
    bytes.set(
      [
        (color >>> 16) & 255,
        (color >>> 8) & 255,
        color & 255,
        Math.round(values[8] * 255),
        values[6],
        width & 255,
        width >>> 8,
        values[2] & 255,
      ],
      i * 32 + 24,
    );
  }
  return { data, count, brush: values[6] };
}
