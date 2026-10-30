export const MAX_ENCODED = 16 * 1024 * 1024;
export const MAX_PIXELS = 4096 * 4096;
export const MAX_TOTAL_PIXELS = MAX_PIXELS * 2;
export type DecodeMode = "main" | "worker";
export type Header = {
  format: "png" | "jpeg" | "webp";
  width: number;
  height: number;
  encodedBytes: number;
};
export type ImportMetrics = {
  headerMs: number;
  decodeMs: number;
  decodeRoundtripMs: number;
  transferOverheadMs: number;
  gateWaitMs: number;
  uploadSubmissionMs: number;
  mipmapSubmissionMs: number;
  totalMs: number;
};
export type Imported = Header & { id: number; metrics: ImportMetrics };
export type ImageItem = {
  kind: "image";
  id: number;
  transform: [number, number, number, number, number, number];
  opacity: number;
};
export type InkItem = {
  kind: "ink";
  from: [number, number];
  to: [number, number];
  radius: number;
  color: [number, number, number];
  opacity: number;
};
export type Item = ImageItem | InkItem;
export type View = { width: number; height: number; background: "white" | "black" | "transparent" };
export const DECODE_OPTIONS: ImageBitmapOptions = {
  imageOrientation: "from-image",
  premultiplyAlpha: "premultiply",
  colorSpaceConversion: "default",
};

export function texturePixels(width: number, height: number, mipmap: boolean) {
  let total = width * height;
  if (mipmap)
    while (width > 1 || height > 1) {
      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
      total += width * height;
    }
  return total;
}
