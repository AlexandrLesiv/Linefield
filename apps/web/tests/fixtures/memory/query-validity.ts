import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { captureDisplay } from "../../../src/memory/current-coverage.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import {
  querySource,
  finishQueryPreparation,
  placementQuery,
  coverageQuery,
} from "./query-fixture.ts";
export async function queryValidity() {
  const { check, report } = assertions();
  for (const broad of [false, true]) {
    const f = querySource(check, broad);
    let s = f.state;
    const coverage = (token = f.input.token, frame = f.frame) =>
      take(
        () => coverageQuery(s, token, frame),
        (v) => ({ code: v.code, covered: v.page === 1n }),
      );
    try {
      check(f.input.parameters[3] === Number(broad), "positive clipped/unclipped source control");
      const incomplete = coverage();
      check(incomplete.code === "ok" && !incomplete.covered, "incomplete proof stays false");
      const pages = await finishQueryPreparation(s, f.input, check),
        page = pages[0];
      if (page === undefined) throw Error("page missing");
      check(coverage().covered, "complete proof covers captured frame");
      check(frames.placement(s, f.frame, f.stroke, page).available, "current placement available");
      for (const altered of [
        { ...s, owner: s.owner + 1n },
        { ...s, session: s.session + 1n },
      ]) {
        check(!frames.coverage(altered, f.input.token, f.frame), "coverage authority rejects");
        check(
          frames.placement(altered, f.frame, f.stroke, page).code !== "ok",
          "placement authority rejects",
        );
      }
      const display = captureDisplay(s);
      check(display.code === "ok", "positive display-only authority");
      check(
        coverage(f.input.token, display.id).code === "invalid",
        "display cannot certify coverage",
      );
      check(
        frames.placement(s, display.id, f.stroke, page).code === "invalid",
        "display cannot place canonical pages",
      );
      frames.release(s, display.id);
      check(
        frames.placement(s, f.frame, f.stroke + 1n, page).code === "stale-scene",
        "wrong source rejected",
      );
      check(
        frames.placement(s, f.frame, f.stroke, 0n).code === "stale-scene",
        "unknown page rejected",
      );
      s = edit.panBegin(s, 2, 300, 300, false);
      const origin = s;
      s = edit.panUpdate(origin, 1n, 3300, 300, false);
      s = edit.panEnd({ ...s, mapping: origin.mapping }, 1n);
      check(s.code === "ok", "captured-mapping pan accepted");
      const moved = frames.capture(s);
      check(moved.code === "ok", "new camera receipt");
      const movedCoverage = coverage(f.input.token, moved.id);
      check(
        movedCoverage.code === "ok" && movedCoverage.covered === !broad,
        "clipped-outside false; unclipped remains reusable",
      );
      frames.release(s, moved.id);
      s = edit.undo(s);
      check(s.code === "ok" && coverage().code === "stale-scene", "undone source proof rejected");
      check(
        frames.placement(s, f.frame, f.stroke, page).code === "stale-scene",
        "undone prefix placement rejected",
      );
      s = edit.undo(s, true);
      check(s.code === "ok", "restore canonical source");
      const captured = frames.placement(s, f.frame, f.stroke, page);
      check(
        captured.code === "ok" && captured.available && captured.matrix.every(Number.isFinite),
        "restored source has a valid captured placement",
      );
      s = bridge.metrics(s, 2n, 1025, 768, 1);
      const retained = frames.placement(s, f.frame, f.stroke, page);
      check(
        retained.code === captured.code &&
          retained.available === captured.available &&
          retained.matrix.every((v, i) => v === captured.matrix[i]),
        "placement retains its immutable captured view and metrics",
      );
      check(
        frames.transform(s, f.frame).code === "stale-mapping",
        "current display rejects changed metrics",
      );
      for (const id of pages) scene.release(s, id);
      const retired = placementQuery(s, f.frame, f.stroke, page);
      try {
        check(retired.code === "stale-scene" && !retired.available, "released page rejects");
        check(
          retired.matrix.every((v) => v === 0),
          "rejected placement has no stale transform",
        );
      } finally {
        retired.free();
      }
      preparation.release(s, f.input.token);
      check(coverage().code === "stale-scene", "retired token rejects");
      frames.release(s, f.frame);
      check(
        frames.placement(s, f.frame, f.stroke, page).code === "stale-scene",
        "released frame rejects",
      );
      check(bridge.read(s.owner).strokeCount === 1n, "rejections preserve completed source");
    } finally {
      closeTailFixture(s);
    }
  }
  return report();
}
