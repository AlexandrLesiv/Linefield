import type { ProgressiveScene } from "./progressive-scene.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
export function retireScene(
  renderer: GpuRenderer | undefined,
  scene: ProgressiveScene | undefined,
) {
  // The display assigns the renderer before constructing a scene, and only drops
  // either reference after this registration succeeds. A broken pairing fails closed.
  if (scene && !renderer) throw Error("scene-retirement-owner");
  // The exact owners are captured before either caller reference can be dropped.
  renderer?.dispose({
    resources: () => scene?.resources() ?? { bytes: 0, pages: 0 },
    cleanup: async () => {
      await scene?.dispose();
    },
  });
}
