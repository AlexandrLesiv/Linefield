import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { queryReady } from "./query-readiness.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { visibilityDrain } from "./visibility-fixture.ts";

export function visibilityNumerics() {
  const { check, report } = assertions();
  const seed: unknown = Reflect.get(api, "fixtureFarView");
  if (typeof seed !== "function") throw Error("far-view fixture missing");
  let cases = 0;
  for (const region of [0n, 9223372036854775800n, -9223372036854775800n])
    for (const local of [0.125, 65535.875])
      for (const angle of [-Math.PI, -Math.PI / 2 - 1e-10, Math.PI / 2 + 1e-10]) {
        const result: unknown = seed(region, local);
        if (!(result instanceof api.Reply)) throw Error("far-view fixture result");
        check(take(() => result, copyReply).code === "ok", "regional seed accepted");
        let s = bridge.create();
        s = queryReady(bridge.metrics(bridge.enter(s.owner), 1n, 1024, 768, 1));
        s = edit.style(s, 512, [0, 0, 0]);
        s = edit.view(s, 0.05, 512, 384, false);
        s = edit.view(s, angle, 512, 384, true);
        // Boundary replay crosses both view edges with varying pressure at extreme regions.
        s = edit.begin(s, 1, -16, 0, 0.1, true);
        s = edit.append(
          s,
          1n,
          new Float64Array([512, 1040]),
          new Float64Array([768, 0]),
          new Float64Array([1, 0.37]),
          new Uint8Array([1, 1]),
        );
        s = edit.end(s, 3n);
        check(s.code === "ok", "regional thick crossing accepted");
        const id = scene.ids(s, 0n).ids[0];
        if (id === undefined) throw Error("missing source");
        const frame = frames.capture(s);
        const cold = visibilityDrain(s, frame.id);
        const warm = visibilityDrain(s, frame.id);
        check(
          cold.values.length === 1 && warm.values.join() === cold.values.join(),
          "cold and warm index retain crossing chunk",
        );
        const canonical = frames.preparation(s, id, 0n, 3n, 1, frame.id);
        check(
          canonical.code === "ok" && canonical.token !== 0n,
          "canonical preparation independently sees crossing",
        );
        preparation.release(s, canonical.token);
        frames.release(s, frame.id);
        closeTailFixture(s);
        cases++;
      }
  return { ...report(), cases };
}
