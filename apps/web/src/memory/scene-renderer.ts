import type { CanvasKit, PathBuilder } from "canvaskit-wasm";
import { bridge } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import { penBridge } from "./pen-bridge.ts";
import { appendPathPage } from "./path-page.ts";
import type { Presentation } from "./presentation.ts";
const nextTurn = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
export class SceneRenderer {
  private committed = "";
  private builder: PathBuilder | undefined;
  private prefix = 0n;
  private activeKey = "";
  private activeColor = [0, 0, 0];
  private stopped = false;
  private kit: CanvasKit;
  private display: Presentation;
  constructor(kit: CanvasKit, display: Presentation) {
    this.kit = kit;
    this.display = display;
  }
  private resetActive() {
    if (this.builder) this.display.owner.resources.release("builder", this.builder);
    this.builder = undefined;
    this.prefix = 0n;
    this.activeKey = "";
  }
  restore() {
    this.display.restore();
    this.resetActive();
  }
  async render(
    read: () => ReplyValue,
    alive: () => boolean,
    publish: (state: ReplyValue) => void,
  ): Promise<void> {
    const initial = read();
    const key = `${initial.owner}:${initial.session}:${initial.mapping}:${initial.content}`;
    const valid = () =>
      !this.stopped &&
      alive() &&
      `${read().owner}:${read().session}:${read().mapping}:${read().content}` === key;
    if (!valid()) return;
    const { resources, staging } = this.display.owner;
    if (!staging) throw Error("display-unavailable");
    const paint = new this.kit.Paint();
    resources.add("paint");
    paint.setAntiAlias(true);
    paint.setStyle(this.kit.PaintStyle.Fill);
    try {
      if (key !== this.committed) {
        this.resetActive();
        const target = staging.getCanvas();
        target.clear(this.kit.WHITE);
        const backing = bridge.mapping(initial.owner, initial.session).backing;
        {
          let after = 0n;
          let done = false;
          while (!done && valid()) {
            const ids = bridge.scene(read(), after);
            if (ids.code !== "ok") return;
            done = ids.done;
            for (const stroke of ids.ids) {
              if (!valid()) return;
              after = stroke;
              const state = penBridge.stroke(read(), stroke);
              if (state.code !== "ok") return;
              if (!state.terminal) continue;
              const builder = new this.kit.PathBuilder();
              resources.add("builder");
              try {
                let offset = 0n;
                while (valid()) {
                  const page = penBridge.page(read(), stroke, state.geometry, offset);
                  if (page.code !== "ok") return;
                  appendPathPage(this.kit, builder, page);
                  paint.setColor(this.kit.Color4f(page.red, page.green, page.blue, 1));
                  if (page.done) break;
                  offset = page.next;
                  await nextTurn();
                }
                if (!valid()) return;
                const path = builder.detach();
                resources.add("path");
                try {
                  target.save();
                  target.scale(backing, backing);
                  try {
                    target.drawPath(path, paint);
                  } finally {
                    target.restore();
                  }
                } finally {
                  resources.release("path", path);
                }
              } finally {
                resources.release("builder", builder);
              }
              await nextTurn();
            }
          }
        }
        if (!valid()) return;
        this.display.commit();
        this.committed = key;
        publish(read());
      }
      if (!valid()) return;
      const current = read();
      if (current.interaction === 0n) {
        this.restore();
        return;
      }
      // The transient stroke is last in paint order; IDs are paged without retaining copies.
      let stroke: bigint | undefined;
      let after = 0n;
      for (;;) {
        const ids = bridge.scene(read(), after);
        if (ids.code !== "ok") return;
        stroke = ids.ids.at(-1) ?? stroke;
        if (ids.done) break;
        after = ids.ids.at(-1)!;
      }
      if (stroke === undefined) return;
      const state = penBridge.stroke(read(), stroke);
      if (state.code !== "ok" || state.terminal) return;
      const activeKey = `${key}:${current.interaction}:${stroke}:${state.geometry}`;
      if (activeKey !== this.activeKey) {
        this.resetActive();
        this.activeKey = activeKey;
        this.builder = new this.kit.PathBuilder();
        resources.add("builder");
      }
      const builder = this.builder;
      if (!builder) return;
      const activeValid = () => valid() && read().interaction === current.interaction;
      while (activeValid()) {
        const latest = penBridge.stroke(read(), stroke);
        if (latest.code !== "ok" || latest.geometry !== state.geometry) return;
        if (this.prefix >= latest.verbs) break;
        const page = penBridge.page(read(), stroke, state.geometry, this.prefix);
        if (page.code !== "ok") return;
        appendPathPage(this.kit, builder, page);
        this.activeColor = [page.red, page.green, page.blue];
        this.prefix += BigInt(page.verbs.length);
        if (page.done) break;
        if (page.next !== this.prefix) throw Error("invalid-scene");
        await nextTurn();
      }
      if (!activeValid()) return;
      const backing = bridge.mapping(current.owner, current.session).backing;
      paint.setColor(
        this.kit.Color4f(this.activeColor[0]!, this.activeColor[1]!, this.activeColor[2]!, 1),
      );
      const path = builder.snapshot();
      resources.add("path");
      try {
        this.display.preview((canvas) => {
          canvas.save();
          canvas.scale(backing, backing);
          try {
            canvas.drawPath(path, paint);
          } finally {
            canvas.restore();
          }
        });
      } finally {
        resources.release("path", path);
      }
    } finally {
      resources.release("paint", paint);
    }
  }
  dispose() {
    this.stopped = true;
    this.resetActive();
  }
}
