import type { CanvasKit, GrDirectContext, Surface, WebGLContextHandle } from "canvaskit-wasm";
import { Resources } from "./resources.ts";
export type SurfaceFactory = (
  kit: CanvasKit,
  context: GrDirectContext,
  width: number,
  height: number,
) => Surface | null;
export const stagingSurface: SurfaceFactory = (kit, context, width, height) =>
  kit.MakeRenderTarget(context, {
    width,
    height,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Premul,
    colorSpace: kit.ColorSpace.SRGB,
  });
export class SurfaceOwner {
  readonly resources = new Resources();
  handle: WebGLContextHandle | null = null;
  context: GrDirectContext | null = null;
  front: Surface | null = null;
  staging: Surface | null = null;
  readonly kit: CanvasKit;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly factory: SurfaceFactory;
  constructor(
    kit: CanvasKit,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    factory: SurfaceFactory = stagingSurface,
  ) {
    this.kit = kit;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.factory = factory;
    try {
      canvas.width = width;
      canvas.height = height;
      this.handle = kit.GetWebGLContext(canvas, { depth: 0, antialias: 0, stencil: 1 });
      if (!(this.handle > 0)) throw Error("display-unavailable");
      this.context = kit.MakeWebGLContext(this.handle);
      if (!this.context) throw Error("display-unavailable");
      this.resources.add("context");
      this.front = kit.MakeOnScreenGLSurface(this.context, width, height, kit.ColorSpace.SRGB);
      if (!this.front) throw Error("display-unavailable");
      this.resources.add("surface");
      this.replaceStaging();
    } catch (error: unknown) {
      this.dispose();
      throw error;
    }
  }
  replaceStaging(): void {
    this.resources.release("surface", this.staging);
    this.staging = null;
    if (!this.context) throw Error("display-unavailable");
    this.staging = this.factory(this.kit, this.context, this.width, this.height);
    if (!this.staging) throw Error("display-unavailable");
    this.resources.add("surface");
  }
  dispose(): void {
    this.resources.release("surface", this.staging);
    this.staging = null;
    this.resources.release("surface", this.front);
    this.front = null;
    this.resources.release("context", this.context);
    this.context = null;
    if (this.handle !== null && this.handle > 0) {
      try {
        this.kit.deleteContext(this.handle);
      } catch {
        this.resources.registryFailures += 1;
      }
    }
    this.handle = null;
  }
}
