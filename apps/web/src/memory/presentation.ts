import type { Canvas, CanvasKit, Image, Surface } from "canvaskit-wasm";
import { SurfaceOwner } from "./surface.ts";
import type { SurfaceFactory } from "./surface.ts";
import { renderResources, renderSnapshot } from "./render-metrics.ts";
export type PublishFrame = (kit: CanvasKit, surface: Surface, image: Image) => void;
export const publishFrame: PublishFrame = (kit, surface, image) => {
  surface.getCanvas().clear(kit.WHITE);
  surface.getCanvas().drawImage(image, 0, 0);
  surface.flush();
};
export class Presentation {
  readonly publish: PublishFrame;
  lastFrameRestored = false;
  readonly owner: SurfaceOwner;
  private image: Image | null = null;
  private disposed = false;
  constructor(
    kit: CanvasKit,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    factory?: SurfaceFactory,
    publish: PublishFrame = publishFrame,
  ) {
    this.publish = publish;
    this.owner = new SurfaceOwner(kit, canvas, width, height, factory);
  }
  render(draw: (canvas: Canvas) => void = () => {}): void {
    this.lastFrameRestored = false;
    const { kit, staging, front } = this.owner;
    if (this.disposed || !staging || !front) throw Error("display-unavailable");
    const canvas = staging.getCanvas();
    canvas.clear(kit.WHITE);
    draw(canvas);
    this.commit();
  }
  commit(): void {
    const { staging, front, resources } = this.owner;
    if (this.disposed || !staging || !front) throw Error("display-unavailable");
    staging.flush();
    const next = renderSnapshot(() => staging.makeImageSnapshot());
    if (!next) throw Error("display-unavailable");
    resources.add("image");
    try {
      this.publish(this.owner.kit, front, next);
      this.lastFrameRestored = false;
    } catch (error: unknown) {
      resources.release("image", next);
      if (this.image) {
        try {
          this.publish(this.owner.kit, front, this.image);
          this.lastFrameRestored = true;
        } catch {
          this.lastFrameRestored = false;
        }
      }
      throw error;
    }
    resources.release("image", this.image);
    this.image = next;
  }
  preview(draw: (canvas: Canvas) => void): void {
    const { kit, front, staging, resources } = this.owner;
    if (this.disposed || !front || !staging || !this.image) throw Error("display-unavailable");
    const canvas = front.getCanvas();
    staging.flush();
    const baseline = renderSnapshot(() => staging.makeImageSnapshot());
    if (!baseline) throw Error("display-unavailable");
    resources.add("image");
    try {
      canvas.clear(kit.WHITE);
      canvas.drawImage(baseline, 0, 0);
    } finally {
      resources.release("image", baseline);
    }
    try {
      draw(canvas);
      // Capture before swap: the browser may discard its onscreen drawing buffer afterward.
      const next = renderSnapshot(() => front.makeImageSnapshot());
      if (!next) throw Error("display-unavailable");
      resources.add("image");
      resources.release("image", this.image);
      this.image = next;
      front.flush();
    } catch (error: unknown) {
      this.publish(kit, front, this.image);
      throw error;
    }
  }
  restore(): void {
    if (this.image && this.owner.front && !this.disposed) this.commit();
  }
  freezeFront(): void {
    if (this.disposed || !this.owner.front || !this.image) throw Error("display-unavailable");
  }
  translate(x: number, y: number, outside: boolean): void {
    const { kit, front } = this.owner;
    if (this.disposed || !front || !this.image) throw Error("display-unavailable");
    const canvas = front.getCanvas();
    canvas.clear(kit.WHITE);
    if (!outside) canvas.drawImage(this.image, x, y);
    front.flush();
  }
  replaceStaging(): void {
    this.owner.replaceStaging();
  }
  stats() {
    return this.owner.resources.snapshot(this.owner.kit, this.owner.width, this.owner.height);
  }
  pixels(): Uint8Array | Float32Array | null {
    if (!this.image || this.disposed) return null;
    const { kit, width, height } = this.owner;
    return this.image.readPixels(0, 0, {
      width,
      height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    });
  }
  frontPixels(): Uint8Array | Float32Array | null {
    const { kit, width, height, front } = this.owner;
    if (!front || this.disposed) return null;
    return front.getCanvas().readPixels(0, 0, {
      width,
      height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.owner.resources.release("image", this.image);
    this.image = null;
    this.owner.dispose();
    renderResources(this.owner.resources);
  }
}
