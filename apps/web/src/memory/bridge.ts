import * as api from "#memory-bindings";
import type { Reply, State, Mapping } from "#memory-bindings";
import { diagnostic } from "./diagnostics.ts";
export type ReplyValue = Readonly<
  Pick<
    Reply,
    | "code"
    | "owner"
    | "session"
    | "interaction"
    | "content"
    | "scene"
    | "mapping"
    | "presentation"
    | "activeCancelled"
  >
>;
export type StateValue = ReplyValue &
  Readonly<
    Pick<
      State,
      | "phase"
      | "width"
      | "red"
      | "green"
      | "blue"
      | "canUndo"
      | "canRedo"
      | "canBeginInk"
      | "strokeCount"
      | "cpuCharge"
    >
  >;
export type MappingValue = ReplyValue &
  Readonly<
    Pick<
      Mapping,
      | "available"
      | "width"
      | "height"
      | "backing"
      | "regionX"
      | "regionY"
      | "localX"
      | "localY"
      | "zoom"
    >
  >;
export function reply(value: Reply): ReplyValue {
  return {
    code: value.code,
    owner: value.owner,
    session: value.session,
    interaction: value.interaction,
    content: value.content,
    scene: value.scene,
    mapping: value.mapping,
    presentation: value.presentation,
    activeCancelled: value.activeCancelled,
  };
}
export class EngineBoundaryError extends Error {}
export function consume<T extends Reply, R>(
  command: string,
  action: () => T,
  copy: (value: T) => R,
): R {
  try {
    const snapshot = action();
    try {
      const value = copy(snapshot);
      diagnostic(command, snapshot.code, snapshot.session);
      return value;
    } finally {
      snapshot.free();
    }
  } catch {
    throw new EngineBoundaryError("engine-boundary-failed");
  }
}

export const bridge = {
  create: () => consume("create", api.memoryCreate, reply),
  enter: (owner: bigint) => consume("enter", () => api.memoryEnter(owner), reply),
  read: (owner: bigint): StateValue =>
    consume(
      "read",
      () => api.memoryRead(owner),
      (value) => ({
        ...reply(value),
        phase: value.phase,
        width: value.width,
        red: value.red,
        green: value.green,
        blue: value.blue,
        canUndo: value.canUndo,
        canRedo: value.canRedo,
        canBeginInk: value.canBeginInk,
        strokeCount: value.strokeCount,
        cpuCharge: value.cpuCharge,
      }),
    ),
  mapping: (owner: bigint, session: bigint): MappingValue =>
    consume(
      "mapping",
      () => api.memoryMapping(owner, session),
      (value) => ({
        ...reply(value),
        available: value.available,
        width: value.width,
        height: value.height,
        backing: value.backing,
        regionX: value.regionX,
        regionY: value.regionY,
        localX: value.localX,
        localY: value.localY,
        zoom: value.zoom,
      }),
    ),
  metrics: (state: ReplyValue, sequence: bigint, width: number, height: number, backing: number) =>
    consume(
      "metrics",
      () =>
        api.memoryMetrics(
          state.owner,
          state.session,
          state.mapping,
          sequence,
          width,
          height,
          backing,
        ),
      reply,
    ),
  suspend: (state: ReplyValue, sequence: bigint) =>
    consume(
      "suspend",
      () => api.memorySuspend(state.owner, state.session, state.mapping, sequence),
      reply,
    ),
  presented: (state: ReplyValue) =>
    consume(
      "presented",
      () =>
        api.memoryPresented(
          state.owner,
          state.session,
          state.presentation,
          state.mapping,
          state.content,
        ),
      reply,
    ),
  leave: (state: ReplyValue) =>
    consume("leave", () => api.memoryLeave(state.owner, state.session), reply),
  scene: (state: ReplyValue, after = 0n) =>
    consume(
      "scene",
      () => api.memorySceneIds(state.owner, state.session, state.scene, after),
      (value) => ({ ...reply(value), ids: value.ids, done: value.done }),
    ),
  dispose: (owner: bigint) => consume("dispose", () => api.memoryDispose(owner), reply),
};
export type Bridge = typeof bridge;
