import type { TextCore } from "../text-core";
import type { Core } from "../core";
import type { Camera } from "../camera";
export const TEXT_HANDLE = 0x40000000;
export type TextRecord = {
  id: number;
  color: number;
  opacity: number;
  x: number;
  y: number;
  a: number;
  b: number;
  width: number;
  height: number;
  revision: number;
  inkX: number;
  baseline: number;
  length: number;
  generation: number;
};
export function textRecord(
  core: TextCore,
  camera: Camera,
  id: number,
  generation: number,
): TextRecord | null {
  if (!core.text_read(id, camera.regionX, 0, camera.regionY, 0)) return null;
  const pointer = core.text_output_ptr();
  if (pointer % 8 || pointer + 160 > core.memory.buffer.byteLength) throw Error("text-boundary");
  const v = new Float64Array(core.memory.buffer, pointer, 20);
  if (!v.every(Number.isFinite) || v[16] !== 1 || v[17] < 0 || v[17] > 16384)
    throw Error("text-boundary");
  if (!v[7]) return null;
  return {
    id,
    color: v[5],
    opacity: v[6],
    x: v[9],
    y: v[10],
    a: v[11],
    b: v[12],
    width: v[13],
    height: v[14],
    revision: v[15],
    inkX: v[18],
    baseline: v[19],
    length: v[17],
    generation,
  };
}
export function textRecords(core: Core, text: TextCore, camera: Camera) {
  const result: TextRecord[] = [],
    generation = core.layer_render_revision();
  for (let slot = 0; slot < text.text_count(); slot++) {
    const record = textRecord(text, camera, TEXT_HANDLE + slot, generation);
    if (record && record.opacity > 0) result.push(record);
  }
  return result;
}
export function textContent(core: TextCore, record: TextRecord) {
  const pointer = core.text_content_ptr(record.id);
  if (!pointer || pointer + record.length > core.memory.buffer.byteLength)
    throw Error("text-boundary");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    new Uint8Array(core.memory.buffer, pointer, record.length),
  );
}
