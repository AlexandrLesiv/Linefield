import { seedFixture } from "./seed-fixture.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { blit } from "../../../src/memory/gpu-pass.ts";
import {
  samplingPixels,
  samplingDifference,
  samplingImage,
  samplersRestored,
} from "./sampling-pixels.ts";
export async function displaySampling(canvas: HTMLCanvasElement) {
  const rows = [];
  for (const mode of ["identity", "integer", "fractional", "rotate"]) {
    const f = await seedFixture(canvas),
      renderer = f.renderer;
    const { gl, resources: r, width, height } = renderer;
    const bind = gl.bindSampler.bind(gl);
    let sampled = 0;
    try {
      const source = samplingPixels(renderer, r.base.framebuffer);
      if (mode === "rotate") f.update(edit.view(f.state(), Math.PI / 12, 512, 384, true));
      else if (mode !== "identity") {
        f.update(edit.panBegin(f.state(), 1, 400, 400, false));
        f.update(
          edit.panUpdate(
            f.state(),
            1n,
            mode === "integer" ? 431 : 400.375,
            mode === "integer" ? 417 : 400.625,
            false,
          ),
        );
      }
      if (!["ok", "noop"].includes(f.state().code)) throw Error("accepted view");
      const transform = frames.displayTransform(f.state(), f.prefix.id);
      if (transform.code !== "ok") throw Error("captured bitmap transform");
      async function display(nearest: boolean) {
        await renderer.slot();
        gl.bindFramebuffer(gl.FRAMEBUFFER, r.scratch.framebuffer);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.colorMask(true, true, true, true);
        gl.clearColor(1, 1, 1, 96 / 255);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.colorMask(true, true, true, !r.packed);
        gl.bindSampler = (unit, sampler) => {
          if (sampler && !nearest) sampled++;
          bind(unit, nearest ? null : sampler);
        };
        try {
          blit(gl, r, r.base.texture, width, height, undefined, transform.matrix);
        } finally {
          gl.bindSampler = bind;
        }
        samplersRestored(gl);
        await renderer.validated(renderer.check());
        const pixels = samplingPixels(renderer, r.scratch.framebuffer);
        if (r.packed && pixels.some((v, i) => i % 4 === 3 && v !== 96))
          throw Error("packed alpha sentinel changed");
        for (const offset of [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          (width * height - 1) * 4,
        ])
          if (pixels[offset] !== 255 || pixels[offset + 1] !== 255 || pixels[offset + 2] !== 255)
            throw Error("paper edge seam");
        return pixels;
      }
      const nearest = await display(true),
        actual = await display(false);
      f.candidate.start(1);
      await f.idle();
      if (!f.candidate.ready) throw Error("canonical candidate not ready");
      const canonical = f.pixels();
      const comparison = samplingDifference(actual, nearest);
      const baseline = samplingDifference(nearest, canonical),
        filtered = samplingDifference(actual, canonical);
      const unchanged = samplingDifference(samplingPixels(renderer, r.base.framebuffer), source);
      const captures = {
        nearest: await samplingImage(renderer, nearest),
        filtered: await samplingImage(renderer, actual),
        canonical: await samplingImage(renderer, canonical),
      };
      const row = {
        mode,
        packed: r.packed,
        matrix: Array.from(transform.matrix),
        sampled,
        comparison,
        baseline,
        filtered,
        unchanged,
        captures,
      };
      rows.push(row);
      if (!filtered.ink || unchanged.changed)
        throw Error(`source/pixel control ${JSON.stringify(row)}`);
      if (["identity", "integer"].includes(mode)) {
        if (
          sampled ||
          comparison.changed ||
          (mode === "identity" && filtered.changed) ||
          filtered.changed !== baseline.changed ||
          filtered.maximum !== baseline.maximum ||
          filtered.total !== baseline.total
        )
          throw Error(`exact copy parity ${JSON.stringify(row)}`);
      } else if (!sampled || !comparison.changed || filtered.total >= baseline.total)
        throw Error(`sampling improvement ${JSON.stringify(row)}`);
    } finally {
      gl.bindSampler = bind;
      await f.close();
    }
  }
  return {
    rows,
    evidence:
      "same actual source B and Rust transform; isolated NEAREST control vs opaque RGB sampler and canonical rebuild; RGB error improvement is not geometric AA tolerance",
  };
}
