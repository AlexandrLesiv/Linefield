export type WorkerRequest =
  | { kind: "init"; id: number; width: number; height: number; margin: number }
  | { kind: "start"; id: number; clear: boolean }
  | {
      kind: "page";
      id: number;
      verbs: Uint8Array;
      points: Float32Array;
      weights: Float32Array;
      color: number[];
      done: boolean;
    }
  | { kind: "finish"; id: number }
  | { kind: "dispose"; id: number };
export type WorkerReply =
  | { kind: "ack"; id: number }
  | { kind: "busy"; id: number }
  | { kind: "failure"; id: number; reason: string }
  | {
      kind: "frame";
      id: number;
      bitmap: ImageBitmap;
      drawMs: number;
      exportMs: number;
      heap: number;
      width: number;
      height: number;
    };

export function padding(width: number, height: number) {
  const visible = width * height * 4;
  for (let q = 256; q >= 0; q--) {
    const x = Math.floor((width * q) / 1024);
    const y = Math.floor((height * q) / 1024);
    const w = width + 2 * x;
    const h = height + 2 * y;
    if (
      w <= 8192 &&
      h <= 8192 &&
      w * h <= 8_388_608 &&
      (q === 0 || 5 * w * h * 4 + visible <= 96 * 1024 ** 2)
    )
      return {
        x,
        y,
        fraction: q / 1024,
        width: w,
        height: h,
        conservativePeakBytes: 5 * w * h * 4 + visible,
      };
  }
  throw Error("invalid-visible-size");
}
