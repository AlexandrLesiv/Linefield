import { DECODE_OPTIONS } from "./types";
let busy = false;
self.onmessage = async ({ data }: MessageEvent<{ id: number; blob: Blob }>) => {
  if (busy) {
    self.postMessage({ id: data.id, error: "image-worker-busy" });
    return;
  }
  busy = true;
  let image: ImageBitmap | undefined;
  try {
    const start = performance.now();
    image = await createImageBitmap(data.blob, DECODE_OPTIONS);
    const decodeMs = performance.now() - start;
    self.postMessage({ id: data.id, image, decodeMs }, { transfer: [image] });
    image = undefined;
  } catch {
    self.postMessage({ id: data.id, error: "image-decode-failed" });
  } finally {
    image?.close();
    busy = false;
  }
};
