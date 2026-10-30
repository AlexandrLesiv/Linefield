import type { Core } from "../core";
import type { Camera } from "../camera";
import type { TextCore } from "../text-core";
import type { TextRecord } from "../text/records";
import { checkedSaveCore } from "../saving/types";
import { textLayout } from "../text/layout";
export type Draft = {
  id: number | null;
  revision: bigint;
  record: TextRecord | null;
  original: string;
  rx: bigint;
  ry: bigint;
  x: number;
  y: number;
  layer: number;
  color: number;
  opacity: number;
};
export type PrepareText = (
  record: TextRecord,
  content: string,
  signal: AbortSignal,
) => Promise<{ publish(id: number): void; dispose(): void }>;
export async function commitText(
  core: Core,
  text: TextCore,
  camera: Camera,
  draft: Draft,
  content: string,
  prepare: PrepareText,
  signal: AbortSignal,
) {
  const save = checkedSaveCore(core),
    layout = await textLayout(content);
  const current = () =>
    !signal.aborted &&
    save.delta_revision() === draft.revision &&
    camera.regionX === draft.rx &&
    camera.regionY === draft.ry;
  if (!current()) throw Error("text-stale");
  const old = draft.record,
    a = old?.a ?? 1,
    b = old?.b ?? 0;
  const record: TextRecord = {
    id: draft.id ?? 0,
    revision: old?.revision ?? 0,
    generation: 0,
    color: draft.color,
    opacity: draft.opacity,
    x: old
      ? old.x + (a * (old.width - layout.width)) / 2 - (b * (old.height - layout.height)) / 2
      : draft.x - layout.width / 2,
    y: old
      ? old.y + (b * (old.width - layout.width)) / 2 + (a * (old.height - layout.height)) / 2
      : draft.y - layout.height / 2,
    a,
    b,
    width: layout.width,
    height: layout.height,
    inkX: layout.x,
    baseline: layout.y,
    length: new TextEncoder().encode(content).length,
  };
  const prepared = await prepare(record, content, signal);
  try {
    if (!current()) throw Error("text-stale");
    const bytes = new TextEncoder().encode(content),
      pointer = text.text_input_ptr();
    if (!pointer || pointer + bytes.length > core.memory.buffer.byteLength)
      throw Error("text-boundary");
    new Uint8Array(core.memory.buffer, pointer, bytes.length).set(bytes);
    const id =
      draft.id === null
        ? text.text_create(
            bytes.length,
            draft.color,
            draft.opacity,
            layout.width,
            layout.height,
            layout.x,
            layout.y,
            draft.layer,
            draft.rx,
            draft.x,
            draft.ry,
            draft.y,
          ) >>> 0
        : text.text_edit(
              draft.id,
              old!.revision,
              draft.revision,
              bytes.length,
              draft.color,
              draft.opacity,
              layout.width,
              layout.height,
              layout.x,
              layout.y,
            )
          ? draft.id
          : 0xffffffff;
    if (id === 0xffffffff) throw Error(text.text_error() === 3 ? "text-limit" : "text-stale");
    prepared.publish(id);
    return { id, bytes: bytes.length };
  } finally {
    prepared.dispose();
  }
}
