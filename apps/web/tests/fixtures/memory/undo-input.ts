import { bridge } from "../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";

export const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export function accepted(value: ReplyValue): ReplyValue {
  if (value.code !== "ok" && value.code !== "noop") throw Error(`undo-probe-${value.code}`);
  return value;
}
export async function seedUndo(state: ReplyValue, width: number, height: number, sparse: boolean) {
  const point = (index: number) => [
    sparse ? width * (-1 + (3 * index) / 65_536) : width * (0.5 + 0.43 * Math.cos(index / 128)),
    height * (0.5 + 0.4 * Math.sin((3 * index) / 128)),
  ];
  const first = point(0);
  state = accepted(penBridge.begin(state, 1, first[0]!, first[1]!, 0, false));
  for (let index = 1; index < 65_537; index += 256) {
    const x = new Float64Array(256);
    const y = new Float64Array(256);
    for (let offset = 0; offset < 256; offset++) {
      const current = point(index + offset);
      x[offset] = current[0]!;
      y[offset] = current[1]!;
    }
    state = accepted(
      penBridge.append(state, BigInt(index), {
        x,
        y,
        pressure: new Float64Array(256),
        hasPressure: new Uint8Array(256),
      }),
    );
    await turn();
  }
  state = accepted(penBridge.end(state, 65_537n));
  state = accepted(penBridge.settings(state, 24, 0.8, 0.1, 0.2));
  state = accepted(penBridge.begin(state, 2, width / 2, height / 2, 0, false));
  state = accepted(penBridge.end(state, 1n));
  if (bridge.read(state.owner).strokeCount !== 2n) throw Error("seed-count");
  return state;
}
