import { commandTurn } from "../../../src/memory/frame-commands.ts";
import { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import type { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { retireRenderer } from "./retire-renderer.ts";
const color = [0.2, 0.4, 0.8, 0.5];
async function release(renderer: GpuRenderer, serial: number, executor?: SparseGpu) {
  try {
    await renderer.validated(serial);
  } catch (error) {
    // A failed certificate cannot turn into optional full replay. Retire the
    // renderer before dropping the separately owned proof resources.
    await retireRenderer(renderer);
    executor?.dispose();
    throw error;
  }
  executor?.dispose();
}
export async function sparseRender(
  renderer: GpuRenderer,
  data: Float32Array,
  matrix: Float32Array,
  plan?: SparsePlan,
) {
  const gl = renderer.gl,
    r = renderer.resources;
  let executor: SparseGpu | undefined,
    serial = 0,
    geometry = 0,
    presented = 0;
  try {
    if (plan) executor = new SparseGpu(renderer);
    await renderer.slot();
    try {
      if (r.packed) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, r.staging.framebuffer);
        gl.disable(gl.SCISSOR_TEST);
        gl.colorMask(false, false, false, true);
        gl.clearColor(0, 0, 0, 96 / 255);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      renderer.begin();
      if (!plan) {
        renderer.group();
        renderer.draw(data, matrix, color);
        renderer.composite();
      }
    } finally {
      serial = renderer.check();
    }
    if (plan && executor) {
      while (geometry < plan.routes.descriptors) {
        await renderer.slot();
        const deadline = performance.now() + 2;
        let area = 0;
        try {
          while (geometry < plan.routes.descriptors && performance.now() < deadline) {
            const first = plan.storage.descriptors[geometry * 8] ?? 0;
            const next = plan.storage.projection[first * 6 + 4] ?? NaN;
            if (!Number.isSafeInteger(next) || next > 65536) throw Error("draw sample cap");
            if (area + next > 262144) break;
            executor.geometry(plan, data, matrix, color, geometry++);
            area += next;
          }
        } finally {
          serial = renderer.check();
        }
        await commandTurn();
      }
      await renderer.validated(serial);
      while (!executor.preparePresenter(plan, { deadline: performance.now() + 2, remaining: 1024 }))
        await commandTurn();
      while (presented < plan.routes.slots) {
        await renderer.slot();
        const deadline = performance.now() + 2;
        let slice = 0;
        try {
          while (presented < plan.routes.slots && slice < 64 && performance.now() < deadline) {
            const count = Math.min(16, plan.routes.slots - presented, 64 - slice);
            executor.present(plan, presented, count, color);
            presented += count;
            slice += count;
          }
        } finally {
          serial = renderer.check();
        }
        await commandTurn();
      }
    }
    await renderer.validated(serial);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, r.staging.framebuffer);
    const pixels = new Uint8Array(renderer.width * renderer.height * 4);
    gl.readPixels(0, 0, renderer.width, renderer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (gl.getError() !== gl.NO_ERROR) throw Error("sparse readback");
    if (r.packed)
      for (let i = 3; i < pixels.length; i += 4)
        if (pixels[i] !== 96) throw Error("packed alpha changed");
    return { pixels, geometry, presented };
  } finally {
    // The proof keeps both banks/G/source alive through all actual readers.
    await release(renderer, serial, executor);
  }
}
