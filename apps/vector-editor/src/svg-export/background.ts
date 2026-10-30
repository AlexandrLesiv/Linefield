import { Camera } from "../camera";
import type { Core } from "../core";
import { PaperBackground } from "../paper-background";
import type { ExportView } from "./types";
export async function createBackground(
  gl: WebGL2RenderingContext,
  url: string,
  permit: () => Promise<void>,
) {
  const response = await fetch(url);
  if (!response.ok) throw Error("svg-background-unavailable");
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  const core = instance.exports as Core;
  if (typeof core.regional_phase !== "function") throw Error("svg-background-boundary");
  await permit();
  const paper = new PaperBackground(gl),
    camera = new Camera(core);
  return (view: ExportView) => {
    if (!view.paper && view.grid) throw Error("svg-transparent-grid-unsupported");
    camera.regionX = BigInt(view.regionX);
    camera.regionY = BigInt(view.regionY);
    camera.cx = -view.x * view.density;
    camera.cy = -view.y * view.density;
    camera.zoom = view.density;
    const width = view.pixelWidth,
      height = view.pixelHeight;
    if (view.paper === 3) {
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    paper.draw(
      {
        texture: view.paper === 1 ? "warm" : view.paper === 2 ? "white" : "none",
        grid: view.grid === 1 ? "notebook" : view.grid === 2 ? "dots" : "none",
      },
      camera,
      width,
      height,
      width,
      height,
      null,
      [0, 0, width, height],
    );
  };
}
