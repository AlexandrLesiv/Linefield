import type { ExportView } from "../svg-export/types";
import { rasterText } from "./raster-tile";
import { TextGpu } from "./gpu";
/** Snapshot-only rasterization: bounded tiles, no live editor state or external font references. */
export function textExportRaster(
  gl: WebGL2RenderingContext,
  view: ExportView,
  permit: () => Promise<void>,
  clear: () => void,
) {
  let gpu: TextGpu | undefined;
  return {
    async draw(values: Float64Array, text: string) {
      if (
        values.length !== 26 ||
        values[0] !== 3 ||
        values[20] !== 1 ||
        !values.every(Number.isFinite)
      )
        throw Error("svg-text-boundary");
      const [a, b, x, y, w, h] = [
        values[10],
        values[11],
        values[14],
        values[15],
        values[18],
        values[19],
      ];
      const density = Math.hypot(a, b) * view.density,
        step = 512 / density;
      if (!(density > 0) || !(w > 0) || !(h > 0)) throw Error("svg-text-boundary");
      await permit();
      clear();
      gpu ??= new TextGpu(gl);
      for (let ty = 0; ty < h; ty += step)
        for (let tx = 0; tx < w; tx += step) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          await permit();
          const tile = {
            x: tx,
            y: ty,
            width: Math.min(step, w - tx),
            height: Math.min(step, h - ty),
            density,
            key: "export",
          };
          const bitmap = await rasterText({
            text,
            color: values[7],
            inkX: values[23],
            baseline: values[24],
            width: w,
            height: h,
            tile,
          });
          let texture: WebGLTexture | undefined;
          try {
            await permit();
            const uploaded = gpu.upload(bitmap);
            texture = uploaded.texture;
            const corners: number[] = [];
            for (const [u, v] of [
              [tx, ty],
              [tx + tile.width, ty],
              [tx, ty + tile.height],
              [tx + tile.width, ty + tile.height],
            ])
              corners.push(
                (x + a * u - b * v - view.x) * view.density,
                (y + b * u + a * v - view.y) * view.density,
              );
            gpu.draw(
              texture,
              corners,
              [
                2 / uploaded.width,
                2 / uploaded.height,
                (2 + tile.width * density) / uploaded.width,
                (2 + tile.height * density) / uploaded.height,
              ],
              values[8],
              view.pixelWidth,
              view.pixelHeight,
            );
          } finally {
            bitmap.close();
            if (texture) gl.deleteTexture(texture);
          }
        }
    },
    dispose() {
      gpu?.dispose();
    },
  };
}
