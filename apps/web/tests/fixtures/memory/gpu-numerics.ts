import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
export function gpuNumerics() {
  const seed: unknown = Reflect.get(api, "fixtureFarView");
  if (typeof seed !== "function") throw Error("fixture missing");
  let cases = 0,
    maximumDeviceError = 0;
  const angles = [
    -Math.PI,
    -Math.PI / 2 - 1e-10,
    -Math.PI / 2 + 1e-10,
    0,
    0.731,
    Math.PI / 2 + 1e-10,
  ];
  for (const region of [0n, 9223372036854775800n, -9223372036854775800n])
    for (const local of [0.125, 65535.875])
      for (const [width, height, backing] of [
        [512, 512, 4],
        [8192, 1, 1],
        [1, 8192, 1],
        [2048, 1024, 1],
      ])
        for (const zoom of [0.05, 16])
          for (const angle of angles) {
            if (width === undefined || height === undefined || backing === undefined)
              throw Error("profile");
            const result: unknown = seed(region, local);
            if (!(result instanceof api.Reply)) throw Error("fixture type");
            const seeded = take(() => result, copyReply);
            if (seeded.code !== "ok") throw Error("far setup");
            let s = bridge.create();
            s = bridge.enter(s.owner);
            s = bridge.metrics(s, 1n, width, height, backing);
            if (s.code !== "ok") throw Error("metrics");
            s = edit.style(s, 512, [0, 0, 0]);
            s = edit.view(s, zoom, width / 2, height / 2, false);
            s = edit.view(s, angle, width / 2, height / 2, true);
            for (const [x, y] of [
              [0, 0],
              [width, height],
              [width / 2 + 0.125, height / 2 + 0.25],
            ]) {
              if (x === undefined || y === undefined) throw Error("position");
              s = edit.begin(s, 1, x, y, 0.37, true);
              if (s.code !== "ok") throw Error(`begin ${s.code}`);
              const ids = scene.ids(s, 0n).ids;
              const id = ids[ids.length - 1];
              if (id === undefined) throw Error("id");
              const p = scene.page(s, id, 1n, 0n, zoom * backing, 0n);
              if (p.code !== "ok") throw Error(`page ${p.code}`);
              const placement = scene.placement(s, id, p.page);
              if (placement.code !== "ok" || !placement.available) throw Error("placement");
              const m = placement.matrix,
                px = p.data[0] ?? NaN,
                py = p.data[1] ?? NaN;
              const error = Math.max(
                Math.abs((m[0] ?? NaN) * px + (m[2] ?? NaN) * py + (m[4] ?? NaN) - x * backing),
                Math.abs((m[1] ?? NaN) * px + (m[3] ?? NaN) * py + (m[5] ?? NaN) - y * backing),
              );
              if (!Number.isFinite(error) || error > 0.25) throw Error(`device error ${error}`);
              maximumDeviceError = Math.max(maximumDeviceError, error);
              cases++;
              scene.release(s, p.page);
              s = edit.cancel(s, "escape");
            }
            bridge.leave(s);
            bridge.dispose(s.owner);
          }
  return {
    cases,
    maximumDeviceError,
    scope:
      "synthetic checked-boundary input/packing/placement, not future transform-scale or physical-device acceptance",
  };
}
