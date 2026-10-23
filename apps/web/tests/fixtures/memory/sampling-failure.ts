import { seedFixture } from "./seed-fixture.ts";
import { blit } from "../../../src/memory/gpu-pass.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { samplersRestored } from "./sampling-pixels.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function samplingFailure(canvas: HTMLCanvasElement) {
  const f = await seedFixture(canvas),
    { gl, resources: r } = f.renderer;
  const draw = gl.drawArrays.bind(gl),
    create = gl.createSampler.bind(gl);
  const deleteProgram = gl.deleteProgram.bind(gl),
    deleteSampler = gl.deleteSampler.bind(gl);
  let issued = 0,
    programs = 0,
    samplers = 0,
    rejected = false;
  try {
    await f.renderer.slot();
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.scratch.framebuffer);
    gl.colorMask(true, true, true, !r.packed);
    gl.drawArrays = (...args) => {
      draw(...args);
      issued++;
      throw Error("injected post-draw");
    };
    try {
      blit(
        gl,
        r,
        r.base.texture,
        1024,
        768,
        undefined,
        new Float32Array([1, 0, 0, 1, 0.375, 0.625]),
      );
    } catch {
      rejected = true;
    } finally {
      gl.drawArrays = draw;
    }
    samplersRestored(gl);
    await f.renderer.validated(f.renderer.check());
    if (!rejected || issued !== 1) throw Error("post-issue fault not reached");
  } finally {
    gl.drawArrays = draw;
    await f.close();
  }
  gl.deleteProgram = (value) => {
    programs++;
    deleteProgram(value);
  };
  gl.deleteSampler = (value) => {
    samplers++;
    deleteSampler(value);
  };
  Object.defineProperty(gl, "createSampler", {
    configurable: true,
    writable: true,
    value: () => null,
  });
  let allocationRejected = false;
  try {
    const unexpected = new GpuRenderer(canvas, 1024, 768);
    await retireRenderer(unexpected);
  } catch {
    allocationRejected = true;
  } finally {
    gl.createSampler = create;
  }
  try {
    if (!allocationRejected || programs !== 3 || samplers !== 0)
      throw Error("sampler allocation cleanup");
    const replacement = new GpuRenderer(canvas, 1024, 768);
    await retireRenderer(replacement);
    if (Number(samplers) !== 1) throw Error("sampler disposal");
    return {
      issued,
      allocationRejected,
      failedProgramsReleased: 3,
      samplers,
      evidence:
        "real prepared opaque draw fault and fresh renderer allocation/disposal; no geometry/mask sampling change",
    };
  } finally {
    gl.deleteProgram = deleteProgram;
    gl.deleteSampler = deleteSampler;
  }
}
