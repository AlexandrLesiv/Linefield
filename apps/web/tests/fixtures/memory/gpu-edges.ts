import { queryReady } from "./query-readiness.ts";
import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
export function gpuEdges(canvas: HTMLCanvasElement) {
  const seed: unknown = Reflect.get(api, "fixtureFarView");
  if (typeof seed !== "function") throw Error("fixture missing");
  let cases = 0,
    pages = 0,
    maximumCoverageError = 0,
    maximumEndpointError = 0;
  let largestIntermediate = 0;
  for (const region of [0n, 9223372036854775800n])
    for (const angle of [
      -Math.PI / 2 - 1e-10,
      -Math.PI / 2 + 1e-10,
      0,
      0.731,
      Math.PI / 2 + 1e-10,
    ]) {
      const seeded: unknown = seed(region, 65535.875);
      if (!(seeded instanceof api.Reply)) throw Error("fixture reply");
      if (take(() => seeded, copyReply).code !== "ok") throw Error("seed");
      let s = bridge.create();
      s = bridge.enter(s.owner);
      s = bridge.metrics(s, 1n, 512, 512, 4);
      s = queryReady(s);
      s = edit.view(s, 0.05, 256, 256, false);
      s = edit.style(s, 512, [0, 0, 0]);
      s = edit.begin(s, 1, 70, 256, 0, true);
      s = edit.append(
        s,
        1n,
        new Float64Array([120, 190, 256]),
        new Float64Array([230, 256, 256]),
        new Float64Array(3),
        new Uint8Array(3).fill(1),
      );
      if (s.code !== "ok") throw Error("curved source");
      s = edit.end(s, 4n);
      s = edit.view(s, 16, 256, 256, false);
      s = edit.view(s, angle, 256, 256, true);
      const id = scene.ids(s, 0n).ids[0];
      if (id === undefined) throw Error("stroke");
      const renderer = new GpuRenderer(canvas, 2048, 2048);
      renderer.begin();
      renderer.group();
      let cursor = 0n;
      for (;;) {
        const page = scene.page(s, id, 4n, 0n, 64, cursor);
        if (page.code !== "ok") throw Error(`page ${page.code}`);
        const placement = scene.placement(s, id, page.page);
        if (placement.code !== "ok") throw Error(`placement ${placement.code}`);
        if (placement.available) {
          renderer.draw(page.data, placement.matrix, [0, 0, 0, 1]);
          const m = placement.matrix;
          for (let i = 0; i < page.data.length; i += 3)
            largestIntermediate = Math.max(
              largestIntermediate,
              Math.abs((m[0] ?? 0) * (page.data[i] ?? 0)),
              Math.abs((m[1] ?? 0) * (page.data[i] ?? 0)),
              Math.abs((m[2] ?? 0) * (page.data[i + 1] ?? 0)),
              Math.abs((m[3] ?? 0) * (page.data[i + 1] ?? 0)),
            );
          if (page.done) {
            const i = page.data.length - 3,
              x = page.data[i] ?? NaN,
              y = page.data[i + 1] ?? NaN;
            const f = Math.fround;
            const px = f(f(f((m[0] ?? NaN) * x) + f((m[2] ?? NaN) * y)) + (m[4] ?? NaN));
            const py = f(f(f((m[1] ?? NaN) * x) + f((m[3] ?? NaN) * y)) + (m[5] ?? NaN));
            maximumEndpointError = Math.max(maximumEndpointError, Math.hypot(px - 1024, py - 1024));
          }
        }
        pages++;
        scene.release(s, page.page);
        if (page.done) break;
        cursor = page.next;
        if (pages > 10000) throw Error("bounded edge fixture");
      }
      renderer.composite();
      renderer.publish();
      // The terminal round cap is outside the preceding curved source support.
      // Compare actual GPU coverage against its analytical f64 circular edge.
      const radius = 512 * 0.5 * 0.05 * 16 * 4;
      for (const offset of [-0.2, 0, 0.2]) {
        const theta = angle + offset;
        const x = Math.floor(1024 + Math.cos(theta) * radius);
        const y = Math.floor(1024 + Math.sin(theta) * radius);
        const pixel = new Uint8Array(4);
        renderer.gl.readPixels(
          x,
          2047 - y,
          1,
          1,
          renderer.gl.RGBA,
          renderer.gl.UNSIGNED_BYTE,
          pixel,
        );
        const distance = Math.hypot(x + 0.5 - 1024, y + 0.5 - 1024) - radius;
        const expected = Math.min(1, Math.max(0, 0.5 - distance));
        const error = Math.abs(1 - (pixel[0] ?? NaN) / 255 - expected);
        if (!Number.isFinite(error) || error > 0.25 + 1 / 255) throw Error(`GPU edge ${error}`);
        maximumCoverageError = Math.max(maximumCoverageError, error);
        cases++;
      }
      renderer.dispose();
      bridge.leave(s);
      bridge.dispose(s.owner);
    }
  if (maximumEndpointError > 0.25) throw Error(`endpoint ${maximumEndpointError}`);
  return {
    cases,
    pages,
    maximumCoverageError,
    maximumEndpointError,
    largestIntermediate,
    scope:
      "bounded real GPU thick curved source/cap exploration, far regions and high-detail rebasing; not exhaustive fragment arithmetic proof",
  };
}
