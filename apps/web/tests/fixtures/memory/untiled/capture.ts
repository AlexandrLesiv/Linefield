import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted, turn } from "../undo-input.ts";
import { hostUnit, hostUnits } from "./telemetry.ts";
import { key, same } from "./protocol.ts";
import type { Cursor, Frame, Stroke, Unit } from "./protocol.ts";
export async function capture(
  state: ReplyValue,
  width: number,
  height: number,
  cursors: Cursor[] = [],
  guarded = false,
) {
  const units: Unit[] = [];
  const query = <T>(stage: string, action: () => T) => {
    const value = hostUnit(stage, action, guarded);
    units.push(hostUnits[hostUnits.length - 1]!);
    return value;
  };
  const strokes: Stroke[] = [];
  let after = 0n;
  for (;;) {
    const scene = query("scene-query-copy", () => bridge.scene(state, after));
    accepted(scene);
    if (!same(scene, state)) throw Error("scene-identity");
    for (const id of scene.ids) {
      const status = query("stroke-query-copy", () => penBridge.stroke(state, id));
      accepted(status);
      if (!same(status, state)) throw Error("stroke-state-identity");
      const identity = key("fixture-module-1", state, id, status.geometry);
      const old = cursors.find((entry) => entry.key === identity);
      const reuse =
        old &&
        !old.culled &&
        old.verbs <= status.verbs &&
        (!old.terminal || (status.terminal && old.verbs === status.verbs));
      const from = reuse ? old.verbs : 0n;
      const stroke: Stroke = {
        key: identity,
        id,
        geometry: status.geometry,
        verbs: status.verbs,
        terminal: status.terminal,
        from,
        pages: [],
        culled: false,
      };
      let offset = from;
      while (offset < status.verbs) {
        const page = query("geometry-query-copy", () =>
          penBridge.page(state, id, status.geometry, offset),
        );
        accepted(page);
        if (
          page.scene !== state.scene ||
          page.mapping !== state.mapping ||
          page.geometry !== status.geometry ||
          page.stroke !== id
        )
          throw Error("page-identity");
        stroke.pages.push(page);
        if (!page.verbs.length) {
          if (!page.done || from !== 0n) throw Error("invalid-empty-page");
          stroke.culled = true;
          break;
        }
        offset += BigInt(page.verbs.length);
        if (
          offset > status.verbs ||
          page.done !== (offset === status.verbs) ||
          (!page.done && page.next !== offset)
        )
          throw Error("page-cursor");
        await turn();
      }
      strokes.push(stroke);
    }
    if (scene.done) break;
    if (!scene.ids.length) throw Error("scene-progress");
    after = scene.ids[scene.ids.length - 1]!;
  }
  if (
    !same(
      query("final-state-query", () => bridge.read(state.owner)),
      state,
    )
  )
    throw Error("capture-stale");
  const frame: Frame = { module: "fixture-module-1", state, width, height, strokes };
  return { frame, units };
}
export function fingerprint(frame: Frame) {
  return frame.strokes.map((stroke) => ({
    id: String(stroke.id),
    verbs: String(stroke.verbs),
    data: stroke.pages.map((page) => [
      page.red,
      page.green,
      page.blue,
      Array.from(page.verbs),
      Array.from(page.points),
      Array.from(page.weights),
    ]),
  }));
}
