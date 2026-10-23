import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { canonicalRegion } from "./region-oracle.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { framePanReuse } from "../../../src/memory/frame-pan-reuse.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
export async function regionPhases(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    rows = [];
  for (const mode of [
    "half",
    "above",
    "below",
    "recover",
    "cancel",
    "16383",
    "16384",
    "16385",
    "basis",
    "undo",
  ] as const) {
    // Keep both input coordinates and their delta inside the canonical input bounds.
    const backing = mode.startsWith("163") ? 4 : 1;
    const f = await regionFixture(canvas, { backing });
    try {
      const source = f.base.receipt;
      check(!!source?.recipe?.eligible, "phase control starts with real certified B");
      const content = f.state().content;
      if (mode === "basis") f.update(edit.view(f.state(), Math.PI / 12, 128, 96, true));
      else if (mode === "undo") f.update(edit.undo(f.state()));
      else {
        const token = edit.panBegin(f.state(), 2, 0, 0, false);
        check(token.code === "ok", "phase Begin accepted");
        const shift =
          mode === "half" || mode === "recover" || mode === "cancel"
            ? 0.5
            : mode === "above"
              ? 1 + 2 ** -30
              : mode === "below"
                ? 1 - 2 ** -30
                : Number(mode) / backing;
        f.update(edit.panUpdate(token, 1n, shift, 0, false));
        check(f.state().code === "ok", `phase Update accepted ${mode}: ${f.state().code}`);
        let sequence = 1n;
        if (mode === "recover") {
          f.update(edit.panUpdate(token, ++sequence, 8, 0, false));
          check(f.state().code === "ok", "integral update after fractional accepted");
        }
        f.update(mode === "cancel" ? edit.cancel(token, "escape") : edit.panEnd(token, sequence));
      }
      check(f.state().code === "ok", "phase terminal accepted");
      if (mode !== "undo")
        check(f.state().content === content, "camera transitions never mutate content");
      const target = frames.capture(f.state());
      check(target.code === "ok", "phase target captured");
      let result;
      try {
        result = framePanReuse(f.state(), source!.id, target.id);
        const expected = ["recover", "cancel", "16383", "16384"].includes(mode);
        check(
          result.code === (mode === "undo" ? "stale-scene" : "ok") && result.reusable === expected,
          `integrated phase admission ${mode}: ${result.code}/${result.miss}`,
        );
        if (expected)
          check(
            result.shift[0] === (mode === "recover" ? 8 : mode === "cancel" ? 0 : Number(mode)),
            "certified shift is exact",
          );
      } finally {
        frames.release(f.state(), target.id);
      }
      let pixels;
      if (["half", "above", "below", "recover", "cancel"].includes(mode)) {
        const copies = metrics.panCompleted,
          issued = metrics.panCopies,
          attempts = metrics.panAttempts;
        f.start();
        await f.idle(true);
        check(
          metrics.panCompleted === copies + Number(mode === "recover"),
          "fractional fallback and unchanged-view Cancel issue no redundant copy",
        );
        if (mode === "cancel")
          check(
            metrics.panCopies === issued && metrics.panAttempts === attempts,
            "unchanged Cancel never attempts or issues pan copy",
          );
        pixels = await canonicalRegion(f, f.pixels(), check);
      }
      rows.push({
        mode,
        code: result.code,
        reusable: result.reusable,
        miss: result.miss,
        shift: result.shift,
        pixels,
      });
    } finally {
      await f.close();
    }
  }
  return { ...report(), rows };
}
