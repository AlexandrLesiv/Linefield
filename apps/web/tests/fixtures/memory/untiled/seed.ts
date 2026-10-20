import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { viewportBridge } from "../../../../src/memory/viewport-bridge.ts";
import { accepted, turn } from "../undo-input.ts";
import type { Case } from "../padded/catalogue.ts";
import { hostUnit } from "./telemetry.ts";
import type { Shape } from "./catalogue.ts";
export async function create(width: number, height: number, zoom = 1) {
  let state = accepted(bridge.create());
  state = accepted(bridge.enter(state.owner));
  state = accepted(bridge.metrics(state, 1n, width, height, 1));
  state = accepted(bridge.presented(state));
  while (bridge.mapping(state.owner, state.session).zoom > zoom) {
    state = accepted(viewportBridge.zoom(state, "out"));
    state = accepted(bridge.presented(state));
  }
  if (bridge.mapping(state.owner, state.session).zoom !== zoom) throw Error("seed-zoom");
  return state;
}
export async function append(
  state: ReplyValue,
  first: number,
  count: number,
  point: (i: number) => readonly [number, number, number],
  pressure: boolean,
  guarded = false,
) {
  for (let i = first; i < first + count; i += 256) {
    state = hostUnit(
      "input-batch-build-command-copy",
      () => {
        const size = Math.min(256, first + count - i);
        const values = Array.from({ length: size }, (_, j) => point(i + j));
        return accepted(
          penBridge.append(state, BigInt(i), {
            x: Float64Array.from(values, (p) => p[0]),
            y: Float64Array.from(values, (p) => p[1]),
            pressure: Float64Array.from(values, (p) => p[2]),
            hasPressure: new Uint8Array(size).fill(pressure ? 1 : 0),
          }),
        );
      },
      guarded,
    );
    await turn();
  }
  return state;
}
export async function seed(item: Case, width: number, height: number) {
  let state = await create(width, height, item.zoom);
  state = accepted(penBridge.settings(state, item.width, 0, 0, 0));
  const point = (i: number): readonly [number, number, number] => {
    let x = width / 2 + item.phase[0],
      y = height / 2 + item.phase[1];
    if (item.anchor === "left" || item.anchor === "corner") x = item.phase[0];
    if (item.anchor === "corner") y = item.phase[1];
    if (item.anchor === "bottom-right") {
      x = width - item.phase[0];
      y = height - item.phase[1];
    }
    if (["line", "diagonal", "pressure"].includes(item.shape)) {
      x += -48 + (96 * i) / (item.samples - 1);
      if (item.shape === "diagonal") y += -48 + (96 * i) / (item.samples - 1);
    } else if (item.shape === "retraced") {
      x += 10 * Math.cos(i * 0.8);
      y += 10 * Math.sin(i * 2.4);
    } else if (item.shape === "crossing") {
      x += [-40, 40, -40, 40][i]!;
      y += [-40, 40, 40, -40][i]!;
    }
    return [x, y, item.shape === "pressure" ? i % 2 : 0];
  };
  const p = point(0);
  state = accepted(penBridge.begin(state, 1, p[0], p[1], p[2], item.pressure));
  state = await append(state, 1, item.samples - 1, point, item.pressure);
  if (item.rotation) {
    state = accepted(penBridge.end(state, BigInt(item.samples)));
    for (let i = 0; i < item.rotation; i++) {
      state = accepted(viewportBridge.rotate(state, "right"));
      state = accepted(bridge.presented(state));
    }
  }
  return state;
}
export function longPoint(shape: Shape, width: number, height: number) {
  return (i: number): readonly [number, number, number] => [
    shape === "coincident"
      ? width / 2 + 0.375
      : shape === "sparse"
        ? width * (-1 + (3 * i) / 65_536)
        : width * (0.5 + 0.43 * Math.cos(i / 128)),
    shape === "coincident" ? height / 2 + 0.625 : height * (0.5 + 0.4 * Math.sin((3 * i) / 128)),
    shape === "varying" ? (i % 513) / 512 : 0,
  ];
}
