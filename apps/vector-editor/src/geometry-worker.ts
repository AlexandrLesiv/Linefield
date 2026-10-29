import { prepareGeometry, preparationBuffers } from "./geometry-preparation";
import type { StrokeTransform } from "./stroke-transform";
import { loadCore } from "./load-core";

const scope = globalThis as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage:
    | ((
        event: MessageEvent<{
          id: number;
          input: Float32Array | Float64Array;
          tolerance: number;
          transform: StrokeTransform;
        }>,
      ) => void)
    | null;
};
async function initialize() {
  const core = await loadCore();
  scope.onmessage = ({ data }) => {
    const { id, input, tolerance, transform } = data ?? {};
    try {
      if (
        !Array.isArray(transform) ||
        transform.length !== 4 ||
        !transform.every(Number.isFinite) ||
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !(input instanceof Float32Array || input instanceof Float64Array) ||
        input.length === 0 ||
        input.length > core.geometry_input_capacity() ||
        !Number.isFinite(tolerance) ||
        tolerance < 0
      )
        throw Error("Invalid bounded geometry snapshot");
      const wide = input instanceof Float64Array;
      if (wide)
        new Float64Array(core.memory.buffer, core.geometry_input_f64_ptr(), input.length).set(
          input,
        );
      else new Float32Array(core.memory.buffer, core.geometry_input_ptr(), input.length).set(input);
      const count = wide
        ? core.render_snapshot_f64(input.length, tolerance)
        : core.render_snapshot(input.length, tolerance);
      if (!Number.isSafeInteger(count) || count <= 0 || count * 6 > core.geometry_output_capacity())
        throw Error("Invalid bounded geometry output");
      const output = wide
        ? new Float64Array(core.memory.buffer, core.render_chunk_f64_ptr(), count * 6).slice()
        : new Float32Array(core.memory.buffer, core.render_chunk_ptr(), count * 6).slice();
      const prepared = prepareGeometry(output, transform);
      scope.postMessage({ id, output, prepared }, preparationBuffers(output, prepared));
    } catch (error) {
      scope.postMessage({ id, error: String(error) });
    }
  };
  scope.postMessage({ ready: true });
}
initialize().catch((error) => scope.postMessage({ error: String(error) }));
