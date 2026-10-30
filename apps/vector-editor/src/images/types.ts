export const MAX_ENCODED = 16 * 1024 * 1024;
export const MAX_PIXELS = 4096 * 4096;
export const GPU_BUDGET = 128 * 1024 * 1024;
export type Header = {
  format: "png" | "jpeg" | "webp";
  width: number;
  height: number;
  encodedBytes: number;
};
export type AssetMetadata = {
  digest: string;
  bytes: number;
  width: number;
  height: number;
  mime: string;
  version: number;
};
export type DecodedImage = {
  image: ImageBitmap;
  width: number;
  height: number;
  mime: string;
  encodedBytes: number;
};
export function textureBytes(width: number, height: number) {
  let pixels = width * height;
  while (width > 1 || height > 1) {
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
    pixels += width * height;
  }
  return pixels * 4;
}
