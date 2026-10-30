import { ImageGpu } from "./gpu";
import { inspect } from "./header";
import { textureBytes } from "./types";
import { SCRATCH_LIMIT, type ExportView } from "../svg-export/types";
export function imageRaster(
  gl: WebGL2RenderingContext,
  view: ExportView,
  permit: () => Promise<void>,
  clear: () => void,
) {
  let gpu: ImageGpu | undefined;
  const ready = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await permit();
  };
  return {
    async draw(blob: Blob, values: Float64Array) {
      const header = await inspect(blob),
        width = values[18],
        height = values[19];
      if (
        values.length !== 24 ||
        blob.size !== values[21] ||
        header.encodedBytes !== blob.size ||
        !(
          (header.width === width && header.height === height) ||
          (header.width === height && header.height === width)
        )
      )
        throw Error("svg-image-boundary");
      if (
        view.pixelWidth * view.pixelHeight * 24 +
          24 * 1024 * 1024 +
          textureBytes(width, height) +
          width * height * 4 +
          blob.size >
        SCRATCH_LIMIT
      )
        throw Error("svg-raster-memory-limit");
      await ready();
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: "from-image",
        premultiplyAlpha: "premultiply",
        colorSpaceConversion: "default",
      });
      let texture: WebGLTexture | undefined;
      try {
        if (bitmap.width !== width || bitmap.height !== height) throw Error("svg-image-dimensions");
        await ready();
        gpu ??= new ImageGpu(gl);
        const uploaded = gpu.upload(bitmap);
        texture = uploaded.texture;
        const corners: number[] = [];
        for (const [x, y] of [
          [0, 0],
          [width, 0],
          [0, height],
          [width, height],
        ])
          corners.push(
            (values[14] + values[10] * x - values[11] * y - view.x) * view.density,
            (values[15] + values[11] * x + values[10] * y - view.y) * view.density,
          );
        await ready();
        clear();
        gpu.draw(texture, corners, values[8], view.pixelWidth, view.pixelHeight);
      } finally {
        bitmap.close();
        if (texture) gl.deleteTexture(texture);
      }
    },
    dispose() {
      gpu?.dispose();
    },
  };
}
