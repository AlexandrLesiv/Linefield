import type { CanvasKit } from "canvaskit-wasm";
export type Handle = "context" | "surface" | "image" | "builder" | "path" | "paint";
export class Resources {
  deletionFailures = 0;
  registryFailures = 0;
  readonly live: Record<Handle, number> = {
    context: 0,
    surface: 0,
    image: 0,
    builder: 0,
    path: 0,
    paint: 0,
  };
  readonly peak = { ...this.live };
  add(kind: Handle): void {
    this.live[kind] += 1;
    this.peak[kind] = Math.max(this.peak[kind], this.live[kind]);
  }
  release(kind: Handle, object: { delete(): void } | null): void {
    if (!object) return;
    try {
      object.delete();
      this.live[kind] -= 1;
    } catch {
      this.deletionFailures += 1;
    }
  }
  snapshot(kit: CanvasKit, width: number, height: number) {
    const heap: unknown = Reflect.get(kit, "HEAPU8");
    return {
      deletionFailures: this.deletionFailures,
      registryFailures: this.registryFailures,
      live: { ...this.live },
      peak: { ...this.peak },
      canvasHeapBytes: heap instanceof Uint8Array ? heap.buffer.byteLength : null,
      backingEstimateBytes: width * height * 4 * 4,
      backingEstimate: "four RGBA backings; excludes stencil, cache and driver overhead",
    };
  }
}
