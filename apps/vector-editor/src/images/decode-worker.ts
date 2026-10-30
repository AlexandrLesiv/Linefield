import { inspect } from "./header";
import { MAX_PIXELS } from "./types";
let busy = false;
self.onmessage = async ({ data }: MessageEvent<{ id: number; blob: Blob }>) => {
  if (busy) {
    self.postMessage({ id: data.id, error: "image-busy" });
    return;
  }
  busy = true;
  let image: ImageBitmap | undefined;
  try {
    const header = await inspect(data.blob);
    image = await createImageBitmap(data.blob, {
      imageOrientation: "from-image",
      premultiplyAlpha: "premultiply",
      colorSpaceConversion: "default",
    });
    if (
      image.width * image.height > MAX_PIXELS ||
      !(
        (image.width === header.width && image.height === header.height) ||
        (image.width === header.height && image.height === header.width)
      )
    )
      throw Error("image-decoded-dimensions");
    self.postMessage(
      {
        id: data.id,
        image,
        width: image.width,
        height: image.height,
        mime: `image/${header.format}`,
        encodedBytes: header.encodedBytes,
      },
      { transfer: [image] },
    );
    image = undefined;
  } catch (error) {
    const message =
      error instanceof Error && /^image-[a-z-]+$/.test(error.message)
        ? error.message
        : "image-decode-failed";
    self.postMessage({ id: data.id, error: message });
  } finally {
    image?.close();
    busy = false;
  }
};
