import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
export async function seedRender(canvas: HTMLCanvasElement, invisible: boolean) {
  const { check, report } = assertions(),
    f = await seedFixture(canvas);
  const gl = f.renderer.gl,
    draw = gl.drawArraysInstanced.bind(gl),
    wait = gl.clientWaitSync.bind(gl);
  let draws = 0,
    polls = 0,
    hold = true;
  gl.drawArraysInstanced = (...args) => {
    draws++;
    draw(...args);
  };
  try {
    f.update(edit.style(f.state(), 20, [0.2, 0.4, 0.8, 0.35]));
    f.append(invisible ? -2000 : 450);
    const copies = metrics.prefixSeedCopies;
    gl.clientWaitSync = (sync, flags, timeout) => {
      polls++;
      const result = wait(sync, flags, timeout);
      return hold ? gl.TIMEOUT_EXPIRED : result;
    };
    const serial = await f.seed();
    check(metrics.prefixSeedCopies === copies + 1, "actual B to S copy issued");
    check(
      frames.transform(f.state(), f.prefix.id).code === "ok",
      "base replacement retains borrowed predecessor",
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
    check(
      polls > 0 && f.candidate.busy && !f.candidate.ready,
      "copy covering serial blocks readiness even without visible successor",
    );
    hold = false;
    await f.idle();
    check(
      f.candidate.ready && metrics.validatedSubmissions >= serial,
      "candidate validated after copy covering serial",
    );
    check(
      frames.transform(f.state(), f.prefix.id).code === "stale-scene",
      "predecessor released after producer cursor cleanup",
    );
    const seeded = f.pixels(),
      seedDraws = draws;
    const full = frames.capture(f.state());
    check(full.code === "ok", "independent full reference capture");
    try {
      draws = 0;
      check(
        await buildFrame(
          f.state,
          f.cache,
          f.renderer,
          full,
          1,
          () => true,
          new AbortController().signal,
        ),
        "independent full rebuild complete",
      );
      check(
        f.pixels().every((v, i) => i % 4 === 3 || v === seeded[i]),
        "seed and full rebuild exact RGB parity",
      );
      check(draws > seedDraws, "actual old-prefix draws avoided");
      if (invisible) check(seedDraws === 0, "invisible successor positive zero draw control");
      return {
        ...report(),
        invisible,
        seedDraws,
        fullDraws: draws,
        packed: f.renderer.resources.packed,
      };
    } finally {
      frames.release(f.state(), full.id);
    }
  } finally {
    hold = false;
    gl.clientWaitSync = wait;
    gl.drawArraysInstanced = draw;
    await f.close();
  }
}
