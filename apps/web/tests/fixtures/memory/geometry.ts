import type { CanvasKit, Path } from "canvaskit-wasm";
import type { Resources } from "./canvaskit/resources.ts";
export const fixtureSeed = 0x4c463031;
export interface Scene {
  name: string;
  paths: number;
  elements: number;
}
export const scenes: Scene[] = [
  { name: "dot", paths: 1, elements: 1 },
  { name: "short", paths: 1, elements: 32 },
  { name: "long", paths: 1, elements: 65_537 },
  { name: "many", paths: 1_024, elements: 8 },
];
// Fixed synthetic paint primitives only. This is neither a TypeScript editor nor production geometry.
export function fixturePath(
  kit: CanvasKit,
  resources: Resources,
  scene: Scene,
  pathIndex: number,
): Path {
  const builder = new kit.PathBuilder();
  resources.add("builder");
  try {
    for (let index = 0; index < scene.elements; index++) {
      const position = index + pathIndex * scene.elements;
      const x = 4 + ((position * 37 + fixtureSeed) % 1000);
      const y = 4 + ((position * 53 + fixtureSeed) % 744);
      builder.addCircle(x, y, 1);
      if (scene.name !== "dot") {
        builder.moveTo(x - 1, y);
        builder.lineTo(x + 2, y);
        builder.lineTo(x + 2, y + 1);
        builder.lineTo(x - 1, y + 1);
        builder.close();
      }
    }
    const path = builder.detach();
    resources.add("path");
    return path;
  } finally {
    resources.release("builder", builder);
  }
}
export async function pixelDigest(pixels: Uint8Array | Float32Array | null): Promise<string> {
  if (!pixels) throw Error("readback unavailable");
  const copy = Uint8Array.from(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength));
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", copy));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}
