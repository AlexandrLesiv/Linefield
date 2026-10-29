import type { Core } from "./core";
import type { Bounds } from "./geometry-cache";
import { ViewProjection } from "./view-projection";

/** Host state adapter; shared Rust owns mapping and anchored camera arithmetic. */
export class Camera extends ViewProjection {
  regionX = 0n;
  regionY = 0n;
  originRevision = 0;
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
  rebase(): boolean {
    if (
      !this.core.camera_rebase(
        this.regionX,
        this.regionY,
        this.cx,
        this.cy,
        this.zoom,
        this.rotation,
      )
    )
      return false;
    const out = this.read(1);
    this.cx = out[0];
    this.cy = out[1];
    this.regionX = this.core.camera_origin_region(0);
    this.regionY = this.core.camera_origin_region(1);
    this.originRevision++;
    return true;
  }
  override reset() {
    super.reset();
    this.regionX = this.regionY = 0n;
    this.originRevision++;
  }
  phase(axis: number, local: number, period: number) {
    return this.core.regional_phase(axis === 0 ? this.regionX : this.regionY, local, period);
  }
  transform(px: number, py: number, scale: number, angle: number) {
    return this.regionX === 0n && this.regionY === 0n
      ? this.core.transform_update(px, py, scale, angle, 0, 0)
      : this.core.transform_update_regional(this.regionX, px, this.regionY, py, scale, angle, 0, 0);
  }
  normalizeRotation(angle: number) {
    return this.core.camera_normalize(angle);
  }
  appendSample(x: number, y: number, pressure: number): boolean {
    // Input uses the same origin as query/cache/GPU projection.
    return !!this.core.camera_push(
      x,
      y,
      this.cx,
      this.cy,
      this.zoom,
      this.rotation,
      this.regionX,
      this.regionY,
      pressure,
    );
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
