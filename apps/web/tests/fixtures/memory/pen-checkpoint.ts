import { verifyDot, verifyTaper } from "./pen-sanity.ts";
import type { CanvasKit } from "canvaskit-wasm";
import { bridge } from "../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { appendPathPage } from "../../../src/memory/path-page.ts";
import { Presentation, publishFrame } from "../../../src/memory/presentation.ts";
import { environment } from "./environment.ts";
const yieldTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function accepted(value: ReplyValue): ReplyValue {
  if (value.code !== "ok" && value.code !== "noop") throw Error(`checkpoint-${value.code}`);
  return value;
}
function batch(first: number, count: number) {
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  for (let index = 0; index < count; index++) {
    const t = (first + index) / 128;
    x[index] = 512 + 440 * Math.cos(t);
    y[index] = 384 + 300 * Math.sin(t * 3);
  }
  return { x, y, pressure: new Float64Array(count), hasPressure: new Uint8Array(count) };
}
export async function penCheckpoint(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const results = [];
  for (const [width, height] of [
    [1024, 768],
    [4096, 2048],
  ] as const) {
    let state = accepted(bridge.create());
    state = accepted(bridge.enter(state.owner));
    state = accepted(bridge.metrics(state, 1n, width, height, 1));
    const publishTimes: number[] = [];
    const display = new Presentation(kit, canvas, width, height, undefined, (k, s, image) => {
      const start = performance.now();
      publishFrame(k, s, image);
      publishTimes.push(performance.now() - start);
    });
    const host = environment(canvas);
    display.render();
    state = accepted(bridge.presented(state));
    const first = batch(0, 1);
    state = accepted(penBridge.begin(state, 1, first.x[0]!, first.y[0]!, 0, false));
    const dotSanity = verifyDot(kit, display, state);
    const taper = verifyTaper(kit, display, state);
    state = accepted(penBridge.begin(taper.state, 1, first.x[0]!, first.y[0]!, 0, false));
    const inputs: { first: number; count: number; ms: number }[] = [];
    for (let index = 1; index < 65_537; index += 256) {
      const values = batch(index, 256);
      const start = performance.now();
      state = accepted(penBridge.append(state, BigInt(index), values));
      inputs.push({ first: index, count: 256, ms: performance.now() - start });
      await yieldTurn();
    }
    const ids = bridge.scene(state).ids;
    const stroke = ids[0];
    if (stroke === undefined) throw Error("missing-real-stroke");
    const builder = new kit.PathBuilder();
    display.owner.resources.add("builder");
    const paint = new kit.Paint();
    display.owner.resources.add("paint");
    paint.setAntiAlias(true);
    paint.setStyle(kit.PaintStyle.Fill);
    paint.setColor(kit.BLACK);
    const pages: {
      offset: string;
      verbs: number;
      queryMs: number;
      builderMs: number;
      taskMs: number;
    }[] = [];
    let offset = 0n;
    let acceptedCount = 65_537;
    try {
      for (const mode of ["cold", "warm", "continued"] as const) {
        if (mode === "continued") {
          const values = batch(acceptedCount, 256);
          const start = performance.now();
          state = accepted(penBridge.append(state, BigInt(acceptedCount), values));
          inputs.push({ first: acceptedCount, count: 256, ms: performance.now() - start });
          acceptedCount += 256;
        }
        const status = penBridge.stroke(state, stroke);
        accepted(status);
        while (offset < status.verbs) {
          const start = performance.now();
          const page = penBridge.page(state, stroke, status.geometry, offset);
          const queryMs = performance.now() - start;
          const build = performance.now();
          appendPathPage(kit, builder, page);
          const builderMs = performance.now() - build;
          pages.push({
            offset: String(offset),
            verbs: page.verbs.length,
            queryMs,
            builderMs,
            taskMs: performance.now() - start,
          });
          offset += BigInt(page.verbs.length);
          if (!page.done && page.next !== offset) throw Error("noncontiguous-prefix");
          if (page.done && offset !== status.verbs) throw Error("unexpected-culling");
          await yieldTurn();
        }
        const snapshotStart = performance.now();
        const path = builder.snapshot();
        const snapshotMs = performance.now() - snapshotStart;
        display.owner.resources.add("path");
        let drawMs = 0;
        const start = performance.now();
        try {
          display.render((target) => {
            const drawStart = performance.now();
            target.drawPath(path, paint);
            drawMs = performance.now() - drawStart;
          });
          results.push({
            width,
            height,
            mode,
            acceptedCount,
            scene: String(state.scene),
            mapping: String(state.mapping),
            content: String(state.content),
            geometry: String(status.geometry),
            verbs: String(offset),
            snapshotMs,
            drawMs,
            publicationMs: performance.now() - start,
            publishMs: publishTimes.at(-1),
            resources: display.stats(),
          });
        } finally {
          display.owner.resources.release("path", path);
        }
        await yieldTurn();
      }
      state = accepted(penBridge.end(state, BigInt(acceptedCount)));
      results.push({
        width,
        height,
        host,
        dotSanity,
        taperSanity: taper.verification,
        inputs,
        pages,
        completed: bridge.read(state.owner),
      });
    } finally {
      display.owner.resources.release("paint", paint);
      display.owner.resources.release("builder", builder);
      display.dispose();
      bridge.dispose(state.owner);
    }
  }
  const maximumDrawMs = Math.max(...results.map((row) => ("drawMs" in row ? row.drawMs : 0)));
  return {
    kind: "isolated-real-rust-geometry-early-checkpoint",
    performanceVerdict: maximumDrawMs >= 50 ? "failed" : "incomplete",
    failedGate: maximumDrawMs >= 50 ? "main-thread-task-under-50ms" : null,
    maximumDrawMs,
    trajectory:
      "x=512+440*cos(i/128), y=384+300*sin(3*i/128); width8 constant mouse pressure; repeated smooth overlapping loops",
    results,
  };
}
