import type { Core } from "../core";
import type { TextCore } from "../text-core";
import type { Camera } from "../camera";
import { textRecords, type TextRecord } from "./records";
import { textTiles } from "./tiles";
import { textOverview } from "./overview";
export const TEXT_JOB_LIMIT = 512,
  TEXT_CONTENT_LIMIT = 4 * 1024 * 1024;
/** Same visible working-set policy as presentation; an edit replaces its previous record. */
export function textAdmission(core: Core, text: TextCore, camera: Camera, candidate: TextRecord) {
  const viewport = document.querySelector("canvas")!.getBoundingClientRect();
  let jobs = 0,
    content = 0,
    candidateBytes = 0,
    totalBytes = 0;
  for (const record of [
    ...textRecords(core, text, camera).filter((item) => item.id !== candidate.id),
    candidate,
  ]) {
    if (record.opacity <= 0) continue;
    const tiles = textTiles(record, camera, viewport.width, viewport.height, devicePixelRatio);
    if (!tiles.length) continue;
    jobs += tiles.length + 1;
    content += record.length;
    if (jobs > TEXT_JOB_LIMIT || content > TEXT_CONTENT_LIMIT) throw Error("text-view-limit");
    const bytes = [textOverview(record, "").tile, ...tiles].reduce(
      (sum, tile) =>
        sum +
        (Math.ceil(tile.width * tile.density) + 4) *
          (Math.ceil(tile.height * tile.density) + 4) *
          4,
      0,
    );
    totalBytes += bytes;
    if (record === candidate) candidateBytes = bytes;
  }
  return { candidateBytes, totalBytes };
}
