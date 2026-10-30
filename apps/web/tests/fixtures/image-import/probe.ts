import { reference } from "./reference";
import { Decoder } from "./decode";
import { inspect } from "./header";
import { Ink } from "./ink";
import { Renderer } from "./renderer";
import {
  MAX_PIXELS,
  MAX_TOTAL_PIXELS,
  texturePixels,
  type DecodeMode,
  type Item,
  type View,
} from "./types";
export class ImageProbe {
  private decoder = new Decoder();
  private renderer = new Renderer();
  private ink: Ink | undefined;
  private assets = new Map<number, ImageBitmap>();
  private serial = 0;
  private generation = 0;
  private busy = false;
  private abortGate: (() => void) | undefined;
  private totalPixels = 0;
  private gate: () => Promise<void> = () => Promise.resolve();
  setUploadGate(gate: () => Promise<void>) {
    this.gate = gate;
  }
  async importBlob(blob: Blob, mode: DecodeMode, sampling: "linear" | "mipmap" = "linear") {
    if (this.busy) throw Error("image-busy");
    if (mode !== "main" && mode !== "worker") throw Error("image-mode");
    if (sampling !== "linear" && sampling !== "mipmap") throw Error("image-sampling");
    this.busy = true;
    const generation = this.generation,
      start = performance.now();
    let image: ImageBitmap | undefined;
    const current = () => {
      if (generation !== this.generation) throw Error("image-cancelled");
    };
    try {
      const header = await inspect(blob),
        headerMs = performance.now() - start;
      current();
      const gpuPixels = texturePixels(header.width, header.height, sampling === "mipmap");
      if (this.assets.size >= 16 || this.totalPixels + gpuPixels > MAX_TOTAL_PIXELS)
        throw Error("image-total-limit");
      const decodeStart = performance.now(),
        decoded = await this.decoder.decode(blob, mode);
      image = decoded.image;
      current();
      const decodeRoundtripMs = performance.now() - decodeStart;
      if (
        image.width * image.height > MAX_PIXELS ||
        !(
          (image.width === header.width && image.height === header.height) ||
          (image.width === header.height && image.height === header.width)
        )
      )
        throw Error("image-decoded-dimensions");
      const gateStart = performance.now();
      await Promise.race([
        this.gate(),
        new Promise<never>((_, reject) => {
          this.abortGate = () => reject(Error("image-cancelled"));
        }),
      ]);
      this.abortGate = undefined;
      current();
      const gateWaitMs = performance.now() - gateStart;
      const id = ++this.serial,
        { uploadSubmissionMs, mipmapSubmissionMs } = this.renderer.upload(
          id,
          image,
          sampling === "mipmap",
        );
      this.assets.set(id, image);
      this.totalPixels += gpuPixels;
      const result = {
        ...header,
        sampling,
        gpuEstimatedBytes: gpuPixels * 4,
        width: image.width,
        height: image.height,
        id,
        metrics: {
          headerMs,
          decodeMs: decoded.decodeMs,
          decodeRoundtripMs,
          transferOverheadMs: Math.max(0, decodeRoundtripMs - decoded.decodeMs),
          gateWaitMs,
          uploadSubmissionMs,
          mipmapSubmissionMs,
          totalMs: performance.now() - start,
        },
      };
      image = undefined;
      return result;
    } finally {
      this.abortGate = undefined;
      image?.close();
      this.busy = false;
    }
  }
  pixels(id: number) {
    const image = this.asset(id),
      canvas = new OffscreenCanvas(image.width, image.height),
      ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    return {
      width: image.width,
      height: image.height,
      pixels: ctx.getImageData(0, 0, image.width, image.height).data,
    };
  }
  private asset(id: number) {
    const image = this.assets.get(id);
    if (!image) throw Error("image-missing");
    return image;
  }
  present(items: Item[], view: View) {
    this.renderer.healthy();
    this.renderer.validate(view);
    if (items.some((item) => item.kind === "ink")) {
      this.ink ??= new Ink(this.renderer.gl);
      this.ink.begin(view.width, view.height);
    }
    this.renderer.begin(view);
    for (const item of items) {
      if (item.kind === "image") this.renderer.draw(item, this.asset(item.id));
      else this.ink!.draw(item, view.width, view.height);
    }
  }
  render(items: Item[], view: View) {
    const start = performance.now();
    this.present(items, view);
    const submissionMs = performance.now() - start,
      pixels = this.renderer.read();
    const referencePixels = reference(items, view, (id) => this.asset(id));
    let max = 0,
      sum = 0,
      changed = 0;
    for (let i = 0; i < pixels.length; i++) {
      const error = Math.abs(pixels[i]! - referencePixels[i]!);
      max = Math.max(max, error);
      sum += error;
      if (error) changed++;
    }
    return {
      pixels,
      referencePixels,
      diff: { max, mean: sum / pixels.length, changed },
      metrics: { submissionMs, readbackAndReferenceMs: performance.now() - start - submissionMs },
      samples: this.renderer.gl.getParameter(this.renderer.gl.SAMPLES),
    };
  }
  cancel() {
    this.abortGate?.();
    this.generation++;
    this.decoder.reset();
  }
  workerPending() {
    return this.decoder.isPending();
  }
  failWorker() {
    this.decoder.reset("image-worker-failure");
  }
  reset() {
    this.cancel();
    for (const image of this.assets.values()) image.close();
    this.assets.clear();
    this.totalPixels = 0;
    this.renderer.reset();
    this.gate = () => Promise.resolve();
  }
  loseContext() {
    this.renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  recoverContext() {
    this.reset();
    this.ink?.dispose();
    this.ink = undefined;
    this.renderer.dispose();
    this.renderer = new Renderer();
  }
  dispose() {
    this.reset();
    this.ink?.dispose();
    this.renderer.dispose();
  }
}
export const imageProbe = new ImageProbe();
declare global {
  interface Window {
    imageProbe: ImageProbe;
  }
}
window.imageProbe = imageProbe;
