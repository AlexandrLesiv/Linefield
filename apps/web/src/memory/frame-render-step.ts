import { frames } from "./frame-bridge.ts";
import { AnchorMiss } from "./placement-phase.ts";
import { contribute } from "./frame-recipe.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { Recipe } from "./frame-recipe.ts";
import type { FrameCommand } from "./frame-commands.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { ReplyValue } from "./bridge.ts";
/** One borrowed page remains owned until its bounded atomic scissor draws finish. */
export function renderStep(
  command: FrameCommand,
  renderer: GpuRenderer,
  state: ReplyValue,
  frame: bigint,
  recipe: Recipe,
  region: boolean,
) {
  if (command.kind === "group") return { cost: 1, run: () => renderer.group() };
  if (command.kind === "composite") {
    const clips = renderer.compositePlan();
    return {
      cost: clips.length,
      run: () => {
        if (region && !clips.length) metrics.panSkippedComposites++;
        renderer.composite(clips);
      },
    };
  }
  const p = frames.placement(state, frame, command.stroke, command.page.page);
  if (p.code !== "ok") throw Error(p.code);
  if (p.disposition === "anchorMiss") throw new AnchorMiss(p.miss);
  const plan = p.available ? renderer.plan(command.page.data, p.matrix, p.offset) : undefined;
  return {
    cost: plan?.clips.length ?? 0,
    run: () => {
      if (!plan?.clips.length) {
        if (region) metrics.panSkippedDraws++;
        return;
      }
      contribute(recipe, command.page, p.epoch, p.offset);
      if (region && !recipe.eligible) throw new AnchorMiss("recipe");
      renderer.draw(command.page.data, p.matrix, command.color, command.page.page, p.offset, plan);
    },
  };
}
