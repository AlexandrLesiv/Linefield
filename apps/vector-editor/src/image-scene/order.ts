import type { Core } from "../core";
import type { DrawPlan } from "../geometry-cache";
import type { ImageRecord } from "./records";
type Step = { ink: DrawPlan } | { image: ImageRecord };
/** Split existing coverage groups only where a canonical image interrupts paint order. */
export function mixedSteps(core: Core, plan: DrawPlan, images: readonly ImageRecord[]): Step[] {
  if (!images.length) return [{ ink: plan }];
  const steps: Step[] = [];
  let imageIndex = 0;
  let ink: DrawPlan = { records: [], groups: [] };
  const flush = () => {
    if (ink.records.length) steps.push({ ink });
    ink = { records: [], groups: [] };
  };
  for (const group of plan.groups) {
    let start = ink.records.length;
    const closeGroup = () => {
      if (ink.records.length > start) ink.groups.push({ ...group, start, end: ink.records.length });
    };
    for (let i = group.start; i < group.end; i++) {
      const record = plan.records[i];
      while (
        imageIndex < images.length &&
        core.selection_precedes(record.id, images[imageIndex].id)
      ) {
        closeGroup();
        flush();
        start = 0;
        steps.push({ image: images[imageIndex++] });
      }
      ink.records.push(record);
    }
    closeGroup();
  }
  flush();
  while (imageIndex < images.length) steps.push({ image: images[imageIndex++] });
  return steps;
}
