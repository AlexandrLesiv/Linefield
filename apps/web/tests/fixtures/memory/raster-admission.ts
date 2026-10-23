import { check, rasterFixture } from "./raster-host.ts";
export function rasterAdmission() {
  const f = rasterFixture(2, 0.05, Math.PI / 12, true);
  const rows = [];
  const sameView = (a: ReturnType<typeof f.view>, b: ReturnType<typeof f.view>) =>
    a.regionX === b.regionX &&
    a.regionY === b.regionY &&
    a.localX === b.localX &&
    a.localY === b.localY;
  try {
    const begin = f.begin();
    const token = f.token();
    const first = f.update(1n, 1);
    const second = f.update(2n, 2);
    check(
      first.mapping !== begin.mapping && second.mapping !== first.mapping,
      "two accepted updates advance projection",
      { begin, first, second },
    );
    check(
      first.interaction === begin.interaction && second.interaction === begin.interaction,
      "accepted Begin interaction retained",
      { begin, first, second },
    );
    const wrong = f.updateResult(3n, 3, 0, { interaction: token.interaction + 1n });
    check(
      wrong.code === "stale-interaction" && !wrong.cancelled && wrong.x === second.x,
      "wrong interaction rejects without probe update",
      wrong,
    );
    const stale = f.updateResult(3n, 3, 0, { mapping: BigInt(second.mapping) });
    check(
      stale.code === "stale-mapping" &&
        !stale.cancelled &&
        stale.interaction === second.interaction &&
        stale.x === second.x,
      "projection mapping cannot replace Begin mapping",
      stale,
    );
    const sequence = f.updateResult(2n, 3);
    check(
      sequence.code === "sequence" &&
        !sequence.cancelled &&
        sequence.interaction === second.interaction &&
        sequence.x === second.x,
      "nonincreasing Update does not cancel",
      sequence,
    );
    const third = f.update(3n, 3);
    const end = f.terminal(3n);
    check(
      end.interaction === "0" && !end.cancelled && end.epoch === begin.epoch && end.x === 6,
      "End accepts original Begin token",
      end,
    );
    rows.push(begin, first, second, wrong, stale, sequence, third, end);
    for (const cause of ["terminal-sequence", "update-range"] as const) {
      const before = f.view();
      const saved = f.begin();
      const old = f.token();
      const moved = f.update(1n, 4);
      check(moved.x !== saved.x, "positive move before implicit cancel", moved);
      const result =
        cause === "terminal-sequence" ? f.terminalResult(2n) : f.updateResult(2n, 9000);
      check(
        result.code === (cause === "terminal-sequence" ? "sequence" : "invalid") &&
          result.cancelled &&
          result.interaction === "0",
        "actual shared implicit cancellation",
        result,
      );
      check(
        result.epoch === saved.epoch &&
          result.x === saved.x &&
          result.y === saved.y &&
          result.enabled === saved.enabled,
        "implicit cancellation restores exact probe prestate",
        { saved, result },
      );
      check(
        sameView(before, f.view()),
        "implicit cancellation restores far canonical prestate",
        result,
      );
      const fresh = f.begin();
      check(
        fresh.epoch === saved.epoch && fresh.interaction !== saved.interaction,
        "fresh Begin preserves restored lineage",
        fresh,
      );
      const late = f.updateResult(2n, 5, 0, old);
      check(
        late.code === "stale-interaction" &&
          !late.cancelled &&
          late.interaction === fresh.interaction &&
          late.x === fresh.x,
        "late old token cannot disturb fresh Begin",
        late,
      );
      const freshMove = f.update(1n, 1);
      f.terminal(1n, true);
      rows.push({ cause, saved, moved, result, fresh, late, freshMove });
    }
    return rows;
  } finally {
    f.dispose();
  }
}
