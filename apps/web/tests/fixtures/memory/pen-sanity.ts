import type { CanvasKit } from "canvaskit-wasm";
import type { Presentation } from "../../../src/memory/presentation.ts";
import { bridge } from "../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { appendPathPage } from "../../../src/memory/path-page.ts";
export function verifyDot(kit: CanvasKit, display: Presentation, state: ReplyValue) {
  const stroke = bridge.scene(state).ids[0];
  if (stroke === undefined) throw Error("dot-stroke");
  const status = penBridge.stroke(state, stroke);
  const page = penBridge.page(state, stroke, status.geometry, 0n);
  const builder = new kit.PathBuilder();
  const paint = new kit.Paint();
  paint.setColor(kit.BLACK);
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  try {
    appendPathPage(kit, builder, page);
    const path = builder.detach();
    try {
      const bounds = Array.from(path.getBounds());
      if (bounds.join() !== "948,380,956,388") throw Error(`dot-bounds-${bounds.join()}`);
      display.render((target) => target.drawPath(path, paint));
      const pixels = display.pixels();
      if (!(pixels instanceof Uint8Array)) throw Error("dot-readback");
      const redAt = (x: number, y: number) => pixels[(y * display.owner.width + x) * 4];
      if (redAt(952, 384) !== 0 || redAt(958, 384) !== 255 || redAt(952, 390) !== 255)
        throw Error("dot-pixels");
      return {
        bounds,
        center: redAt(952, 384),
        outside: redAt(958, 384),
        contractVerbs: Array.from(page.verbs),
        kitConic: kit.CONIC_VERB,
        kitClose: kit.CLOSE_VERB,
      };
    } finally {
      path.delete();
    }
  } finally {
    builder.delete();
    paint.delete();
  }
}
export function verifyTaper(kit: CanvasKit, display: Presentation, initial: ReplyValue) {
  let state = penBridge.cancel(initial, "escape");
  state = penBridge.begin(state, 2, 200, 200, 0, true);
  state = penBridge.append(state, 1n, {
    x: new Float64Array([220]),
    y: new Float64Array([200]),
    pressure: new Float64Array([1]),
    hasPressure: new Uint8Array([1]),
  });
  if (state.code !== "ok") throw Error("taper-command");
  const id = bridge.scene(state).ids[0];
  if (id === undefined) throw Error("taper-stroke");
  const status = penBridge.stroke(state, id);
  const page = penBridge.page(state, id, status.geometry, 0n);
  const builder = new kit.PathBuilder();
  const paint = new kit.Paint();
  paint.setColor(kit.BLACK);
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  try {
    appendPathPage(kit, builder, page);
    const path = builder.detach();
    try {
      display.render((target) => target.drawPath(path, paint));
      const pixels = display.pixels();
      if (!(pixels instanceof Uint8Array)) throw Error("taper-readback");
      const redAt = (x: number, y: number) => pixels[(y * display.owner.width + x) * 4];
      if (redAt(210, 200) !== 0 || redAt(222, 200) !== 0 || redAt(220, 206) !== 255)
        throw Error("taper-pixels");
      const verification = {
        bounds: Array.from(path.getBounds()),
        middle: redAt(210, 200),
        end: redAt(222, 200),
        outside: redAt(220, 206),
        verbs: page.verbs.length,
      };
      state = penBridge.cancel(state, "escape");
      return { state, verification };
    } finally {
      path.delete();
    }
  } finally {
    builder.delete();
    paint.delete();
  }
}
