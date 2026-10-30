import { ImageCache } from "../images/cache";
import type { ImageRecord } from "./records";
import { t } from "../../../web/src/locale";
/** Host scheduling keeps expensive upload/first presentation outside input gestures. */
export function imageLifecycle(
  gl: WebGL2RenderingContext,
  canvas: HTMLCanvasElement,
  host: { active(): boolean; readAsset(digest: string): Promise<Blob>; changed(): void },
) {
  let activityUntil = 0,
    generation = 0,
    pendingKey = "",
    failedKey = "";
  const active = () => host.active() || performance.now() < activityUntil;
  const wait = async (signal: AbortSignal) => {
    do {
      await new Promise<void>((resolve) => setTimeout(resolve, 32));
      if (signal.aborted) throw Error("image-cancelled");
    } while (active());
  };
  let cache = new ImageCache(gl, {
    readAsset: host.readAsset,
    waitForIdle: wait,
    isInputActive: active,
  });
  const notice = document.createElement("button");
  notice.id = "image-view-retry";
  notice.hidden = true;
  document.querySelector("header")!.append(notice);
  notice.onclick = () => {
    failedKey = "";
    host.changed();
  };
  const activity = (event: Event) => {
    if (
      event.target === canvas &&
      (!(event instanceof PointerEvent) || event.buttons !== 0 || host.active())
    )
      activityUntil = performance.now() + 150;
  };
  canvas.addEventListener("pointermove", activity, { passive: true });
  canvas.addEventListener("wheel", activity, { passive: true });
  return {
    wait,
    active,
    cache: () => cache,
    ready(images: readonly ImageRecord[]) {
      const digests = images.map((image) => image.digest),
        key = [...new Set(digests)].sort().join(":");
      if (pendingKey && pendingKey !== key) {
        generation++;
        pendingKey = "";
      }
      if (digests.every((digest) => cache.has(digest))) {
        void cache.ensureVisible(digests).catch(() => {});
        if (cache.needsPresentation(digests) && active()) return false;
        notice.hidden = true;
        return true;
      }
      if (key !== pendingKey && key !== failedKey) {
        const version = ++generation;
        pendingKey = key;
        notice.hidden = false;
        notice.disabled = true;
        notice.textContent = t("image.preparingView");
        void cache.ensureVisible(digests).then(
          () => {
            if (version !== generation) return;
            pendingKey = "";
            failedKey = "";
            notice.hidden = true;
            host.changed();
          },
          () => {
            if (version !== generation) return;
            pendingKey = "";
            failedKey = key;
            notice.disabled = false;
            notice.textContent = t("image.viewFailed");
          },
        );
      }
      return false;
    },
    reset() {
      generation++;
      pendingKey = failedKey = "";
      cache.dispose(true);
      cache = new ImageCache(gl, {
        readAsset: host.readAsset,
        waitForIdle: wait,
        isInputActive: active,
      });
    },
  };
}
