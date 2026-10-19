import { environment } from "./environment.ts";
import type { CanvasKit, Path } from "canvaskit-wasm";
import { Presentation } from "../../../src/memory/presentation.ts";
import { fixturePath, pixelDigest, scenes, fixtureSeed } from "./geometry.ts";
export async function calibration(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const results = [];
  let observedEnvironment: ReturnType<typeof environment> | undefined;
  for (const [width, height] of [
    [1024, 768],
    [4096, 2048],
  ] as const) {
    const display = new Presentation(kit, canvas, width, height);
    observedEnvironment ??= environment(canvas);
    const resources = display.owner.resources;
    const context = display.owner.context;
    const cacheUsage: unknown = context?.getResourceCacheUsageBytes();
    const cacheLimit: unknown = context?.getResourceCacheLimitBytes();
    const paint = new kit.Paint();
    resources.add("paint");
    paint.setColor(kit.BLACK);
    paint.setAntiAlias(true);
    paint.setStyle(kit.PaintStyle.Fill);
    try {
      for (const scene of scenes) {
        const cache: Path[] = [];
        let encodedBytes = 0;
        try {
          for (const mode of ["cold", "warm", "evicted"] as const) {
            if (mode === "evicted") {
              for (const path of cache) resources.release("path", path);
              cache.length = 0;
            }
            let buildMs = 0;
            let drawMs = 0;
            const before = display.stats();
            const start = performance.now();
            display.render((target) => {
              for (let index = 0; index < scene.paths; index++) {
                const buildStart = performance.now();
                const path = cache[index] ?? fixturePath(kit, resources, scene, index);
                buildMs += performance.now() - buildStart;
                if (mode === "cold") {
                  const bytes = path.toCmds().byteLength;
                  encodedBytes += bytes;
                  // Known serialized command bytes estimate cache occupancy, not exact Skia path bytes.
                  if (encodedBytes <= 16 * 1024 * 1024) cache.push(path);
                }
                const drawStart = performance.now();
                target.drawPath(path, paint);
                drawMs += performance.now() - drawStart;
                if (mode === "evicted" || !cache.includes(path)) resources.release("path", path);
              }
            });
            const publicationCpuMs = performance.now() - start;
            const after = display.stats();
            // Readback/hash are excluded from publication timings.
            const pixels = display.pixels();
            const jsReadbackBytes = pixels?.byteLength ?? 0;
            const digest = await pixelDigest(pixels);
            results.push({
              width,
              height,
              scene,
              mode,
              before,
              after,
              encodedBytes,
              jsReadbackBytes,
              buildMs,
              drawMs,
              publicationCpuMs,
              digest,
              jsParityBufferPeakBytes: jsReadbackBytes * 2,
              resourceCacheUsage:
                typeof cacheUsage === "number" ? cacheUsage : "unavailable-pinned-wrapper",
              resourceCacheLimit:
                typeof cacheLimit === "number" ? cacheLimit : "unavailable-pinned-wrapper",
            });
          }
        } finally {
          for (const path of cache) resources.release("path", path);
        }
      }
    } finally {
      resources.release("paint", paint);
      display.dispose();
    }
    results.push({ width, height, disposed: display.stats() });
  }
  return {
    environment: observedEnvironment,
    seed: fixtureSeed,
    format: "RGBA_8888/Premul/sRGB",
    results,
  };
}
