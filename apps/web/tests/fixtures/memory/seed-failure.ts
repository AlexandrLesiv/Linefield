import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
export async function seedFailure(canvas: HTMLCanvasElement, phase: "before" | "after" | "draw") {
  const { check, report } = assertions(),
    f = await seedFixture(canvas);
  const gl = f.renderer.gl,
    copy = gl.drawArrays.bind(gl),
    draw = f.renderer.draw.bind(f.renderer);
  let injected = 0;
  try {
    f.append();
    if (phase === "draw")
      f.renderer.draw = (...args) => {
        injected++;
        draw(...args);
        throw Error("stale-scene");
      };
    else
      gl.drawArrays = (...args) => {
        if (gl.getParameter(gl.CURRENT_PROGRAM) === f.renderer.resources.seed) {
          injected++;
          if (phase === "after") copy(...args);
          throw Error("stale-scene");
        }
        copy(...args);
      };
    await f.seed();
    await f.idle();
    check(injected === 1, "positive fault at actual seed phase");
    check(
      !f.candidate.ready && !f.candidate.receipt,
      "seed failure never adopts source B as ready S",
    );
    check(
      frames.transform(f.state(), f.prefix.id).code === "stale-scene",
      "borrowed predecessor drains after failed candidate cleanup",
    );
    gl.drawArrays = copy;
    f.renderer.draw = draw;
    f.candidate.start(1);
    await f.idle();
    check(f.candidate.ready, "fresh full reconstruction recovers");
    check(
      f.pixels().some((v, i) => i % 4 !== 3 && v < 240),
      "recovered source visibly rendered",
    );
    return { ...report(), phase, injected, completed: metrics.prefixSeedCompleted };
  } finally {
    gl.drawArrays = copy;
    f.renderer.draw = draw;
    await f.close();
  }
}
