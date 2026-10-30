import { hiddenRgbPng } from "./image-import-png.mjs";
/** Valid ancillary bytes isolate encoded-size/IO cost while decoded pixels stay identical. */
export function paddedPng(size, png = hiddenRgbPng()) {
  const extra = size - png.length;
  if (!Number.isSafeInteger(size) || extra < 14) throw Error("Invalid padded PNG size");
  const chunk = Buffer.alloc(extra, 65);
  chunk.writeUInt32BE(extra - 12, 0);
  chunk.write("tEXt", 4, 4, "ascii");
  chunk[8] = 75;
  chunk[9] = 0;
  const table = Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, chunk.length - 4))
    crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  chunk.writeUInt32BE(~crc >>> 0, chunk.length - 4);
  return Buffer.concat([png.subarray(0, png.length - 12), chunk, png.subarray(png.length - 12)]);
}
