import type { CanvasKit, Path } from "canvaskit-wasm";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
import { bridge } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { appendPathPage } from "../../../src/memory/path-page.ts";
import { cullCompleteContours } from "./undo-culling.ts";
import { accepted, turn } from "./undo-input.ts";
export type PreparedPath = { path: Path; color: number[] };
export async function preparePaths(
  kit: CanvasKit,
  state: ReplyValue,
  width: number,
  height: number,
  cull: boolean,
) {
  const paths: PreparedPath[] = [];
  const timing = { queryMs: 0, copyBuildMs: 0, cullMs: 0, pathSnapshotMs: 0, maximumPageTaskMs: 0 };
  let inputVerbs = 0;
  let retainedVerbs = 0;
  let copiedBytes = 0;
  for (const id of bridge.scene(state).ids) {
    const builder = new kit.PathBuilder();
    const status = penBridge.stroke(state, id);
    accepted(status);
    let offset = 0n;
    let color = [0, 0, 0];
    try {
      while (offset < status.verbs) {
        const start = performance.now();
        const page = penBridge.page(state, id, status.geometry, offset);
        timing.queryMs += performance.now() - start;
        accepted(page);
        inputVerbs += page.verbs.length;
        copiedBytes += page.verbs.byteLength + page.points.byteLength + page.weights.byteLength;
        const filterStart = performance.now();
        const selected = cull ? cullCompleteContours(page, width, height) : page;
        timing.cullMs += performance.now() - filterStart;
        retainedVerbs += selected.verbs.length;
        const buildStart = performance.now();
        appendPathPage(kit, builder, selected);
        timing.copyBuildMs += performance.now() - buildStart;
        color = [page.red, page.green, page.blue];
        offset += BigInt(page.verbs.length);
        timing.maximumPageTaskMs = Math.max(timing.maximumPageTaskMs, performance.now() - start);
        if (page.done) break;
        if (offset !== page.next) throw Error("page-progress");
        await turn();
      }
      const start = performance.now();
      paths.push({ path: builder.snapshot(), color });
      timing.pathSnapshotMs += performance.now() - start;
    } finally {
      builder.delete();
    }
  }
  return { paths, timing, inputVerbs, retainedVerbs, copiedBytes };
}
export function deletePaths(paths: PreparedPath[]) {
  for (const { path } of paths) path.delete();
}
