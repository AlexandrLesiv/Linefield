import type { CanvasKit, Paint } from "canvaskit-wasm";
import type { ReplyValue } from "./bridge.ts";
import type { Presentation } from "./presentation.ts";
import { targetBridge } from "./render-target-bridge.ts";
import { panPreview } from "./pan-preview.ts";
import { RenderBudget } from "./render-budget.ts";
import { StrokePath } from "./stroke-path.ts";
import { drawCommitted } from "./committed-scene.ts";
import { renderCount, renderOperation, renderResources, renderCaughtUp } from "./render-metrics.ts";
export async function renderNavigation(
  kit: CanvasKit,
  display: Presentation,
  read: () => ReplyValue,
  alive: () => boolean,
  publish: (s: ReplyValue) => boolean,
): Promise<bigint | undefined> {
  const initial = read();
  const target = targetBridge.capture(initial);
  if (target.code !== "ok") return;
  const valid = alive;
  const budget = new RenderBudget();
  let path: StrokePath | undefined;
  let paint: Paint | undefined;
  try {
    const staging = display.owner.staging;
    if (!staging) throw Error("display-unavailable");
    const selectedPaint = new kit.Paint();
    paint = selectedPaint;
    display.owner.resources.add("paint");
    selectedPaint.setAntiAlias(true);
    selectedPaint.setStyle(kit.PaintStyle.Fill);
    staging.getCanvas().clear(kit.WHITE);
    renderCount("rebuilds");
    let after = 0n;
    while (valid()) {
      const ids = targetBridge.ids(read(), target.target, after);
      if (ids.code !== "ok") return;
      for (const id of ids.ids) {
        if (!valid()) return;
        path = new StrokePath(kit, display, id);
        const queries = {
          stroke: (s: ReplyValue, i: bigint) => targetBridge.stroke(s, target.target, i),
          page: (s: ReplyValue, i: bigint, g: bigint, o: bigint) =>
            targetBridge.page(s, target.target, i, g, o),
        };
        if (!(await path.extend(read, valid, budget, queries))) return;
        path.draw(selectedPaint, (p) => drawCommitted(display, p, selectedPaint, target.backing));
        path.dispose();
        path = undefined;
        renderCount("committedDraws");
        after = id;
      }
      if (ids.done) break;
      if (ids.ids.length === 0) throw Error("invalid-scene");
    }
    if (!valid()) return;
    const current = read();
    const plan = targetBridge.transform(current, target.target);
    const previous = panPreview(current);
    if (plan.code !== "ok" || previous.code !== "ok") return;
    if (!plan.canAdopt) {
      publish(initial);
      return;
    }
    const old = [
      previous.m11,
      previous.m12,
      previous.m21,
      previous.m22,
      previous.offsetX,
      previous.offsetY,
    ];
    const adopted = renderOperation(() =>
      display.commitTarget(
        plan.affine,
        plan.outside,
        old,
        previous.outside,
        () => alive() && targetBridge.adopt(current, target.target).code === "ok",
      ),
    );
    if (!adopted) return;
    renderCount("prefixPublications");
    // Only the captured exact mapping may acknowledge readiness. A transformed target
    // requests another coalesced pass through the existing publish scheduling path.
    if (publish(initial)) renderCaughtUp();
    return target.sourceMapping;
  } finally {
    path?.dispose();
    display.owner.resources.release("paint", paint ?? null);
    renderResources(display.owner.resources);
    targetBridge.release(initial, target.target);
  }
}
