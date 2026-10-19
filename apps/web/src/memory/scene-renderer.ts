import type { CanvasKit } from "canvaskit-wasm";
import { bridge } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { Presentation } from "./presentation.ts";
import { drawCommitted } from "./committed-scene.ts";
import { RenderBudget } from "./render-budget.ts";
import { StrokePath } from "./stroke-path.ts";
import { sceneTarget } from "./scene-target.ts";
import { PanPresentation } from "./pan-preview.ts";
import {
  renderCount,
  renderPending,
  renderCaughtUp,
  renderOperation,
  renderResources,
} from "./render-metrics.ts";
export class SceneRenderer {
  private epoch = 0;
  private staged = 0n;
  private stagedCount = 0n;
  private published = -1n;
  private frontCompleted = 0n;
  private frontActive = 0n;
  private frontStroke = 0n;
  private frontMapping = 0n;
  private pan = new PanPresentation();
  private path: StrokePath | undefined;
  private reset = true;
  private stopped = false;
  private kit: CanvasKit;
  private display: Presentation;
  constructor(kit: CanvasKit, display: Presentation) {
    this.kit = kit;
    this.display = display;
  }
  changed(previous: ReplyValue, next: ReplyValue): void {
    if (
      previous.interaction !== next.interaction ||
      previous.mapping !== next.mapping ||
      previous.content !== next.content
    ) {
      if (this.pan.update(next, this.frontMapping, this.display)) this.epoch++;
    }
    if (previous.content === next.content && previous.mapping === next.mapping) return;
    renderPending();
    const ended = previous.interaction !== 0n && next.interaction === 0n && !next.activeCancelled;
    if (previous.mapping !== next.mapping || !ended) {
      this.epoch++;
      renderCount("invalidations");
      this.reset = true;
      this.frontActive = 0n;
      this.frontCompleted = 0n;
    } else if (this.frontActive === previous.interaction) {
      this.frontCompleted = this.frontStroke;
      this.frontActive = 0n;
    }
  }
  restore(): void {
    // An ended preview may be ahead of the cache. Never erase it for a newer cancellation.
    if (this.frontActive !== 0n) this.display.restore();
    this.frontActive = 0n;
  }
  private select(id: bigint): StrokePath {
    if (this.path?.id !== id) {
      this.path?.dispose();
      this.path = new StrokePath(this.kit, this.display, id);
    }
    return this.path;
  }
  async render(
    read: () => ReplyValue,
    alive: () => boolean,
    publish: (state: ReplyValue) => void,
  ): Promise<void> {
    const initial = read();
    if (this.pan.active) return;
    const epoch = this.epoch;
    const valid = () => !this.stopped && alive() && this.epoch === epoch;
    if (!valid()) return;
    const count = bridge.read(initial.owner).strokeCount;
    const target = await sceneTarget(
      read,
      valid,
      this.reset ? 0n : this.staged,
      count - (this.reset ? 0n : this.stagedCount),
      initial.interaction,
    );
    if (!target || !valid()) return;
    const { resources, staging } = this.display.owner;
    if (!staging) throw Error("display-unavailable");
    if (this.reset) {
      renderCount("rebuilds");
      this.path?.dispose();
      this.path = undefined;
      staging.getCanvas().clear(this.kit.WHITE);
      this.staged = 0n;
      this.stagedCount = 0n;
      this.published = -1n;
      this.reset = false;
    }
    const backing = bridge.mapping(initial.owner, initial.session).backing;
    const budget = new RenderBudget();
    const paint = new this.kit.Paint();
    resources.add("paint");
    paint.setAntiAlias(true);
    paint.setStyle(this.kit.PaintStyle.Fill);
    try {
      while (this.staged < target.terminal && valid()) {
        const before = this.staged;
        const ids = bridge.scene(read(), this.staged);
        if (ids.code !== "ok") return;
        for (const id of ids.ids) {
          if (id > target.terminal) break;
          if (!valid()) return;
          const path = this.select(id);
          if (!(await path.extend(read, valid, budget))) return;
          path.draw(paint, (value) => drawCommitted(this.display, value, paint, backing));
          renderCount("committedDraws");
          this.staged = id;
          this.stagedCount++;
        }
        if (valid() && before === this.staged) throw Error("invalid-scene");
      }
      if (!valid()) return;
      // Do not overwrite a newer completed preview with an older catch-up target.
      if (target.terminal >= this.frontCompleted && this.published !== initial.content) {
        renderOperation(() => this.display.commit());
        renderCount("prefixPublications");
        this.published = initial.content;
        this.frontCompleted = target.terminal;
        this.frontMapping = initial.mapping;
        this.frontActive = 0n;
        publish(initial);
        if (read().content === initial.content) renderCaughtUp();
      }
      const current = read();
      if (current.content !== initial.content || current.interaction === 0n || !target.active)
        return;
      const activeValid = () => valid() && read().interaction === current.interaction;
      const path = this.select(target.active);
      if (!(await path.extend(read, activeValid, budget))) return;
      path.draw(paint, (value) => {
        this.display.preview((canvas) => {
          canvas.save();
          canvas.scale(backing, backing);
          try {
            canvas.drawPath(value, paint);
          } finally {
            canvas.restore();
          }
        });
      });
      this.frontActive = current.interaction;
      this.frontStroke = target.active;
    } finally {
      resources.release("paint", paint);
      renderResources(resources);
    }
  }
  dispose(): void {
    this.stopped = true;
    this.path?.dispose();
    this.path = undefined;
  }
}
