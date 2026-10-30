import { checkedImageCore } from "../image-boundary";
import { ImageDecoder } from "../images/decode";
import type { ImageCache } from "../images/cache";
import type { Core } from "../core";
import type { Camera } from "../camera";
import type { Saving } from "../saving";
import { installImageImportUi } from ".";

export function installImageImport(
  core: Core,
  camera: Camera,
  canvas: HTMLCanvasElement,
  saving: Saving,
  host: {
    active(): boolean;
    unavailable(): boolean;
    wait(signal: AbortSignal): Promise<void>;
    cache(): ImageCache;
    published(id: number): void;
  },
) {
  const images = checkedImageCore(core),
    decoder = new ImageDecoder();
  let controller: AbortController | undefined;
  const cancel = () => {
    controller?.abort();
    decoder.cancel();
  };
  const ui = installImageImportUi({
    begin: () =>
      host.active() || host.unavailable() || !core.can_draw() ? null : core.layer_active(),
    cancel,
    async import(file, layer) {
      if (controller) throw Error("image-busy");
      const job = new AbortController();
      controller = job;
      const valid = () => {
        if (job.signal.aborted || host.unavailable()) throw Error("image-cancelled");
        if (core.layer_active() !== layer || !core.can_draw()) throw Error("image-layer-changed");
      };
      let bitmap: ImageBitmap | undefined;
      try {
        const decoded = await decoder.decode(file, job.signal);
        bitmap = decoded.image;
        valid();
        ui.phase("staging");
        const mime = ["image/png", "image/jpeg", "image/webp"].indexOf(decoded.mime) + 1;
        const asset = await saving.stageAsset(file, {
          mime,
          width: decoded.width,
          height: decoded.height,
          version: 1,
        });
        valid();
        ui.phase("waiting");
        await host.wait(job.signal);
        valid();
        ui.phase("uploading");
        const owned = bitmap;
        bitmap = undefined;
        await host.cache().prepare(asset.digest, owned, job.signal);
        await host.wait(job.signal);
        valid();
        const rect = canvas.getBoundingClientRect(),
          center = camera.screenToWorld(rect.width / 2, rect.height / 2);
        new Uint8Array(images.memory.buffer, images.image_digest_input_ptr(), 64).set(
          new TextEncoder().encode(asset.digest),
        );
        const id =
          images.image_add(
            mime,
            asset.width,
            asset.height,
            asset.bytes,
            layer,
            camera.regionX,
            center[0],
            camera.regionY,
            center[1],
            camera.zoom,
            camera.rotation,
            rect.width,
            rect.height,
          ) >>> 0;
        if (id === 0xffffffff)
          throw Error(images.image_error() === 3 ? "image-visible-budget" : "image-layer-changed");
        // Publication is synchronous and cannot be reported as an import failure afterward.
        try {
          host.published(id);
        } catch (error) {
          window.dispatchEvent(new ErrorEvent("error", { message: String(error), error }));
        }
      } finally {
        bitmap?.close();
        controller = undefined;
      }
    },
  });
  window.addEventListener("pagehide", cancel);
  canvas.addEventListener("webglcontextlost", cancel);
  return {
    cancel,
    dispose() {
      cancel();
      decoder.dispose();
      ui.dispose();
      window.removeEventListener("pagehide", cancel);
      canvas.removeEventListener("webglcontextlost", cancel);
    },
  };
}
