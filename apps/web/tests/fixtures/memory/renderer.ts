import CanvasKitInit from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
let renderer: ReturnType<typeof CanvasKitInit> | undefined;
export function loadRenderer() {
  renderer ??= CanvasKitInit({ locateFile: () => canvasWasm }).catch((error: unknown) => {
    renderer = undefined;
    throw error;
  });
  return renderer;
}
