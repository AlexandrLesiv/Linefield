import type { Group } from "./gpu";
export type SnapshotCore = {
  memory: WebAssembly.Memory;
  svg_begin(): number;
  svg_prepare(token: number): number;
  svg_next(token: number, tolerance: number): number;
  svg_output_ptr(token: number): number;
  svg_status(token: number): number;
  svg_cancel(token: number): number;
  svg_cleanup(token: number): number;
  svg_revision(token: number): bigint;
  svg_setting(token: number, index: number): number;
  svg_retained_bytes(token: number): number;
  svg_origin_region(token: number, axis: number): bigint;
  svg_origin_local(token: number, axis: number): number;
};
const yieldTask = () => new Promise((resolve) => setTimeout(resolve, 0));
/** Isolated bounded-corpus capture; production streaming adoption is not implied. */
export async function capture(core: SnapshotCore, tolerance: number) {
  const token = core.svg_begin();
  if (!token) throw Error("svg-active-or-busy");
  const collected: {
    id: number;
    brush: number;
    parts: Uint8Array[];
    positions: Float64Array[];
    bytes: number;
    points: number;
  }[] = [];
  let derivedBytes = 0,
    packets = 0,
    retainedBytes = 0,
    bounds = [Infinity, Infinity, -Infinity, -Infinity];
  try {
    while (core.svg_prepare(token) === 1) await yieldTask();
    if (core.svg_status(token) !== 2) throw Error("svg-snapshot-not-sealed");
    const origin = [0, 1].map((axis) => ({
      region: String(core.svg_origin_region(token, axis)),
      local: core.svg_origin_local(token, axis),
    }));
    const revision = String(core.svg_revision(token));
    const settings = { paper: core.svg_setting(token, 0), grid: core.svg_setting(token, 1) };
    if (settings.paper === 0xffffffff || settings.grid === 0xffffffff)
      throw Error("svg-snapshot-settings");
    retainedBytes = core.svg_retained_bytes(token);
    let previous = "";
    for (;;) {
      const length = core.svg_next(token, tolerance);
      if (!length) {
        if (core.svg_status(token) === 3) break;
        throw Error("svg-snapshot-stream");
      }
      const values = new Float64Array(
        core.memory.buffer,
        core.svg_output_ptr(token),
        length,
      ).slice();
      if (values[0] !== 1 || length < 24 || (length - 24) % 6) throw Error("svg-packet-version");
      if (derivedBytes + ((length - 24) / 6) * 80 > 16 * 1024 * 1024)
        throw Error("svg-fixture-derived-limit");
      const coordinates = values.slice(24),
        count = coordinates.length / 6,
        bytes = new ArrayBuffer(count * 32),
        floats = new Float32Array(bytes),
        packed = new Uint8Array(bytes);
      const width = Math.max(
          0,
          Math.min(65535, Math.round((Math.log2(Math.max(2 ** -32, values[9])) + 32) * 1024)),
        ),
        color = values[7];
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < 6; k++) floats[i * 8 + k] = coordinates[i * 6 + k];
        packed.set(
          [
            (color >>> 16) & 255,
            (color >>> 8) & 255,
            color & 255,
            Math.round(values[8] * 255),
            values[6],
            width & 255,
            width >>> 8,
            values[2] & 255,
          ],
          i * 32 + 24,
        );
      }
      const key = [values[5], values[2], values[3], values[6], color, values[8], values[9]].join(
        ":",
      );
      let last = collected.at(-1);
      if (!last || key !== previous) {
        last = { id: values[3], brush: values[6], parts: [], positions: [], bytes: 0, points: 0 };
        collected.push(last);
      }
      last.parts.push(packed);
      last.positions.push(coordinates);
      last.bytes += bytes.byteLength;
      last.points += coordinates.length;
      previous = key;
      derivedBytes += bytes.byteLength + coordinates.byteLength;
      packets++;
      if (derivedBytes > 16 * 1024 * 1024) throw Error("svg-fixture-derived-limit");
      bounds = [
        Math.min(bounds[0], values[18]),
        Math.min(bounds[1], values[19]),
        Math.max(bounds[2], values[20]),
        Math.max(bounds[3], values[21]),
      ];
      await yieldTask();
    }
    const groups: Group[] = collected.map((group) => {
      const bytes = new Uint8Array(group.bytes),
        coordinates = new Float64Array(group.points);
      let a = 0,
        b = 0;
      for (const part of group.parts) {
        bytes.set(part, a);
        a += part.length;
      }
      for (const part of group.positions) {
        coordinates.set(part, b);
        b += part.length;
      }
      return { id: group.id, brush: group.brush, bytes: bytes.buffer, coordinates };
    });
    return {
      groups,
      bounds,
      origin,
      revision,
      settings,
      retainedBytes,
      derivedBytes,
      packets,
      transientDerivedBound: derivedBytes * 2,
    };
  } finally {
    core.svg_cancel(token);
    while (core.svg_cleanup(token) !== 1) await yieldTask();
  }
}
