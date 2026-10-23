import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import type { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import { gpuAdmission } from "../../../src/memory/gpu-retirement.ts";
import { sparseRender } from "./sparse-render.ts";

// Controlled real-GL fault after issued sparse draws, not a synthetic planner test.
export async function sparseFailure(
  renderer: GpuRenderer,
  data: Float32Array,
  matrix: Float32Array,
  plan: SparsePlan,
) {
  const gl = renderer.gl;
  const create = gl.createTexture.bind(gl),
    remove = gl.deleteTexture.bind(gl);
  const fence = gl.fenceSync.bind(gl),
    removeFence = gl.deleteSync.bind(gl);
  const draw = gl.drawArraysInstanced.bind(gl),
    ordinary = gl.drawArrays.bind(gl);
  const error = gl.getError.bind(gl),
    dispose = renderer.dispose.bind(renderer);
  const textures = new Set<WebGLTexture>(),
    readers = new Set<WebGLSync>();
  let draws = 0,
    faults = 0,
    issued = 0,
    deleted = 0,
    retired = false;
  let faultDraws = 0,
    earlyDeletes = 0,
    replayDraws = 0,
    rejected = false;
  gl.createTexture = () => {
    const texture = create();
    if (texture) textures.add(texture);
    return texture;
  };
  gl.deleteTexture = (texture) => {
    if (texture && textures.has(texture)) {
      if (!retired || readers.size || !gpuAdmission()) earlyDeletes++;
      deleted++;
    }
    remove(texture);
  };
  gl.fenceSync = (condition, flags) => {
    const sync = fence(condition, flags);
    if (sync) {
      readers.add(sync);
      issued++;
    }
    return sync;
  };
  gl.deleteSync = (sync) => {
    if (sync) readers.delete(sync);
    removeFence(sync);
  };
  gl.drawArraysInstanced = (mode, first, count, instances) => {
    draws++;
    if (faults) replayDraws++;
    draw(mode, first, count, instances);
  };
  gl.drawArrays = (mode, first, count) => {
    if (faults) replayDraws++;
    ordinary(mode, first, count);
  };
  gl.getError = () => {
    const actual = error();
    if (actual !== gl.NO_ERROR) throw Error(`unexpected real GL error ${actual}`);
    if (draws && !retired) {
      if (!faults) faultDraws = draws;
      faults++;
      return gl.INVALID_OPERATION;
    }
    return actual;
  };
  renderer.dispose = () => {
    retired = true;
    dispose();
  };
  try {
    try {
      await sparseRender(renderer, data, matrix, plan);
    } catch {
      rejected = true;
    }
    const result = {
      rejected,
      draws,
      faultDraws,
      faults,
      issued,
      remainingReaders: readers.size,
      routeTextures: textures.size,
      deleted,
      earlyDeletes,
      replayDraws,
      retired,
      admission: gpuAdmission(),
    };
    if (
      !rejected ||
      !faults ||
      !draws ||
      issued < 2 ||
      readers.size ||
      textures.size !== 2 ||
      deleted !== 2 ||
      earlyDeletes ||
      replayDraws ||
      !retired ||
      draws !== faultDraws ||
      !result.admission
    )
      throw Error(`sparse issued-reader cleanup ${JSON.stringify(result)}`);
    return result;
  } finally {
    gl.createTexture = create;
    gl.deleteTexture = remove;
    gl.fenceSync = fence;
    gl.deleteSync = removeFence;
    gl.drawArraysInstanced = draw;
    gl.drawArrays = ordinary;
    gl.getError = error;
    renderer.dispose = dispose;
  }
}
