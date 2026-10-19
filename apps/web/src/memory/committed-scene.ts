import type { CanvasKit, Paint, Path } from "canvaskit-wasm";
import { bridge } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import { penBridge } from "./pen-bridge.ts";
import { appendPathPage } from "./path-page.ts";
import type { Presentation } from "./presentation.ts";
export const nextTurn = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
export function drawCommitted(display: Presentation, path: Path, paint: Paint, backing: number) {
  const target = display.owner.staging?.getCanvas();
  if (!target) throw Error("display-unavailable");
  target.save();
  target.scale(backing, backing);
  try {
    target.drawPath(path, paint);
  } finally {
    target.restore();
  }
}
export async function rebuildCommitted(
  kit: CanvasKit,
  display: Presentation,
  paint: Paint,
  read: () => ReplyValue,
  valid: () => boolean,
) {
  const { resources, staging } = display.owner;
  if (!staging) throw Error("display-unavailable");
  staging.getCanvas().clear(kit.WHITE);
  const initial = read();
  const backing = bridge.mapping(initial.owner, initial.session).backing;
  let after = 0n;
  let done = false;
  while (!done && valid()) {
    const ids = bridge.scene(read(), after);
    if (ids.code !== "ok") return false;
    done = ids.done;
    for (const stroke of ids.ids) {
      if (!valid()) return false;
      after = stroke;
      const state = penBridge.stroke(read(), stroke);
      if (state.code !== "ok") return false;
      if (!state.terminal) continue;
      const builder = new kit.PathBuilder();
      resources.add("builder");
      try {
        let offset = 0n;
        while (valid()) {
          const page = penBridge.page(read(), stroke, state.geometry, offset);
          if (page.code !== "ok") return false;
          appendPathPage(kit, builder, page);
          paint.setColor(kit.Color4f(page.red, page.green, page.blue, 1));
          if (page.done) break;
          offset = page.next;
          await nextTurn();
        }
        if (!valid()) return false;
        const path = builder.detach();
        resources.add("path");
        try {
          drawCommitted(display, path, paint, backing);
        } finally {
          resources.release("path", path);
        }
      } finally {
        resources.release("builder", builder);
      }
      await nextTurn();
    }
  }
  return valid();
}
