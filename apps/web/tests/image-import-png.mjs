import { deflateSync } from "node:zlib";
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function chunk(type, payload) {
  const bytes = Buffer.alloc(payload.length + 12);
  bytes.writeUInt32BE(payload.length, 0);
  bytes.write(type, 4, 4, "ascii");
  payload.copy(bytes, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, bytes.length - 4))
    crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  bytes.writeUInt32BE(~crc >>> 0, bytes.length - 4);
  return bytes;
}
/** Synthetic decoder/render specimen: transparent blue RGB must never tint opaque red edges. */
export function hiddenRgbPng() {
  const width = 64,
    height = 64,
    ihdr = Buffer.alloc(13),
    scanlines = Buffer.alloc(height * (width * 4 + 1));
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      scanlines.set(x < 32 ? [255, 0, 0, 255] : [0, 0, 255, 0], offset);
    }
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
