import {
  PreparationIdentity,
  prepareCreate,
  prepareFeed,
  prepareStep,
  prepareDrain,
  prepareRelease,
} from "#preparation-bindings";
import type { Frame, Stroke } from "../untiled/protocol.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { reply, slices, yieldTurn } from "./copy.ts";

export async function prepare(frame: Frame, stroke: Stroke, samples: bigint) {
  if (stroke.culled) return { pages: stroke.pages, stats: { status: "culled" } };
  const identity = new PreparationIdentity(
    1n,
    frame.state.owner,
    frame.state.session,
    stroke.id,
    1n,
    0,
    stroke.geometry,
    samples,
    stroke.verbs,
    1,
  );
  let state: ReturnType<typeof reply>;
  try {
    state = reply(prepareCreate(identity));
  } finally {
    identity.free();
  }
  if (state.status !== "accepted") throw Error(`prepare-create:${state.status}`);
  const handle = state.handle;
  const started = performance.now();
  let source = 0n;
  let output = 0n;
  let maxStepMs = 0;
  const pages: PathPage[] = [];
  const check = () => {
    if (performance.now() - started > 5000) throw Error("preparation-stage-watchdog");
  };
  async function consume() {
    for (const page of stroke.pages) {
      for (const chunk of slices(page)) {
        check();
        const end = source + BigInt(chunk.verbs.length);
        state = reply(
          prepareFeed(
            handle,
            1n,
            source,
            end,
            end === stroke.verbs,
            chunk.verbs,
            chunk.points,
            chunk.weights,
          ),
        );
        if (state.status !== "accepted") throw Error(`prepare-feed:${state.status}`);
        while (state.source < end) {
          check();
          const before = performance.now();
          state = reply(prepareStep(handle));
          maxStepMs = Math.max(maxStepMs, performance.now() - before);
          if (state.status === "original-required")
            return {
              pages: stroke.pages,
              stats: { ...state, wallMs: performance.now() - started, maxStepMs },
            };
          if (state.status !== "pending" && state.status !== "complete")
            throw Error(`prepare-step:${state.status}`);
          await yieldTurn();
        }
        const selected = prepareDrain(handle, output);
        try {
          state = reply(selected.metadata());
          if (state.status !== "pending" && state.status !== "complete")
            throw Error(`prepare-drain:${state.status}`);
          const verbs = selected.verbs();
          const points = selected.points();
          const weights = selected.weights();
          if (verbs.length) pages.push({ ...page, verbs, points, weights });
          output = state.output;
        } finally {
          selected.free();
        }
        source = end;
      }
    }
    if (source !== stroke.verbs || state.status !== "complete")
      throw Error("prepare-prefix-incomplete");
    return { pages, stats: { ...state, wallMs: performance.now() - started, maxStepMs } };
  }
  let result: Awaited<ReturnType<typeof consume>> | undefined;
  let failure: { value: unknown } | undefined;
  try {
    result = await consume();
  } catch (value: unknown) {
    failure = { value };
  }
  let cleanupFailure: { value: unknown } | undefined;
  try {
    const deadline = performance.now() + 5000;
    for (;;) {
      const status = reply(prepareRelease(handle)).status;
      if (status === "released") break;
      if (status !== "pending" || performance.now() > deadline) throw Error("prepare-release");
      await yieldTurn();
    }
  } catch (value: unknown) {
    cleanupFailure = { value };
  }
  if (failure && cleanupFailure)
    throw new AggregateError(
      [failure.value, cleanupFailure.value],
      `${String(failure.value)}; cleanup: ${String(cleanupFailure.value)}`,
    );
  if (failure) throw failure.value;
  if (cleanupFailure) throw cleanupFailure.value;
  if (!result) throw Error("prepare-missing-result");
  return result;
}
