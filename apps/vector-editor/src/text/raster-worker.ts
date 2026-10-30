import { rasterText, type RasterText } from "./raster-tile";
self.onmessage = async ({ data }: MessageEvent<RasterText & { id: number }>) => {
  try {
    const bitmap = await rasterText(data);
    self.postMessage({ id: data.id, bitmap }, { transfer: [bitmap] });
  } catch {
    self.postMessage({ id: data.id, error: "text-render-failed" });
  }
};
