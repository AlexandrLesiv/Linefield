import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted } from "../undo-input.ts";
import { comparePixels } from "../cpu-raster/raster.ts";
import { append } from "./seed.ts";
import { capture } from "./capture.ts";
import type { Harness } from "./harness.ts";
export async function prefixCases(h: Harness, original: ReplyValue) {
  let state = accepted(penBridge.begin(original, 8, 30, 30, 0, false));
  const first = await h.frame(state, "small-active-prefix");
  const id = first.frame.strokes[first.frame.strokes.length - 1]!.id;
  state = await append(state, 1, 2, (i) => [30 + i * 20, 30 + i * 10, 0], false);
  const continued = await h.frame(state, "small-active-append");
  if (continued.result.builds || !continued.result.appendedVerbs)
    throw Error("active-prefix-not-reused");
  await h.reference(state, continued.pixels);
  state = accepted(penBridge.cancel(state, "escape"));
  state = accepted(penBridge.begin(state, 9, 60, 60, 0, false));
  const full = (await capture(state, h.width, h.height)).frame;
  if (full.strokes[full.strokes.length - 1]!.id === id) throw Error("stroke-id-alias");
  const pending = await h.client.run({ frame: full, fresh: true, guarded: false });
  h.rejectPublication(full, pending, true);
  state = accepted(penBridge.cancel(state, "escape"));
  const restored = await h.frame(state, "small-prefix-cancelled");
  await h.reference(state, restored.pixels);
  return state;
}
export async function redoBranch(h: Harness, original: ReplyValue, colored: Uint8Array) {
  if (!bridge.read(original.owner).canRedo) throw Error("cancel-lost-redo");
  let state = accepted(penBridge.redo(original));
  const restored = await h.frame(state, "redo-after-cancel");
  if (comparePixels(colored, restored.pixels).differentChannels)
    throw Error("redo-after-cancel-parity");
  state = accepted(penBridge.undo(state));
  return state;
}
