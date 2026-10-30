import { MAX_ENCODED, MAX_PIXELS, type Header } from "./types";
/** Bounded format admission, not a replacement for browser decoder validation. */
export async function inspect(blob: Blob): Promise<Header> {
  if (!blob.size || blob.size > MAX_ENCODED) throw Error("image-encoded-limit");
  const b = new Uint8Array(await blob.slice(0, Math.min(blob.size, 1024 * 1024)).arrayBuffer());
  const d = new DataView(b.buffer),
    ascii = (p: number, n: number) => String.fromCharCode(...b.subarray(p, p + n));
  let width = 0,
    height = 0,
    format: Header["format"];
  if (b.length >= 24 && b[0] === 137 && ascii(1, 3) === "PNG") {
    format = "png";
    if (
      d.getUint32(0) !== 0x89504e47 ||
      d.getUint32(4) !== 0x0d0a1a0a ||
      d.getUint32(8) !== 13 ||
      ascii(12, 4) !== "IHDR"
    )
      throw Error("image-invalid-png");
    width = d.getUint32(16);
    height = d.getUint32(20);
    let p = 8,
      found = false;
    for (let chunks = 0; chunks < 1024 && p + 12 <= b.length; chunks++) {
      const size = d.getUint32(p),
        type = ascii(p + 4, 4);
      if (type === "acTL") throw Error("image-animation-unsupported");
      if (type === "IDAT") {
        found = true;
        break;
      }
      if (size > blob.size - p - 12) throw Error("image-invalid-png");
      p += size + 12;
    }
    if (!found) throw Error("image-header-limit");
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    format = "jpeg";
    let p = 2,
      sawScan = false;
    while (p + 4 <= b.length) {
      if (b[p++] !== 255) throw Error("image-invalid-jpeg");
      while (p < b.length && b[p] === 255) p++;
      const marker = b[p++]!;
      if (marker === 218) {
        sawScan = true;
        break;
      }
      if (marker === 217) break;
      const size = d.getUint16(p);
      if (size < 2 || p + size > b.length) throw Error("image-header-limit");
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (size < 8) throw Error("image-invalid-jpeg");
        if (width) throw Error("image-duplicate-frame");
        height = d.getUint16(p + 3);
        width = d.getUint16(p + 5);
      }
      p += size;
    }
    if (!sawScan) throw Error("image-header-limit");
  } else if (b.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    format = "webp";
    if (d.getUint32(4, true) + 8 !== blob.size) throw Error("image-invalid-webp");
    let p = 12,
      canvasWidth = 0,
      canvasHeight = 0,
      frames = 0;
    while (p + 8 <= b.length) {
      const type = ascii(p, 4),
        size = d.getUint32(p + 4, true),
        q = p + 8;
      if (size > blob.size - q) throw Error("image-invalid-webp");
      if (type === "ANIM" || type === "ANMF") throw Error("image-animation-unsupported");
      if (type === "VP8X") {
        if (size !== 10 || q + 10 > b.length) throw Error("image-invalid-webp");
        if (b[q]! & 2) throw Error("image-animation-unsupported");
        canvasWidth = 1 + b[q + 4]! + (b[q + 5]! << 8) + (b[q + 6]! << 16);
        canvasHeight = 1 + b[q + 7]! + (b[q + 8]! << 8) + (b[q + 9]! << 16);
      } else if (type === "VP8L" || type === "VP8 ") {
        if (++frames > 1 || q + 10 > b.length) throw Error("image-invalid-webp");
        if (type === "VP8L" && b[q] === 47) {
          width = 1 + ((b[q + 1]! | (b[q + 2]! << 8)) & 16383);
          height = 1 + (((b[q + 2]! >> 6) | (b[q + 3]! << 2) | (b[q + 4]! << 10)) & 16383);
        } else if (type === "VP8 " && b[q + 3] === 157 && b[q + 4] === 1 && b[q + 5] === 42) {
          width = d.getUint16(q + 6, true) & 16383;
          height = d.getUint16(q + 8, true) & 16383;
        } else throw Error("image-invalid-webp");
        if (canvasWidth && (width !== canvasWidth || height !== canvasHeight))
          throw Error("image-webp-dimensions");
        break;
      }
      p = q + size + (size & 1);
    }
  } else throw Error("image-format-unsupported");
  if (!width || !height || width * height > MAX_PIXELS) throw Error("image-pixel-limit");
  return { format, width, height, encodedBytes: blob.size };
}
