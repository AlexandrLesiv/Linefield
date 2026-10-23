import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { canonicalRegion } from "./region-oracle.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
export async function regionAlpha(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    f = await regionFixture(canvas),
    gl = f.renderer.gl;
  const begin = f.renderer.begin.bind(f.renderer),
    draw = gl.drawArrays.bind(gl);
  let sentinel: Uint8Array | undefined,
    copies = 0;
  f.renderer.begin = (clear, regions) => {
    begin(clear, regions);
    if (!regions || !f.renderer.resources.packed) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.renderer.resources.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(false, false, false, true);
    gl.clearColor(0, 0, 0, 0.375);
    gl.clear(gl.COLOR_BUFFER_BIT);
    sentinel = f.pixels();
  };
  gl.drawArrays = (...args) => {
    draw(...args);
    if (args[2] !== 3) return;
    copies++;
    if (f.renderer.resources.packed) {
      check(
        !!sentinel && sentinel.some((v, i) => i % 4 === 3 && v > 0 && v < 255),
        "nontrivial packed-alpha sentinel exists before copy",
      );
      const after = f.pixels();
      check(
        after.every((v, i) => i % 4 !== 3 || v === sentinel?.[i]),
        "copy and paper clear preserve every packed-alpha texel",
      );
    }
  };
  try {
    f.pan(24, 16);
    f.start();
    await f.idle(true);
    check(copies === 1, "actual region copy reached alpha oracle");
    await canonicalRegion(f, f.pixels(), check);
    f.promote();
    f.renderer.resources.baseGeneration = Number.MAX_SAFE_INTEGER;
    const texture = f.renderer.resources.base.texture;
    f.renderer.promote();
    f.renderer.promote();
    check(
      !f.renderer.resources.baseReusable &&
        f.renderer.resources.baseGeneration === Number.MAX_SAFE_INTEGER,
      "generation exhaustion disables reuse without wrap or failed promotion",
    );
    check(
      f.renderer.resources.base.texture === texture,
      "exhaustion test restores actual B allocation",
    );
    const completed = metrics.panCompleted;
    f.pan(-8);
    f.start();
    await f.idle(true);
    check(
      metrics.panCompleted === completed && copies === 1,
      "exhausted generation never copies and ordinary reconstruction succeeds",
    );
    const pixels = await canonicalRegion(f, f.pixels(), check);
    return { ...report(), packed: f.renderer.resources.packed, copies, pixels };
  } finally {
    f.renderer.begin = begin;
    gl.drawArrays = draw;
    await f.close();
  }
}
