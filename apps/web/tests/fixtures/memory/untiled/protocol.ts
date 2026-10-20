import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
export type Cursor = { key: string; verbs: bigint; terminal: boolean; culled: boolean };
export type Stroke = Cursor & { id: bigint; geometry: bigint; from: bigint; pages: PathPage[] };
export type Frame = {
  module: string;
  state: ReplyValue;
  width: number;
  height: number;
  strokes: Stroke[];
};
export type Request = {
  id: number;
  frame: Frame;
  fresh: boolean;
  guarded: boolean;
  gpu?: boolean;
  evict?: boolean;
  initialize?: boolean;
  fault?: "allocation" | "page";
};
export type Unit = { stage: string; ms: number };
export type Result = {
  kind: "result";
  id: number;
  status: "completed" | "failed";
  reason?: string;
  stage: string;
  units: Unit[];
  pixels?: Uint8Array;
  bitmap?: ImageBitmap;
  cursors: Cursor[];
  hits: number;
  builds: number;
  appendedVerbs: number;
  handles: { paths: number; builders: number; snapshots: number };
  heap: number;
  uninterruptedBusyMs: number[];
  workerWallMs: number;
  environment?: unknown;
};
export type Progress = { kind: "progress"; id: number; stage: string; units: Unit[] };
export function key(module: string, state: ReplyValue, id: bigint, geometry: bigint) {
  return [module, state.owner, state.session, id, geometry, state.mapping].join(":");
}
export function same(a: ReplyValue, b: ReplyValue) {
  return (
    a.owner === b.owner &&
    a.session === b.session &&
    a.scene === b.scene &&
    a.content === b.content &&
    a.mapping === b.mapping &&
    a.presentation === b.presentation
  );
}

export type Delivery = { kind: "delivery"; id: number; ms: number };
