import { prepareBackground } from "./background";
import type { PaperSettings } from "../../../../vector-editor/src/paper-background";
import { backend, type Group, type View } from "./gpu";
import { silhouette } from "./vector";
type Request = {
  id: number;
  groups: Group[];
  view: View;
  mode: "reference" | "raster" | "hybrid" | "padded" | "whole";
  tile: number;
  gutter: number;
  paper?: PaperSettings;
};
let activeJob = 0,
  cancelled = 0,
  busy = false;
const base64 = (bytes: Uint8Array) => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 16384)
    result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
};
self.onmessage = async ({ data }: MessageEvent<Request & { cancel?: boolean }>) => {
  if (data.cancel) {
    if (data.id === activeJob) cancelled = data.id;
    return;
  }
  if (busy) {
    self.postMessage({ id: data.id, error: "svg-job-busy" });
    return;
  }
  busy = true;
  activeJob = data.id;
  cancelled = 0;
  let gpu: ReturnType<typeof backend> | undefined;
  const start = performance.now();
  let encoded = 0,
    pixels = 0,
    svg = "";
  try {
    const { view, groups } = data;
    if (
      ![view.x, view.y, view.width, view.height, view.density].every(Number.isFinite) ||
      view.density <= 0 ||
      !Number.isInteger(data.tile) ||
      data.tile < 1 ||
      data.tile > 1024 ||
      !Number.isInteger(data.gutter) ||
      data.gutter < 0 ||
      data.gutter > 64
    )
      throw Error("svg-invalid-request");
    if (data.paper) await prepareBackground();
    gpu = backend();
    const width = Math.ceil(view.width * view.density),
      height = Math.ceil(view.height * view.density);
    if (!Number.isFinite(width * height) || width <= 0 || height <= 0 || width * height > 64000000)
      throw Error("svg-pixel-limit");
    if (data.mode === "reference") {
      gpu.render(groups, view, data.paper);
      const blob = await gpu.canvas.convertToBlob({ type: "image/png" }),
        bytes = await blob.arrayBuffer();
      gpu.assertHealthy();
      if (cancelled === data.id) throw Error("svg-cancelled");
      self.postMessage(
        { id: data.id, bytes, milliseconds: performance.now() - start },
        { transfer: [bytes] },
      );
      return;
    }
    const tile = data.mode === "whole" ? Math.max(width, height) : data.tile;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${view.x} ${view.y} ${width / view.density} ${height / view.density}">`;
    if (data.paper) {
      gpu.render([], view, data.paper);
      const bytes = new Uint8Array(
        await (await gpu.canvas.convertToBlob({ type: "image/png" })).arrayBuffer(),
      );
      gpu.assertHealthy();
      encoded += bytes.length;
      pixels += width * height;
      svg += `<image x="${view.x}" y="${view.y}" width="${width / view.density}" height="${height / view.density}" href="data:image/png;base64,${base64(bytes)}"/>`;
    }
    for (const group of groups) {
      if (data.mode === "hybrid" && group.brush === 0) {
        if (cancelled === data.id) throw Error("svg-cancelled");
        svg += silhouette(group);
        if (svg.length > 128 * 1024 * 1024) throw Error("svg-output-limit");
        continue;
      }
      for (let top = 0; top < height; top += tile)
        for (let left = 0; left < width; left += tile) {
          if (cancelled === data.id) throw Error("svg-cancelled");
          const w = Math.min(tile, width - left),
            h = Math.min(tile, height - top),
            pad = data.gutter;
          pixels += (w + 2 * pad) * (h + 2 * pad);
          if (pixels > 64000000) throw Error("svg-pixel-limit");
          gpu.render([group], {
            x: view.x + (left - pad) / view.density,
            y: view.y + (top - pad) / view.density,
            width: (w + 2 * pad) / view.density,
            height: (h + 2 * pad) / view.density,
            density: view.density,
          });
          const crop = new OffscreenCanvas(w, h),
            ctx = crop.getContext("2d");
          if (!ctx) throw Error("svg-encode-capability");
          ctx.drawImage(gpu.canvas, pad, pad, w, h, 0, 0, w, h);
          gpu.assertHealthy();
          const bytes = new Uint8Array(
            await (
              await (data.mode === "padded" ? gpu.canvas : crop).convertToBlob({
                type: "image/png",
              })
            ).arrayBuffer(),
          );
          gpu.assertHealthy();
          encoded += bytes.length;
          const href = `data:image/png;base64,${base64(bytes)}`;
          svg +=
            data.mode === "padded"
              ? `<svg x="${view.x + left / view.density}" y="${view.y + top / view.density}" width="${w / view.density}" height="${h / view.density}" viewBox="${pad} ${pad} ${w} ${h}" overflow="hidden"><image width="${w + 2 * pad}" height="${h + 2 * pad}" href="${href}"/></svg>`
              : `<image x="${view.x + left / view.density}" y="${view.y + top / view.density}" width="${w / view.density}" height="${h / view.density}" href="${href}"/>`;
          if (svg.length > 128 * 1024 * 1024) throw Error("svg-output-limit");
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }
    svg += "</svg>";
    gpu.assertHealthy();
    if (cancelled === data.id) throw Error("svg-cancelled");
    self.postMessage({
      id: data.id,
      svg,
      encoded,
      pixels,
      milliseconds: performance.now() - start,
    });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  } finally {
    gpu?.dispose();
    busy = false;
    activeJob = 0;
  }
};
