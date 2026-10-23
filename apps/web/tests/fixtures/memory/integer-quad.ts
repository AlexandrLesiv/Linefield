import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { vertex, fragment } from "../../../src/memory/gpu-shaders.ts";
import { program } from "../../../src/memory/gpu-resources.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { queryReady } from "./query-readiness.ts";
import { retireRenderer } from "./retire-renderer.ts";
// Isolated offset-zero comparison explicitly fixes each reviewed shader branch.
export async function integerQuad(canvas: HTMLCanvasElement) {
  if (!vertex.includes("if(!integerQuad)")) throw Error("reviewed vertex recipe changed");
  const rows = [];
  for (const [width, height] of [
    [65, 67],
    [513, 385],
    [4096, 2048],
    [8192, 1024],
  ])
    for (const angle of [0, Math.PI / 12, Math.PI / 2]) {
      if (width === undefined || height === undefined) throw Error("dimensions");
      let state = bridge.create();
      state = bridge.enter(state.owner);
      state = bridge.metrics(state, 1n, width, height, 1);
      if (state.code !== "ok") throw Error(`metrics ${state.code}`);
      state = queryReady(state);
      const renderer = new GpuRenderer(canvas, width, height);
      const gl = renderer.gl,
        original = renderer.resources.ink;
      const legacy = program(gl, vertex.replace("if(!integerQuad)", "if(true)"), fragment);
      const expanded = program(gl, vertex.replace("if(!integerQuad)", "if(false)"), fragment);
      try {
        for (const strokeWidth of [1, 12]) {
          state = edit.style(state, strokeWidth, [0.2, 0.4, 0.8]);
          if (state.code !== "ok") throw Error(`style ${state.code}`);
          state = edit.begin(state, 1, width * 0.15, height * 0.2, 0.1, true);
          if (state.code !== "ok") throw Error(`begin ${state.code}`);
          state = edit.append(
            state,
            1n,
            new Float64Array([width * 0.4, width * 0.65, width * 0.85]),
            new Float64Array([height * 0.7, height * 0.3, height * 0.8]),
            new Float64Array([0.2, 0.7, 1]),
            new Uint8Array(3).fill(1),
          );
          if (state.code !== "ok") throw Error(`append ${state.code}`);
          state = edit.end(state, 4n);
          if (state.code !== "ok") throw Error(`end ${state.code}`);
        }
        state = edit.view(state, angle, width / 2, height / 2, true);
        if (!["ok", "noop"].includes(state.code)) throw Error(`view ${state.code}`);
        const mapping = bridge.mapping(state.owner, state.session);
        if (mapping.code !== "ok" || !mapping.available) throw Error("mapping unavailable");
        const detail = 2 ** Math.ceil(Math.log2(mapping.zoom * mapping.backing));
        const pages: { data: Float32Array; matrix: Float32Array; source: bigint }[] = [];
        const ids = scene.ids(state, 0n);
        if (ids.code !== "ok" || !ids.done || ids.ids.length !== 2) throw Error("source count");
        for (const source of ids.ids) {
          const stroke = scene.stroke(state, source);
          if (stroke.code !== "ok" || stroke.active || stroke.count !== 4n)
            throw Error("source revision");
          let cursor = 0n;
          for (;;) {
            const page = scene.page(state, source, 4n, 0n, detail, cursor);
            if (page.code !== "ok") throw Error(`page ${page.code}`);
            try {
              const placement = scene.placement(state, source, page.page);
              if (placement.code !== "ok") throw Error(`placement ${placement.code}`);
              if (placement.available)
                pages.push({ data: page.data, matrix: placement.matrix, source });
            } finally {
              scene.release(state, page.page);
            }
            if (pages.length > 64)
              throw Error(
                `bounded proof pages ${JSON.stringify({ width, height, angle, detail, pages: pages.length })}`,
              );
            if (page.done) break;
            cursor = page.next;
          }
        }
        async function render(shader: WebGLProgram) {
          renderer.resources.ink = shader;
          await renderer.slot();
          renderer.begin();
          let previous = 0n;
          for (const page of pages) {
            if (previous !== page.source) {
              if (previous) renderer.composite();
              renderer.group();
              previous = page.source;
            }
            renderer.draw(page.data, page.matrix, [0.2, 0.4, 0.8, 0.5]);
          }
          if (previous) renderer.composite();
          await renderer.validated(renderer.check());
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
          const pixels = new Uint8Array(width! * height! * 4);
          gl.readPixels(0, 0, width!, height!, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error("readback");
          return pixels;
        }
        const reference = await render(legacy),
          actual = await render(expanded);
        let changed = 0,
          maximum = 0,
          ink = 0;
        for (let i = 0; i < reference.length; i++) {
          if (i % 4 === 3) continue;
          const delta = Math.abs((reference[i] ?? 0) - (actual[i] ?? 0));
          changed += Number(delta !== 0);
          maximum = Math.max(maximum, delta);
          ink += Number((actual[i] ?? 255) < 240);
        }
        const row = {
          width,
          height,
          angle,
          packed: renderer.resources.packed,
          pages: pages.length,
          detail,
          changed,
          maximum,
          ink,
        };
        rows.push(row);
        if (!ink || !pages.length || changed)
          throw Error(`integer quad parity ${JSON.stringify(row)}`);
      } finally {
        renderer.resources.ink = original;
        await retireRenderer(renderer);
        gl.deleteProgram(expanded);
        gl.deleteProgram(legacy);
        bridge.leave(state);
        bridge.dispose(state.owner);
      }
    }
  return {
    rows,
    evidence:
      "real generated Rust source/preparation/placement, unchanged analytic AA; isolated offset0 integer quad parity only, no production lattice or residual certificate",
  };
}
