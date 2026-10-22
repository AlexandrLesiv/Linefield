import { target } from "./gpu-resources.ts";
export function targets(gl: WebGL2RenderingContext, width: number, height: number) {
  const owned: ReturnType<typeof target>[] = [];
  const add = (format: number) => {
    const value = target(gl, width, height, format);
    owned.push(value);
    return value;
  };
  const dispose = () => {
    for (const value of owned) value.dispose();
    owned.length = 0;
  };
  try {
    const mask = add(gl.R8),
      overlayMask = add(gl.R8),
      staging = add(gl.RGB8),
      base = add(gl.RGB8);
    if (gl.getError() !== gl.NO_ERROR) throw Error("gpu-target");
    return { mask, overlayMask, staging, base, packed: false, dispose };
  } catch {
    dispose();
    if (gl.isContextLost()) throw Error("gpu-resource");
    // Optional formats failed. Clear that allocation error before the complete RGBA path.
    gl.getError();
    try {
      const staging = add(gl.RGBA8),
        base = add(gl.RGBA8);
      if (gl.getError() !== gl.NO_ERROR) throw Error("gpu-target");
      return { mask: staging, overlayMask: base, staging, base, packed: true, dispose };
    } catch (error) {
      dispose();
      throw error;
    }
  }
}
