import type { Core } from "./core";
import type { Bounds } from "./geometry-cache";
import { ViewProjection } from "./view-projection";

/** Host state adapter; shared Rust owns mapping and anchored camera arithmetic. */
export class Camera extends ViewProjection {
  private output: Float64Array | undefined;
  constructor(private core: Core) {
    super();
  }
  private read(ok: number): Float64Array {
    if (!ok) throw new Error("Invalid camera transform");
    // Memory growth detaches views; never retain a stale borrowed Wasm view.
    if (this.output?.buffer !== this.core.memory.buffer)
      this.output = new Float64Array(this.core.memory.buffer, this.core.camera_output_ptr(), 3);
    return this.output;
  }
  normalizeRotation(angle: number) {
    return this.core.camera_normalize(angle);
  }
  screenToWorld(x: number, y: number): [number, number] {
    const out = this.read(this.core.camera_map(x, y, this.cx, this.cy, this.zoom, this.rotation));
    return [out[0], out[1]];
  }
  zoomAt(next: number, x: number, y: number) {
    const out = this.read(this.core.camera_zoom(x, y, this.cx, this.cy, this.zoom, next));
    this.cx = out[0];
    this.cy = out[1];
    this.zoom = out[2];
  }
  rotateAt(angle: number, x: number, y: number) {
    const out = this.read(
      this.core.camera_rotate(x, y, this.cx, this.cy, this.zoom, this.rotation, angle),
    );
    this.cx = out[0];
    this.cy = out[1];
    this.rotation = out[2];
  }
  bounds(width: number, height: number, pad: number): Bounds {
    // The rotated viewport is a world-space quadrilateral. Its enclosing AABB
    // is conservative for the existing spatial grid, including all four corners.
    const corners = [
      this.screenToWorld(0, 0),
      this.screenToWorld(width, 0),
      this.screenToWorld(0, height),
      this.screenToWorld(width, height),
    ];
    return [
      Math.min(...corners.map(([x]) => x)) - pad,
      Math.min(...corners.map(([, y]) => y)) - pad,
      Math.max(...corners.map(([x]) => x)) + pad,
      Math.max(...corners.map(([, y]) => y)) + pad,
    ];
  }
}
