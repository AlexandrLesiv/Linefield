import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { geometryMetrics } from "../../../src/memory/geometry-metrics.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
import {
  visibilityState,
  visibilityStroke,
  visibilityFault,
  visibilityQuery,
} from "./visibility-fixture.ts";

export async function visibilityComposite(canvas: HTMLCanvasElement) {
  const { check, report } = assertions();
  let state = edit.style(visibilityState(), 40, [1, 0, 0]);
  state = visibilityStroke(state, 32769);
  state = edit.style(state, 40, [0, 0, 1]);
  state = visibilityStroke(state, 129);
  const receipt = frames.capture(state);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const cache = new PreparedCache(() => state);
  const draw = renderer.draw.bind(renderer),
    composite = renderer.composite.bind(renderer);
  let trigger = false,
    injected = 0,
    composites = 0;
  // Renderer-boundary RGBA seam: opacity UI is not implemented. Geometry/visibility
  // and all producer/group transitions still use canonical sources and real host code.
  renderer.draw = (data, matrix, color, page) => {
    draw(data, matrix, [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, 0.5], page);
    if (trigger && injected === 0) {
      check(visibilityFault(4) === "ok", "pressure after first actual emitted page");
      injected++;
    }
  };
  renderer.composite = () => {
    composites++;
    composite();
  };
  const pixels = () => {
    const gl = renderer.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
    const value = new Uint8Array(1024 * 768 * 4);
    gl.readPixels(0, 0, 1024, 768, gl.RGBA, gl.UNSIGNED_BYTE, value);
    return value;
  };
  const build = async () => {
    composites = 0;
    check(
      await buildFrame(
        () => state,
        cache,
        renderer,
        receipt,
        1,
        () => true,
        new AbortController().signal,
      ),
      "validated current canonical build",
    );
    check(composites === 2, "each independent source composites exactly once");
    check(geometryMetrics.visibilityBytes === 0, "producer releases copied arrays");
    return pixels();
  };
  try {
    const offset = ((768 - 300 - 1) * 1024 + 300) * 4;
    const initialAlpha = pixels()[offset + 3];
    const reference = await build();
    const overlap = [...reference.slice(offset, offset + 4)];
    check(
      overlap.slice(0, 3).every((v, i) => Math.abs(v - ([128, 64, 191][i] ?? 0)) <= 1),
      `overlap ${overlap} proves separate source-over rather than cross-group MAX`,
    );
    check(visibilityFault(32768, true) === "ok", "cold pressure run");
    trigger = true;
    const pressure = await build();
    check(
      injected === 1 && reference.every((v, i) => i % 4 === 3 || v === pressure[i]),
      "split-page pressure preserves exact RGB",
    );
    trigger = false;
    check(visibilityFault(32768) === "ok", "restore cache admission");
    const first = visibilityQuery(state, receipt.id),
      second = visibilityQuery(state, receipt.id);
    check(
      !first.done && !second.done && first.strokes.length > 0 && second.strokes.length > 0,
      "two cursors positively retain emitted partial sources",
    );
    check(
      visibilityQuery(state, receipt.id).code === "capacity",
      "third start positively refused before host fallback",
    );
    const queries = geometryMetrics.visibilityQueries;
    const fallback = await build();
    check(
      geometryMetrics.visibilityQueries === queries,
      "host used initial slot-capacity ordered fallback",
    );
    check(
      reference.every((v, i) => i % 4 === 3 || v === fallback[i]),
      "fallback preserves exact source-order RGB",
    );
    // Packed S.alpha is the fixed front-mask plane F, not output opacity. No live
    // owner exists in this fixture, so RGB rebuilds must leave that plane unchanged.
    check(
      [reference, pressure, fallback].every(
        (v) => v[offset + 3] === (renderer.resources.packed ? initialAlpha : 255),
      ),
      "private packed Falpha unchanged; normal RGB8 readback alpha remains opaque",
    );
    return {
      ...report(),
      packed: renderer.resources.packed,
      overlap,
      initialAlpha,
      injected,
      scope: "host/renderer RGBA boundary fixture; not opacity UI or timing",
    };
  } finally {
    renderer.draw = draw;
    renderer.composite = composite;
    frames.release(state, receipt.id);
    cache.dispose();
    closeTailFixture(state);
    await retireRenderer(renderer);
  }
}
