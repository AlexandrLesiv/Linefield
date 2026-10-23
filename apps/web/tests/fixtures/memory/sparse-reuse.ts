import { SparseStorage } from "../../../src/memory/sparse-storage.ts";
import { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { commandTurn } from "../../../src/memory/frame-commands.ts";
import { sparseSource } from "./sparse-source.ts";
import { sparseRender } from "./sparse-render.ts";
import { samplingDifference, samplingImage } from "./sampling-pixels.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { sparseEntryControl } from "./sparse-entry-control.ts";
export async function sparseReuse(canvas: HTMLCanvasElement) {
  const renderer = new GpuRenderer(canvas, 128, 128),
    gl = renderer.gl;
  const create = gl.createTexture.bind(gl);
  let textures = 0;
  gl.createTexture = () => {
    textures++;
    return create();
  };
  const storage = new SparseStorage(),
    executor = new SparseGpu(renderer),
    rows = [];
  let entry;
  try {
    for (const edge of [false, true, false]) {
      const source = sparseSource(128, 128, 4, edge, 0);
      try {
        const work = { visited: 0, entries: 0, instances: 0, area: 0, disabled: false };
        const subpixels: unknown = gl.getParameter(gl.SUBPIXEL_BITS);
        const plan = new SparsePlan(
          storage,
          source.data,
          source.matrix,
          128,
          128,
          gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision ?? 0,
          typeof subpixels === "number" ? subpixels : 0,
          work,
        );
        let status: "pending" | "done" | "refused" = "pending";
        while (status === "pending") {
          status = plan.step({ deadline: performance.now() + 2, remaining: 1024 });
          if (status === "pending") await commandTurn();
        }
        if (status !== "done") throw Error(`reuse admission ${plan.reason}`);
        const full = await sparseRender(renderer, source.data, source.matrix);
        const sparse = await sparseRender(renderer, source.data, source.matrix, plan, executor);
        const difference = samplingDifference(sparse.pixels, full.pixels);
        const row = {
          edge,
          slots: plan.routes.slots,
          original: plan.routes.originalDescriptors,
          coalesced: plan.routes.descriptors,
          difference,
          textures,
        };
        rows.push(row);
        if (
          difference.changed ||
          !difference.ink ||
          row.slots !== (edge ? 1 : 4) ||
          row.original !== 11 ||
          row.coalesced !== 2 ||
          textures !== 2
        )
          throw Error(
            `sparse reuse ${JSON.stringify({
              row,
              full: await samplingImage(renderer, full.pixels),
              sparse: await samplingImage(renderer, sparse.pixels),
            })}`,
          );
        if (!edge && !entry)
          entry = await sparseEntryControl(
            renderer,
            executor,
            plan,
            source.data,
            source.matrix,
            full.pixels,
          );
      } finally {
        source.close();
      }
    }
    return { rows, textures, entry, rendererEpoch: renderer.epoch };
  } finally {
    await retireRenderer(renderer);
    executor.dispose();
    gl.createTexture = create;
  }
}
