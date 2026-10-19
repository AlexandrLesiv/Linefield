import type { CanvasKit, PathBuilder } from "canvaskit-wasm";
import { bridge } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import { penBridge } from "./pen-bridge.ts";
import { appendPathPage } from "./path-page.ts";
import type { Presentation } from "./presentation.ts";
import { drawCommitted, rebuildCommitted, nextTurn } from "./committed-scene.ts";
export class SceneRenderer {
  private committed = "";
  private committedState: ReplyValue | undefined;
  private activeStroke = 0n;
  private activeBase = "";
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
    this.activeStroke = 0n;
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
        const previous = this.committedState;
        const reuse =
          this.builder &&
          previous &&
          this.activeBase === this.committed &&
          initial.owner === previous.owner &&
          initial.session === previous.session &&
          initial.mapping === previous.mapping &&
          initial.content === previous.content + 1n &&
          initial.interaction === 0n;
        if (reuse) {
          const terminal = penBridge.stroke(initial, this.activeStroke);
          if (terminal.code !== "ok" || !terminal.terminal) return;
          if (!(await this.extend(read, valid, this.activeStroke, terminal.geometry))) return;
          if (!valid() || !this.builder) return;
          paint.setColor(
            this.kit.Color4f(this.activeColor[0]!, this.activeColor[1]!, this.activeColor[2]!, 1),
          );
          const path = this.builder.snapshot();
          resources.add("path");
          try {
            drawCommitted(
              this.display,
              path,
              paint,
              bridge.mapping(initial.owner, initial.session).backing,
            );
          } finally {
            resources.release("path", path);
          }
        } else {
          this.resetActive();
          if (!(await rebuildCommitted(this.kit, this.display, paint, read, valid))) return;
        }
        if (!valid()) return;
        this.display.commit();
        this.committed = key;
        this.committedState = read();
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
        this.activeBase = key;
        this.activeStroke = stroke;
        this.builder = new this.kit.PathBuilder();
        resources.add("builder");
      }
      const builder = this.builder;
      if (!builder) return;
      const activeValid = () => valid() && read().interaction === current.interaction;
      if (!(await this.extend(read, activeValid, stroke, state.geometry))) return;
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
  private async extend(
    read: () => ReplyValue,
    valid: () => boolean,
    stroke: bigint,
    geometry: bigint,
  ) {
    const builder = this.builder;
    if (!builder) return false;
    while (valid()) {
      const latest = penBridge.stroke(read(), stroke);
      if (latest.code !== "ok" || latest.geometry !== geometry) return false;
      if (this.prefix >= latest.verbs) break;
      const page = penBridge.page(read(), stroke, geometry, this.prefix);
      if (page.code !== "ok") return false;
      appendPathPage(this.kit, builder, page);
      this.activeColor = [page.red, page.green, page.blue];
      this.prefix += BigInt(page.verbs.length);
      if (page.done) break;
      if (page.next !== this.prefix) throw Error("invalid-scene");
      await nextTurn();
    }
    return valid();
  }
  dispose() {
    this.stopped = true;
    this.resetActive();
  }
}
