import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { closeTailFixture } from "./tail-fixture.ts";
export function retentionSource(count = 129, second = 0) {
  let state = visibilityStroke(visibilityState(), count);
  if (second) state = visibilityStroke(state, second, 500);
  const ids = scene.ids(state, 0n).ids;
  const source = ids[0],
    other = ids[1];
  const receipt = frames.capture(state);
  if (!source || receipt.code !== "ok") throw Error("retention canonical source");
  const cache = new PreparedCache(() => state);
  const read = async (id: bigint, samples: number, chunk = 0) => {
    let bytes = 0,
      pages = 0,
      first = 0n;
    for await (const page of cache.reader(id, BigInt(samples), 1, receipt.id, BigInt(chunk))) {
      const borrowed = cache.borrow(page);
      try {
        const placed = frames.placement(state, receipt.id, id, page.page);
        if (placed.code !== "ok" || !placed.available) throw Error("actual retained placement");
        first ||= page.page;
        bytes += page.data.byteLength;
        pages++;
      } finally {
        borrowed.release();
      }
    }
    return { first, bytes, pages };
  };
  return {
    state,
    source,
    other,
    receipt,
    cache,
    read,
    close: () => {
      cache.dispose();
      frames.release(state, receipt.id);
      closeTailFixture(state);
    },
  };
}
