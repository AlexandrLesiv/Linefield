import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function tailComposite(canvas: HTMLCanvasElement) {
  const renderer = new GpuRenderer(canvas, 256, 256);
  const gl = renderer.gl;
  const matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
  const stable = new Float32Array([40, 128, 24, 128, 128, 24]);
  const front = new Float32Array([112, 128, 24, 210, 128, 24]);
  const next = new Float32Array([128, 40, 24, 128, 210, 24]);
  const red = [1, 0, 0, 0.5],
    blue = [0, 0, 1, 0.5];
  const pixels = () => {
    const value = new Uint8Array(256 * 256 * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, value);
    return value;
  };
  const equal = (a: Uint8Array, b: Uint8Array, label: string) => {
    if (a.some((v, i) => v !== b[i])) throw Error(label);
  };
  renderer.begin();
  renderer.publish();
  const live = renderer.live();
  live.stable.draw(stable, matrix, red);
  live.back.draw(front, matrix, red);
  live.publishBack();
  const display = (secondary: boolean, shift = 0) => {
    const pass = renderer.overlay(undefined, true, false);
    live.display(red, new Float32Array([1, 0, 0, 1, shift, 0]));
    if (secondary) {
      live.resetBack();
      pass.group();
      pass.draw(next, new Float32Array([1, 0, 0, 1, shift, 0]), blue);
      pass.composite();
    }
    return pixels();
  };
  const c = display(false),
    cd = display(true);
  const overlap = [...cd.slice((127 * 256 + 128) * 4, (127 * 256 + 128) * 4 + 4)];
  if (overlap.some((v, i) => Math.abs(v - ([128, 64, 191, 255][i] ?? 0)) > 1))
    throw Error(`source-over overlap ${overlap}`);
  equal(display(false), c, "secondary cancellation preserves retained front");
  const moved = display(true, 16);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 240; x++)
      for (let channel = 0; channel < 4; channel++)
        if (moved[(y * 256 + x + 16) * 4 + channel] !== cd[(y * 256 + x) * 4 + channel])
          throw Error("shared raster pan alignment");
  equal(display(true), cd, "pan cancellation restores painter order");
  await renderer.slot();
  // Canonical source-order rendering must match the provisional live composition exactly.
  renderer.begin();
  renderer.group();
  renderer.draw(stable, matrix, red);
  renderer.draw(front, matrix, red);
  renderer.composite();
  renderer.group();
  renderer.draw(next, matrix, blue);
  renderer.composite();
  renderer.publish();
  equal(pixels(), cd, "canonical separate-group parity");
  const packed = renderer.resources.packed;
  await retireRenderer(renderer);
  return {
    cases: 5,
    packed,
    overlap,
    scope: "renderer-boundary synthetic RGBA groups; no opacity UI or command replay claim",
  };
}
