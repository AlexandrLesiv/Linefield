import type { Frame } from "./worker-client.ts";
export function compositor(canvas: HTMLCanvasElement) {
  canvas.width = 1024;
  canvas.height = 768;
  const context = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
  if (!context) throw Error("compositor-unavailable");
  context.imageSmoothingEnabled = false;
  let base: Frame | undefined;
  let active: Frame | undefined;
  let closed = 0;
  const release = (frame: Frame | undefined) => {
    if (frame) {
      frame.bitmap.close();
      closed++;
    }
  };
  const draw = (frame: Frame, matrix = [1, 0, 0, 1, 0, 0]) => {
    const start = performance.now();
    context.resetTransform();
    context.fillStyle = "white";
    context.fillRect(0, 0, 1024, 768);
    context.setTransform(matrix[0]!, matrix[2]!, matrix[1]!, matrix[3]!, matrix[4]!, matrix[5]!);
    context.drawImage(frame.bitmap, -(frame.width - 1024) / 2, -(frame.height - 768) / 2);
    return performance.now() - start;
  };
  return {
    base(frame: Frame) {
      if (active) throw Error("base-before-active");
      const ms = draw(frame);
      release(base);
      base = frame;
      return ms;
    },
    active(frame: Frame) {
      if (!base) throw Error("missing-completed-base");
      const ms = draw(frame);
      release(active);
      active = frame;
      return ms;
    },
    transform(matrix: number[]) {
      if (!base) throw Error("missing-base");
      return draw(active ?? base, matrix);
    },
    cancel() {
      if (!base) throw Error("missing-base");
      const ms = draw(base);
      release(active);
      active = undefined;
      return ms;
    },
    async hash() {
      const bytes = context.getImageData(0, 0, 1024, 768).data;
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
      );
    },
    dispose() {
      release(active);
      release(base);
      active = base = undefined;
      return closed;
    },
  };
}
