import { checkedTextCore } from "./text-boundary";
import { checkedImageCore } from "./image-boundary";
import { LassoRegion, type LassoPoint } from "./lasso";
import type { Camera } from "./camera";
import type { Core } from "./core";
import type { Bounds, GeometryCache } from "./geometry-cache";

export const TEXT_HANDLE = 0x40000000;
export const IMAGE_HANDLE = 0x80000000;

/** Presentation adapter only; Rust owns rectangle geometry and mixed paint order. */
export function imageSelection(core: Core, cache: GeometryCache, camera: Camera) {
  const images = checkedImageCore(core);
  const texts = checkedTextCore(core);
  function eligible(activeOnly: boolean) {
    const found: number[] = [];
    for (const [base, count] of [
      [IMAGE_HANDLE, images.image_count()],
      [TEXT_HANDLE, texts.text_count()],
    ]) {
      if (!Number.isInteger(count) || count < 0 || count > 10000)
        throw Error("Invalid object selection count");
      for (let index = 0; index < count; index++) {
        const id = base + index;
        if (core.selection_eligible(id, Number(activeOnly))) found.push(id);
      }
    }
    return found;
  }
  function angle(id: number) {
    if (id < TEXT_HANDLE)
      return Math.atan2(core.stroke_transform(id, 1), core.stroke_transform(id, 0));
    if (id < IMAGE_HANDLE) {
      if (!texts.text_read(id, camera.regionX, 0, camera.regionY, 0))
        throw Error("Invalid selected text");
      const pointer = texts.text_output_ptr(),
        memory = core.memory.buffer;
      if (pointer % 8 || pointer + 160 > memory.byteLength)
        throw Error("Invalid text selection boundary");
      const values = new Float64Array(memory, pointer, 20);
      if (!Number.isFinite(values[11]) || !Number.isFinite(values[12]))
        throw Error("Invalid text orientation");
      return Math.atan2(values[12], values[11]);
    }
    if (!images.image_read(id, camera.regionX, 0, camera.regionY, 0))
      throw Error("Invalid selected image");
    const pointer = images.image_output_ptr(),
      memory = core.memory.buffer;
    if (pointer % 8 !== 0 || pointer + 15 * 8 > memory.byteLength)
      throw Error("Invalid image selection boundary");
    const values = new Float64Array(memory, pointer, 15);
    if (!Number.isFinite(values[13]) || !Number.isFinite(values[14]))
      throw Error("Invalid image orientation");
    return Math.atan2(values[14], values[13]);
  }
  function bounds(ids: Iterable<number>, orientation: number): Bounds | null {
    const selected = [...ids];
    let result = cache.selectionBounds(
      selected.filter((id) => id < TEXT_HANDLE),
      orientation,
    );
    for (const id of selected) {
      if (id < TEXT_HANDLE) continue;
      const next: Bounds = [0, 0, 0, 0];
      for (let axis = 0; axis < 4; axis++)
        next[axis] = (id < IMAGE_HANDLE ? texts.text_bounds : images.image_bounds)(
          id,
          camera.regionX,
          camera.regionY,
          orientation,
          axis,
        );
      if (!next.every(Number.isFinite)) throw Error("Invalid image selection bounds");
      if (!result) result = next;
      else
        for (let axis = 0; axis < 2; axis++) {
          result[axis] = Math.min(result[axis], next[axis]);
          result[axis + 2] = Math.max(result[axis + 2], next[axis + 2]);
        }
    }
    return result;
  }
  function pick(x: number, y: number, pad: number, activeOnly: boolean) {
    let hit = cache.hitTest(x, y, pad, activeOnly);
    for (const id of eligible(activeOnly))
      if (
        (id < IMAGE_HANDLE ? texts.text_hit : images.image_hit)(
          id,
          camera.regionX,
          camera.regionY,
          x,
          y,
          pad,
        ) &&
        (hit === null || core.selection_precedes(id, hit))
      )
        hit = id;
    return hit;
  }
  function lasso(points: readonly LassoPoint[], partial: boolean, activeOnly: boolean) {
    const candidates = eligible(activeOnly);
    if (!candidates.length) return [];
    // Worker queries use a separate Wasm instance; populate this owner's query scratch too.
    const region = new LassoRegion(core, points);
    try {
      return candidates.filter((id) =>
        (id < IMAGE_HANDLE ? texts.text_lasso : images.image_lasso)(
          id,
          camera.regionX,
          camera.regionY,
          Number(partial),
        ),
      );
    } finally {
      region.dispose();
    }
  }
  return { angle, bounds, pick, lasso };
}
