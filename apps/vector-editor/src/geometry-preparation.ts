import type { GeometryData } from "./derived-geometry";
import { transformCapsules, type StrokeTransform } from "./stroke-transform";
export const COVERAGE_SPAN = 2;
export const COVERAGE_BLOCK_ROWS = 16;
/** Most completed geometry is one connected chain. Store each shared endpoint
 * once, preserving its Float32 bits; discontinuous future brush geometry keeps
 * the original six-float segment format. Both paths own their scratch copy. */
export function retainCapsules(data: Float32Array): {
  capsules: Float32Array;
  capsuleStride: 3 | 6;
};
export function retainCapsules(data: Float64Array): {
  capsules: Float64Array;
  capsuleStride: 3 | 6;
};
export function retainCapsules(data: GeometryData): {
  capsules: GeometryData;
  capsuleStride: 3 | 6;
};
export function retainCapsules(data: GeometryData): {
  capsules: GeometryData;
  capsuleStride: 3 | 6;
} {
  if (!data.length || data.length % 6) return { capsules: data.slice(), capsuleStride: 6 as const };
  const words = data.BYTES_PER_ELEMENT / 4;
  const bits = new Uint32Array(data.buffer, data.byteOffset, data.length * words);
  for (let i = 6 * words; i < bits.length; i += 6 * words)
    for (let k = 0; k < 3 * words; k++)
      if (bits[i + k] !== bits[i - 3 * words + k])
        return { capsules: data.slice(), capsuleStride: 6 as const };
  const capsules =
    data instanceof Float64Array
      ? new Float64Array(data.length / 2 + 3)
      : new Float32Array(data.length / 2 + 3);
  const output = new Uint32Array(capsules.buffer);
  output.set(bits.subarray(0, 3 * words));
  for (let i = 0; i < data.length / 6; i++)
    for (let k = 0; k < 3 * words; k++)
      output[(i + 1) * 3 * words + k] = bits[(i * 6 + 3) * words + k];
  return { capsules, capsuleStride: 3 as const };
}

/** Build a bounded second level over existing derived span bounds. */
export function coverageBlocks(spans: Float64Array) {
  const blocks = new Float64Array(Math.ceil(spans.length / (4 * COVERAGE_BLOCK_ROWS)) * 4);
  for (let row = 0; row < spans.length / 4; row += COVERAGE_BLOCK_ROWS) {
    const at = Math.floor(row / COVERAGE_BLOCK_ROWS) * 4;
    blocks[at] = blocks[at + 1] = Infinity;
    blocks[at + 2] = blocks[at + 3] = -Infinity;
    for (let i = row * 4; i < Math.min(spans.length, (row + COVERAGE_BLOCK_ROWS) * 4); i += 4) {
      blocks[at] = Math.min(blocks[at], spans[i]);
      blocks[at + 1] = Math.min(blocks[at + 1], spans[i + 1]);
      blocks[at + 2] = Math.max(blocks[at + 2], spans[i + 2]);
      blocks[at + 3] = Math.max(blocks[at + 3], spans[i + 3]);
    }
  }
  return blocks;
}

export function geometrySpans(data: Float32Array) {
  const count = data.length / 6;
  const spans = new Float64Array(Math.ceil(count / COVERAGE_SPAN) * 4);
  for (let first = 0; first < count; first += COVERAGE_SPAN) {
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (let i = first; i < Math.min(count, first + COVERAGE_SPAN); i++) {
      const k = i * 6;
      const radius = Math.max(data[k + 2], data[k + 5]);
      left = Math.min(left, data[k] - radius, data[k + 3] - radius);
      top = Math.min(top, data[k + 1] - radius, data[k + 4] - radius);
      right = Math.max(right, data[k] + radius, data[k + 3] + radius);
      bottom = Math.max(bottom, data[k + 1] + radius, data[k + 4] + radius);
    }
    const at = (first / COVERAGE_SPAN) * 4;
    spans[at] = left;
    spans[at + 1] = top;
    spans[at + 2] = right;
    spans[at + 3] = bottom;
  }
  return spans;
}
export function prepareGeometry(data: GeometryData, transform: StrokeTransform) {
  let projected: Float32Array;
  let local: GeometryData | undefined;
  let stride: 3 | 6;
  let capsules: Float32Array;
  if (
    data instanceof Float64Array ||
    transform[0] !== 1 ||
    transform[1] ||
    transform[2] ||
    transform[3]
  ) {
    const retained = retainCapsules(data);
    local = retained.capsules;
    stride = retained.capsuleStride;
    projected = new Float32Array(data.length);
    transformCapsules(data, projected, transform);
    capsules = new Float32Array(local.length);
    transformCapsules(local, capsules, transform);
  } else {
    projected = data;
    const retained = retainCapsules(data);
    capsules = retained.capsules;
    stride = retained.capsuleStride;
  }
  const spans = geometrySpans(projected);
  return {
    transform,
    projected,
    local,
    capsuleStride: stride,
    capsules,
    spans,
    spanBlocks: coverageBlocks(spans),
  };
}
export type PreparedGeometry = ReturnType<typeof prepareGeometry>;
export const preparedByteLengths = new WeakMap<GeometryData, number>();
export const preparedGeometry = new WeakMap<GeometryData, PreparedGeometry>();
export function preparationBuffers(data: GeometryData, prepared?: PreparedGeometry): ArrayBuffer[] {
  return [
    ...new Set(
      [
        data,
        prepared?.projected,
        prepared?.local,
        prepared?.capsules,
        prepared?.spans,
        prepared?.spanBlocks,
      ]
        .filter((value): value is GeometryData => !!value)
        .map((value) => value.buffer as ArrayBuffer),
    ),
  ];
}
