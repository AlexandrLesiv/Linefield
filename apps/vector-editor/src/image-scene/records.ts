import type { TextRecord } from "../text/records";
import type { ImageCore } from "../image-core";
import type { Camera } from "../camera";
import type { Core } from "../core";
export type ImageRecord = {
  id: number;
  digest: string;
  opacity: number;
  corners: number[];
  text?: TextRecord;
};
const decoder = new TextDecoder();
/** Disposable projection of authoritative regional image objects. */
export function imageRecords(core: Core, images: ImageCore, camera: Camera): ImageRecord[] {
  const result: ImageRecord[] = [];
  for (let slot = 0; slot < images.image_count(); slot++) {
    const id = 0x80000000 + slot;
    if (!images.image_read(id, camera.regionX, 0, camera.regionY, 0)) continue;
    const v = new Float64Array(images.memory.buffer, images.image_output_ptr(), 15);
    if (!v[9] || v[8] <= 0) continue;
    const [width, height, opacity, x, y, a, b] = [v[4], v[5], v[8], v[11], v[12], v[13], v[14]];
    const digest = decoder.decode(
      new Uint8Array(images.memory.buffer, images.image_digest_ptr(id), 64),
    );
    result.push({
      id,
      digest,
      opacity,
      corners: [
        x,
        y,
        x + a * width,
        y + b * width,
        x - b * height,
        y + a * height,
        x + a * width - b * height,
        y + b * width + a * height,
      ],
    });
  }
  return result.sort((a, b) => (core.selection_precedes(a.id, b.id) ? 1 : -1));
}
