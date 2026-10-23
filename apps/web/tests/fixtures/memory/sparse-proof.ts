import { SparseStorage } from "../../../src/memory/sparse-storage.ts";
import { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { commandTurn } from "../../../src/memory/frame-commands.ts";
import { sparseSource } from "./sparse-source.ts";
import { sparseRender } from "./sparse-render.ts";
import { sparseFailure } from "./sparse-failure.ts";
import { sparseReuse } from "./sparse-reuse.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { samplingDifference, samplingImage } from "./sampling-pixels.ts";
type Case = {
  width: number;
  height: number;
  stroke: number;
  edge?: boolean;
  angle?: number;
  line?: boolean;
  refuse?: boolean;
  fault?: "zero" | "overflow" | "nonfinite" | "underflow";
};
export async function sparseProof(canvas: HTMLCanvasElement) {
  const storage = new SparseStorage(),
    rows = [];
  let issuedReaderFailure;
  const cases: Case[] = [
    { width: 128, height: 128, stroke: 4 },
    { width: 129, height: 131, stroke: 4, edge: true },
    { width: 128, height: 128, stroke: 4, angle: Math.PI / 12, line: true },
    { width: 64, height: 65, stroke: 1 },
    { width: 4096, height: 2048, stroke: 4 },
    { width: 8192, height: 1024, stroke: 4, refuse: true },
    { width: 63, height: 65, stroke: 4, refuse: true },
    { width: 512, height: 512, stroke: 512, refuse: true },
    ...(["zero", "overflow", "nonfinite", "underflow"] as const).map((fault) => ({
      width: 128,
      height: 128,
      stroke: 4,
      refuse: true,
      fault,
    })),
  ];
  for (const test of cases) {
    const source = sparseSource(
      test.width,
      test.height,
      test.stroke,
      test.edge ?? false,
      test.angle ?? 0,
      test.line,
    );
    const renderer = new GpuRenderer(canvas, test.width, test.height),
      gl = renderer.gl;
    try {
      const matrix = source.matrix.slice();
      if (test.fault)
        matrix[0] =
          test.fault === "zero"
            ? 0
            : test.fault === "overflow"
              ? 3e38
              : test.fault === "underflow"
                ? 1e-35
                : NaN;
      const work = { visited: 0, entries: 0, instances: 0, area: 0, disabled: false };
      const precision =
        gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision ?? 0;
      const subpixels: unknown = gl.getParameter(gl.SUBPIXEL_BITS);
      const plan = new SparsePlan(
        storage,
        source.data,
        matrix,
        test.width,
        test.height,
        precision,
        typeof subpixels === "number" ? subpixels : 0,
        work,
      );
      let status: "pending" | "done" | "refused" = "pending",
        turns = 0;
      while (status === "pending") {
        // A low transition budget positively exercises the real continuation without changing caps.
        status = plan.step({ deadline: performance.now() + 2, remaining: 64 });
        if (status === "pending") {
          turns++;
          await commandTurn();
        }
        if (turns > 10000) throw Error("planner progress");
      }
      const reference = await sparseRender(renderer, source.data, source.matrix);
      const actual = await sparseRender(
        renderer,
        source.data,
        source.matrix,
        status === "done" ? plan : undefined,
      );
      const difference = samplingDifference(actual.pixels, reference.pixels);
      const row = {
        ...test,
        packed: renderer.resources.packed,
        capsules: source.data.length / 6,
        status,
        reason: plan.reason,
        turns,
        transitions: plan.transitions,
        slots: plan.routes.slots,
        descriptors: plan.routes.descriptors,
        originalDescriptors: plan.routes.originalDescriptors,
        entries: plan.routes.entries,
        geometry: actual.geometry,
        presented: actual.presented,
        work,
        uncertainty: plan.projection.maximumUncertainty,
        difference,
      };
      rows.push(row);
      if (
        !difference.ink ||
        difference.changed ||
        (status === "refused") !== !!test.refuse ||
        (!test.refuse && (!actual.geometry || !actual.presented || !turns))
      ) {
        const captures =
          test.width <= 512
            ? {
                reference: await samplingImage(renderer, reference.pixels),
                actual: await samplingImage(renderer, actual.pixels),
              }
            : undefined;
        throw Error(`sparse proof ${JSON.stringify({ row, captures })}`);
      }
      if (
        rows.length === 1 &&
        (source.data.length !== 126 ||
          plan.routes.slots !== 4 ||
          plan.routes.originalDescriptors !== 11 ||
          plan.routes.descriptors !== 2)
      )
        throw Error(`21-capsule/11-span/four-slot positive control ${JSON.stringify(row)}`);
      if (
        test.stroke === 512 &&
        (!(plan.reason === "route-work" || plan.reason === "slot-or-area") ||
          work.visited !== source.data.length / 6 ||
          !work.instances ||
          !work.area ||
          !plan.routes.slots ||
          !(plan.projection.maximumUncertainty < 2 - 1.414214))
      )
        throw Error(`wide route/work refusal ${JSON.stringify(row)}`);
      if (rows.length === 1)
        issuedReaderFailure = await sparseFailure(renderer, source.data, source.matrix, plan);
    } finally {
      await retireRenderer(renderer);
      source.close();
    }
  }
  return {
    rows,
    issuedReaderFailure,
    reuse: await sparseReuse(canvas),
    plannerPayload: storage.payloadBytes,
    usedPayload: storage.usedBytes,
    wrapperObjects: storage.wrapperObjects,
    routeBytes: 262144,
    productionEnabled: false,
    evidence:
      "generated actual source/page/placement plus real GL, isolated stream proof; no production arena loans or candidate integration; negative planner input injection never changes canonical geometry",
  };
}
