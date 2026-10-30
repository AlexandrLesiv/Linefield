import type { TextRecord } from "./records";
import type { TextTile } from "./tiles";
import type { TextGpu } from "./gpu";
import { TextRaster } from "./raster";
export async function prepareText(
  record: TextRecord,
  text: string,
  tile: TextTile,
  signal: AbortSignal,
  host: {
    wait(signal: AbortSignal): Promise<void>;
    upload(bitmap: ImageBitmap): ReturnType<TextGpu["upload"]>;
  },
) {
  const raster = new TextRaster(),
    cancel = () => raster.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  let bitmap: ImageBitmap | undefined;
  try {
    await host.wait(signal);
    if (signal.aborted) throw Error("text-cancelled");
    bitmap = await raster.render(record, text, tile);
    await host.wait(signal);
    if (signal.aborted) throw Error("text-cancelled");
    return host.upload(bitmap);
  } finally {
    bitmap?.close();
    raster.cancel();
    signal.removeEventListener("abort", cancel);
  }
}
