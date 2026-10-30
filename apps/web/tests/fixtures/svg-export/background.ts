import { Camera } from "../../../../vector-editor/src/camera";
import type { Core } from "../../../../vector-editor/src/core";
import {
  PaperBackground,
  type PaperSettings,
} from "../../../../vector-editor/src/paper-background";
import type { View } from "./gpu";
let core: Core | undefined;
export async function prepareBackground() {
  if (!core) {
    const result = await WebAssembly.instantiate(
      await (await fetch("/core.wasm")).arrayBuffer(),
      {},
    );
    core = result.instance.exports as Core;
  }
  return core;
}
export function background(gl: WebGL2RenderingContext) {
  const paper = new PaperBackground(gl);
  return (settings: PaperSettings, view: View, width: number, height: number) => {
    if (settings.texture === "none" && settings.grid !== "none")
      throw Error("svg-transparent-grid-unsupported");
    if (!core) throw Error("svg-background-core-unprepared");
    const camera = new Camera(core);
    camera.regionX = BigInt(view.regionX ?? "0");
    camera.regionY = BigInt(view.regionY ?? "0");
    camera.cx = -view.x * view.density;
    camera.cy = -view.y * view.density;
    camera.zoom = view.density;
    paper.draw(settings, camera, width, height, width, height, null, [0, 0, width, height]);
  };
}
