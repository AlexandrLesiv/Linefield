import type { Locator } from "@playwright/test";
export async function recoveryFault(canvas: Locator, phase: "sampler" | "target") {
  return canvas.evaluateHandle((node, faultPhase) => {
    if (!(node instanceof HTMLCanvasElement)) throw Error("canvas");
    const gl = node.getContext("webgl2");
    if (!gl) throw Error("WebGL2");
    const getError = gl.getError.bind(gl),
      createTexture = gl.createTexture.bind(gl),
      createSampler = gl.createSampler.bind(gl),
      deleteSampler = gl.deleteSampler.bind(gl);
    const created = new Set<WebGLSampler>();
    const state = { fail: true, allocations: 0, attempts: 0, deleted: 0, injected: 0 };
    let samplerValidation = false;
    gl.getError = () => {
      if (samplerValidation) {
        samplerValidation = false;
        return getError();
      }
      if (!state.fail) return getError();
      state.injected++;
      return gl.OUT_OF_MEMORY;
    };
    gl.createTexture = () => {
      state.allocations++;
      return createTexture();
    };
    gl.createSampler = () => {
      state.attempts++;
      const sampler = createSampler();
      if (sampler) created.add(sampler);
      // The target phase passes only the sampler's own immediate validation.
      samplerValidation = faultPhase === "target";
      return sampler;
    };
    gl.deleteSampler = (sampler) => {
      if (sampler && created.delete(sampler)) state.deleted++;
      deleteSampler(sampler);
    };
    return state;
  }, phase);
}
