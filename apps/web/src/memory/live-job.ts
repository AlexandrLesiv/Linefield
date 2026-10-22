import type { prepareBegin } from "#preparation-bindings";
import { live } from "./live-bridge.ts";
import { tail } from "./tail-bridge.ts";
import { preparation } from "./preparation-bridge.ts";
import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuPass } from "./gpu-pass.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Input = { token: bigint; through: bigint; points: Float64Array; parameters: Float64Array };
export class LiveJob {
  readonly through: bigint;
  private ordinal = 0n;
  private token: bigint;
  private source: ReturnType<typeof prepareBegin>;
  constructor(
    input: Input,
    prepare: typeof prepareBegin,
    privateState: () => ReplyValue,
    frame: bigint,
    stroke: bigint,
    tailId?: bigint,
  ) {
    this.through = input.through;
    this.token = input.token;
    this.state = privateState;
    this.frame = frame;
    this.stroke = stroke;
    this.tailId = tailId;
    this.source = prepare(input.points, input.parameters);
  }
  private state: () => ReplyValue;
  private frame: bigint;
  private stroke: bigint;
  private tailId: bigint | undefined;
  step(pass: GpuPass, color: readonly number[]) {
    const start = performance.now(),
      result = this.source.nextPage();
    try {
      const data = result.data;
      if (data.length) {
        const adopted =
          this.tailId === undefined
            ? preparation.adopt(this.state(), this.token, this.ordinal++, data, result.origin)
            : tail.adopt(
                this.state(),
                this.tailId,
                this.token,
                this.ordinal++,
                data,
                result.origin,
              );
        if (adopted.code !== "ok") throw Error(adopted.code);
        try {
          const p =
            this.tailId === undefined
              ? live.placement(this.state(), this.frame, this.stroke, adopted.page)
              : tail.placement(this.state(), this.tailId, adopted.page);
          if (p.code !== "ok") throw Error(p.code);
          if (p.available) pass.draw(data, p.matrix, color);
        } finally {
          scene.release(this.state(), adopted.page);
        }
      }
      if (result.done) {
        const code =
          this.tailId === undefined
            ? preparation.complete(this.state(), this.token, this.ordinal)
            : tail.complete(this.state(), this.tailId, this.token, this.ordinal);
        if (code !== "ok") throw Error(code);
      }
      return result.done;
    } finally {
      result.free();
      metrics.frameMilliseconds += performance.now() - start;
      metrics.fallbackPages++;
    }
  }
  dispose() {
    this.source.free();
    preparation.release(this.state(), this.token);
  }
}
