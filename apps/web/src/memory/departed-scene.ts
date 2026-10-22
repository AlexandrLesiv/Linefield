import type { ProgressiveScene } from "./progressive-scene.ts";

export function disposeDepartedScene(scene: ProgressiveScene | undefined) {
  try {
    scene?.dispose();
  } catch {
    // Session departure already retires its derived Rust descriptors.
  }
}
