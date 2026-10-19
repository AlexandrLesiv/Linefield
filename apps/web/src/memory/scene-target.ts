import { bridge } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import { nextTurn } from "./committed-scene.ts";
// Capture a finite ordered target; later Ends cannot extend its captured stroke count.
export async function sceneTarget(
  read: () => ReplyValue,
  valid: () => boolean,
  prefix: bigint,
  remaining: bigint,
  interaction: bigint,
) {
  let terminal = prefix;
  while (valid()) {
    const state = read();
    const page = bridge.scene(state, terminal);
    if (page.code !== "ok") throw Error("invalid-scene");
    for (const id of page.ids) {
      if (remaining === 0n)
        return { terminal, active: state.interaction === interaction ? id : 0n };
      terminal = id;
      remaining--;
    }
    if (page.done) {
      if (remaining !== 0n) throw Error("invalid-scene");
      return { terminal, active: 0n };
    }
    if (!page.ids.length) throw Error("invalid-scene");
    await nextTurn();
  }
  return undefined;
}
