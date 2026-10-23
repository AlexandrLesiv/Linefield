import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { visibilityState } from "./visibility-fixture.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
export type Check = (value: boolean, label: string) => void;
export function querySource(check: Check, broad = false) {
  let state = edit.begin(visibilityState(), 1, 300, 300, 0.5, true);
  check(state.code === "ok", "canonical Begin accepted");
  state = edit.append(
    state,
    1n,
    new Float64Array([broad ? 8000 : 350]),
    new Float64Array([300]),
    new Float64Array([0.5]),
    new Uint8Array([1]),
  );
  check(state.code === "ok", "canonical append accepted");
  state = edit.end(state, 2n);
  const stroke = scene.ids(state, 0n).ids[0];
  check(state.code === "ok" && stroke !== undefined, "completed canonical setup");
  if (stroke === undefined) throw Error("missing source");
  const frame = frames.capture(state);
  const initialCharge = bridge.read(state.owner).derivedCharge;
  const input = frames.preparation(state, stroke, 0n, 2n, broad ? 2 : 1, frame.id);
  check(frame.code === "ok" && input.code === "ok" && input.token !== 0n, "current token/frame");
  return { state, stroke, frame: frame.id, input, initialCharge };
}
export async function finishQueryPreparation(
  s: ReplyValue,
  input: ReturnType<typeof frames.preparation>,
  check: Check,
) {
  const prepare = await loadPreparation(),
    job = prepare(input.points, input.parameters);
  const pages: bigint[] = [];
  let ordinal = 0n,
    done = false;
  try {
    for (let step = 0; step < 1024 && !done; step++) {
      const result = job.nextPage();
      try {
        const data = result.data,
          origin = result.origin;
        if (data.length) {
          const adopted = preparation.adopt(s, input.token, ordinal++, data, origin);
          check(adopted.code === "ok", "actual prepared page adoption");
          pages.push(adopted.page);
        }
        done = result.done;
      } finally {
        result.free();
      }
    }
    check(done && pages.length > 0, "bounded real preparation produced geometry");
    check(preparation.complete(s, input.token, ordinal) === "ok", "canonical preparation complete");
    return pages;
  } finally {
    job.free();
  }
}
export function cancelQueryInput(s: ReplyValue, check: Check) {
  let state = edit.begin(s, 2, 500, 500, 0.5, true);
  check(state.code === "ok" && state.interaction !== 0n, "fresh active contact");
  state = edit.append(
    state,
    1n,
    new Float64Array([NaN]),
    new Float64Array([1]),
    new Float64Array([0.5]),
    new Uint8Array([1]),
  );
  check(
    state.code !== "ok" && state.activeCancelled && state.interaction === 0n,
    "cancel latch set",
  );
  return state;
}
export function queryThrows(run: () => unknown, expected: string, check: Check) {
  let caught: unknown;
  try {
    run();
  } catch (error: unknown) {
    caught = error;
  }
  check(caught === expected, `checked rejection ${expected}`);
}
export function placementQuery(s: ReplyValue, frame: bigint, stroke: bigint, page: bigint) {
  return api.memoryFramePlacement(s.owner, s.session, frame, stroke, page);
}
export function coverageQuery(s: ReplyValue, token: bigint, frame: bigint) {
  return api.memoryFramePreparationCoverage(s.owner, s.session, token, frame);
}
