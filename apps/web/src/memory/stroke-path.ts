import type { CanvasKit, Paint, PathBuilder } from "canvaskit-wasm";
import type { ReplyValue } from "./bridge.ts";
import { penBridge } from "./pen-bridge.ts";
import { appendPathPage } from "./path-page.ts";
import type { Presentation } from "./presentation.ts";
import type { RenderBudget } from "./render-budget.ts";
import { renderOperation } from "./render-metrics.ts";
export class StrokePath {
  readonly id: bigint;
  private builder: PathBuilder;
  private prefix = 0n;
  private color = [0, 0, 0];
  private disposed = false;
  constructor(privateKit: CanvasKit, privateDisplay: Presentation, id: bigint) {
    this.kit = privateKit;
    this.display = privateDisplay;
    this.id = id;
    this.builder = new privateKit.PathBuilder();
    privateDisplay.owner.resources.add("builder");
  }
  private kit: CanvasKit;
  private display: Presentation;
  async extend(
    read: () => ReplyValue,
    valid: () => boolean,
    budget: RenderBudget,
  ): Promise<boolean> {
    if (!valid() || this.disposed) return false;
    const target = penBridge.stroke(read(), this.id);
    if (target.code !== "ok") return false;
    while (this.prefix < target.verbs) {
      const reserve = target.terminal
        ? Number(target.verbs - this.prefix > 4096n ? 4096n : target.verbs - this.prefix)
        : 4096;
      if (!(await budget.before(reserve, valid))) return false;
      if (!valid() || this.disposed) return false;
      const page = renderOperation(() =>
        penBridge.page(read(), this.id, target.geometry, this.prefix),
      );
      if (page.code !== "ok") return false;
      renderOperation(() => appendPathPage(this.kit, this.builder, page));
      budget.transferred(page.verbs.length);
      this.color = [page.red, page.green, page.blue];
      this.prefix += BigInt(page.verbs.length);
      if (page.done) break;
      if (page.next !== this.prefix) throw Error("invalid-scene");
    }
    return valid() && !this.disposed;
  }
  draw(paint: Paint, draw: (path: import("canvaskit-wasm").Path) => void): void {
    if (this.disposed) return;
    paint.setColor(this.kit.Color4f(this.color[0]!, this.color[1]!, this.color[2]!, 1));
    const path = renderOperation(() => this.builder.snapshot());
    this.display.owner.resources.add("path");
    try {
      renderOperation(() => draw(path));
    } finally {
      this.display.owner.resources.release("path", path);
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.display.owner.resources.release("builder", this.builder);
  }
}
