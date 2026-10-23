import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { captureLive } from "../../../src/memory/current-coverage.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { tail } from "../../../src/memory/tail-bridge.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import { queryReady } from "./query-readiness.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
export function tailFixture(count = 129) {
  let state = bridge.create();
  state = queryReady(bridge.metrics(bridge.enter(state.owner), 1n, 1024, 768, 1));
  state = edit.begin(state, 1, 300, 300, 0.5, true);
  if (count > 1) state = appendTailPoints(state, 1, count - 1);
  const stroke = scene.ids(state, 0n).ids[0];
  if (state.code !== "ok" || stroke === undefined) throw Error("setup");
  const frame = captureLive(state, stroke);
  if (frame.code !== "ok") throw Error("live anchor");
  return { state, frame: frame.id, stroke };
}
export function appendTailPoints(s: ReplyValue, from: number, count: number) {
  return edit.append(
    s,
    BigInt(from),
    Float64Array.from({ length: count }, (_, i) => 300 + from + i),
    Float64Array.from({ length: count }, (_, i) => 300 + Math.sin((from + i) / 9) * 90),
    Float64Array.from({ length: count }, (_, i) => 0.1 + ((from + i) % 11) / 12),
    new Uint8Array(count).fill(1),
  );
}
export function assertions() {
  let checks = 0;
  return {
    check(value: boolean, label: string) {
      if (!value) throw Error(label);
      checks++;
    },
    report: () => ({ checks, evidence: "typed browser boundary fixture; not actual-route E2E" }),
  };
}
export async function completeTailRange(
  s: ReplyValue,
  id: bigint,
  input: ReturnType<typeof tail.prepare>,
  check: (v: boolean, label: string) => void,
) {
  check(input.code === "ok", "range input");
  if (!input.token) return;
  const prepare = await loadPreparation();
  const job = prepare(input.points, input.parameters);
  let ordinal = 0n,
    done = false;
  try {
    for (let step = 0; step < 1024 && !done; step++) {
      const result = job.nextPage();
      try {
        const data = result.data,
          origin = result.origin;
        if (data.length) {
          check(
            preparation.adopt(s, input.token, ordinal, data, origin).code !== "ok",
            "strict adoption rejects display proof",
          );
          const page = tail.adopt(s, id, input.token, ordinal++, data, origin);
          check(
            page.code === "ok",
            `display adoption: ${page.code}, tail ${id}, through ${input.through}, ordinal ${ordinal - 1n}`,
          );
          check(tail.placement(s, id, page.page).code === "ok", "display placement");
          const status = tail.status(s, id);
          if (ordinal === 1n && status.from === 0n && status.count === 129n && status.exact) {
            const canonical = scene.page(s, status.stroke, 129n, 0n, 1, 0n);
            check(
              canonical.code === "ok" && canonical.page !== page.page,
              "canonical key cannot reuse display page",
            );
            check(
              scene.placement(s, status.stroke, canonical.page).code === "ok",
              "canonical page remains independently valid",
            );
            scene.release(s, canonical.page);
          }
          check(
            scene.placement(s, scene.ids(s, 0n).ids[0] ?? 0n, page.page).code !== "ok",
            "strict placement rejects",
          );
          scene.release(s, page.page);
        }
        done = result.done;
      } finally {
        result.free();
      }
    }
    check(done, "bounded fixture completion");
    check(tail.complete(s, id, input.token, ordinal) === "ok", "display completion");
  } finally {
    job.free();
    preparation.release(s, input.token);
  }
}
export function closeTailFixture(s: ReplyValue) {
  bridge.leave(s);
  bridge.dispose(s.owner);
}
