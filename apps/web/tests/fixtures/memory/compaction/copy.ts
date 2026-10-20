import type { PreparationReply } from "#preparation-bindings";
import type { PathPage } from "../../../../src/memory/path-page.ts";
export function reply(value: PreparationReply) {
  try {
    return {
      status: value.status,
      handle: value.handle,
      capture: value.capture,
      source: value.source_cursor,
      output: value.output_cursor,
      generation: value.output_generation,
      original: value.original,
      retained: value.retained,
      duplicates: value.duplicates,
      covered: value.covered,
      predicates: value.predicates,
      visits: value.visits,
      comparisons: value.comparisons,
      budgetKeeps: value.budget_keeps,
      indexBytes: value.index_bytes,
      requiredBytes: value.required_bytes,
    };
  } finally {
    value.free();
  }
}
export function* slices(page: PathPage) {
  let v = 0,
    p = 0,
    w = 0;
  while (v < page.verbs.length) {
    const start = [v, p, w];
    for (let contours = 0; contours < 32 && v < page.verbs.length; contours++) {
      let closed = false;
      while (v < page.verbs.length && !closed) {
        const verb = page.verbs[v++];
        if (verb === 0 || verb === 1) p += 2;
        else if (verb === 2) {
          p += 4;
          w++;
        } else if (verb === 3) closed = true;
        else throw Error("source-verb");
      }
      if (!closed) throw Error("source-open-contour");
    }
    yield {
      verbs: page.verbs.subarray(start[0], v),
      points: page.points.subarray(start[1], p),
      weights: page.weights.subarray(start[2], w),
    };
  }
  if (p !== page.points.length || w !== page.weights.length) throw Error("source-arity");
}
const channel = new MessageChannel();
let continuation: (() => void) | undefined;
channel.port1.onmessage = () => {
  const next = continuation;
  continuation = undefined;
  next?.();
};
export function yieldTurn() {
  return new Promise<void>((resolve) => {
    if (continuation) throw Error("concurrent-yield");
    continuation = resolve;
    channel.port2.postMessage(0);
  });
}
