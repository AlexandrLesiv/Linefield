import { comparePixels } from "./raster.ts";

export function present(bitmap: ImageBitmap, width: number, height: number, pixels: Uint8Array) {
  let submitMs = 0;
  let context: CanvasRenderingContext2D | null = null;
  try {
    const start = performance.now();
    const canvas = document.getElementById("candidate");
    if (!(canvas instanceof HTMLCanvasElement)) throw Error("candidate-canvas");
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext("2d");
    if (!context) throw Error("candidate-context");
    context.drawImage(bitmap, 0, 0);
    submitMs = performance.now() - start;
  } finally {
    bitmap.close();
  }
  const presented = Uint8Array.from(context.getImageData(0, 0, width, height).data);
  return { submitMs, parity: comparePixels(pixels, presented) };
}
