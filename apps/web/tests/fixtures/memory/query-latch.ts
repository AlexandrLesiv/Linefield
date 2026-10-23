import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import {
  querySource,
  finishQueryPreparation,
  cancelQueryInput,
  queryThrows,
  placementQuery,
  coverageQuery,
} from "./query-fixture.ts";
export async function queryLatch() {
  const { check, report } = assertions(),
    f = querySource(check),
    pages = await finishQueryPreparation(f.state, f.input, check),
    page = pages[0];
  if (page === undefined) throw Error("page missing");
  const before = bridge.read(f.state.owner);
  check(
    before.derivedCharge > f.initialCharge,
    "ordinary State accounts newly allocated proof/page storage",
  );
  let s = cancelQueryInput(f.state, check);
  const unchanged = (v: api.Reply) => {
    check(v.activeCancelled, "read query preserves positive latch");
    check(
      v.owner === s.owner &&
        v.session === s.session &&
        v.content === s.content &&
        v.scene === s.scene &&
        v.mapping === s.mapping &&
        v.presentation === s.presentation &&
        v.interaction === 0n,
      "query preserves captured semantic identities",
    );
  };
  try {
    const placement = placementQuery(s, f.frame, f.stroke, page);
    try {
      unchanged(placement);
      check(placement.code === "ok" && placement.available, "successful placement");
      const matrix = placement.matrix;
      check(matrix.length === 6 && matrix.every(Number.isFinite), "finite copied transform");
      queryThrows(() => placement.matrix, "snapshot-consumed", check);
      queryThrows(() => coverageQuery(s, f.input.token, f.frame), "boundary-capacity", check);
      unchanged(placement);
    } finally {
      placement.free();
    }
    const coverage = coverageQuery(s, f.input.token, f.frame);
    try {
      unchanged(coverage);
      check(coverage.code === "ok" && coverage.page === 1n, "successful complete coverage");
      queryThrows(() => placementQuery(s, f.frame, f.stroke, page), "boundary-capacity", check);
    } finally {
      coverage.free();
    }
    for (const kind of ["placement", "coverage"] as const) {
      const invalid =
        kind === "placement"
          ? placementQuery(s, 0n, f.stroke, page)
          : coverageQuery(s, 0n, f.frame);
      try {
        check(invalid.code === "stale-scene", "typed stale query rejection");
        unchanged(invalid);
      } finally {
        invalid.free();
      }
      for (const owner of [Number(s.owner), -1n, 1n << 64n, "1"]) {
        const raw: unknown = Reflect.apply(
          kind === "placement" ? api.memoryFramePlacement : api.memoryFramePreparationCoverage,
          undefined,
          kind === "placement"
            ? [owner, s.session, f.frame, f.stroke, page]
            : [owner, s.session, f.input.token, f.frame],
        );
        if (!(raw instanceof api.PlacementSnapshot || raw instanceof api.PreparationSnapshot))
          throw Error("typed query wrapper missing");
        try {
          check(raw.code === "invalid", "malformed JS ID rejected without coercion");
          unchanged(raw);
          if (raw instanceof api.PlacementSnapshot)
            check(!raw.available && raw.matrix.every((v) => v === 0), "default placement payload");
          else
            check(raw.page === 0n && raw.token === 0n && raw.points.length === 0, "default proof");
        } finally {
          raw.free();
        }
      }
    }
    const rejected = take(() => api.memoryUndo(s.owner, s.session + 1n), copyReply);
    check(
      rejected.code === "stale-session" && !rejected.activeCancelled,
      "ordinary rejection resets latch",
    );
    const reset = coverageQuery(s, f.input.token, f.frame);
    try {
      check(reset.code === "ok" && !reset.activeCancelled, "query does not replay cancellation");
    } finally {
      reset.free();
    }
    s = cancelQueryInput(s, check);
    const state = bridge.read(s.owner);
    check(!state.activeCancelled, "ordinary State read resets latch");
    check(
      state.strokeCount === before.strokeCount &&
        state.content === before.content &&
        state.canUndo === before.canUndo &&
        state.canRedo === before.canRedo &&
        state.historyCharge === before.historyCharge,
      "queries and cancelled fresh input preserve canonical source/history",
    );
    check(scene.stroke(s, f.stroke).count === 2n, "completed sample count preserved");
    for (const id of pages) scene.release(s, id);
    check(
      bridge.read(s.owner).derivedCharge === state.derivedCharge,
      "released descriptors retain allocated capacity charge",
    );
    s = edit.undo(s);
    check(bridge.read(s.owner).strokeCount === 0n, "one completed source is one Undo");
    return report();
  } finally {
    closeTailFixture(s);
  }
}
