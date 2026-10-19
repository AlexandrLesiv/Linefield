export type Request =
  | { kind: "init"; id: number; width: number; height: number; backing: number }
  | { kind: "start"; id: number }
  | {
      kind: "page";
      id: number;
      verbs: Uint8Array;
      points: Float32Array;
      weights: Float32Array;
      color: number[];
      done: boolean;
    }
  | { kind: "finish"; id: number };
export type Reply =
  | { kind: "ack"; id: number }
  | { kind: "error"; id: number }
  | { kind: "frame"; id: number; bitmap: ImageBitmap; width: number; height: number; heap: number };
export type Frame = Extract<Reply, { kind: "frame" }>;

// Optional raster padding only: canonical geometry/visibility remain Rust-owned.
export function padding(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > 8_388_608
  )
    throw Error("surface-limit");
  for (let q = 256; q >= 0; q--) {
    const x = Math.floor((width * q) / 1024);
    const y = Math.floor((height * q) / 1024);
    const w = width + 2 * x;
    const h = height + 2 * y;
    if (
      w <= 8192 &&
      h <= 8192 &&
      w * h <= 8_388_608 &&
      (q === 0 || 5 * w * h * 4 + width * height * 4 <= 96 * 1024 ** 2)
    )
      return { x, y, width: w, height: h };
  }
  throw Error("surface-limit");
}
