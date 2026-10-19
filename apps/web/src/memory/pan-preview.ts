import * as api from "#memory-bindings";
import { consume, reply } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { Presentation } from "./presentation.ts";
import { renderCount, renderPanTranslation } from "./render-metrics.ts";
export function panPreview(state: ReplyValue) {
  return consume(
    "pan-preview",
    () => api.memoryPanPreview(state.owner, state.session, state.mapping),
    (value) => ({
      ...reply(value),
      sourceInteraction: value.sourceInteraction,
      sourceMapping: value.sourceMapping,
      active: value.active,
      outside: value.outside,
      offsetX: value.offsetX,
      offsetY: value.offsetY,
    }),
  );
}
export class PanPresentation {
  active = false;
  private source = 0n;
  private mapping = 0n;
  update(state: ReplyValue, frontMapping: bigint, display: Presentation): boolean {
    const value = panPreview(state);
    const began = !this.active && value.code === "ok" && value.active;
    this.active = value.code === "ok" && value.active;
    if (value.code !== "ok") {
      this.source = 0n;
      this.mapping = 0n;
      return false;
    }
    const started = this.source !== value.sourceInteraction;
    if (started) {
      if (frontMapping !== value.sourceMapping) throw Error("display-provenance");
      display.freezeFront();
      this.source = value.sourceInteraction;
    }
    if (started || this.mapping !== state.mapping) {
      renderPanTranslation(() => display.translate(value.offsetX, value.offsetY, value.outside));
      renderCount("panPreviewPublications");
      this.mapping = state.mapping;
    }
    return began;
  }
}
