import type { ReplyValue } from "../bridge.ts";
import type { Frame } from "./wire.ts";
type Source = { frame: Frame; state: ReplyValue; interaction: bigint };
export class BitmapView {
  private base: Source | undefined;
  private active: Source | undefined;
  private context: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
    if (!context) throw Error("bitmap-context");
    this.context = context;
    context.imageSmoothingEnabled = false;
  }
  private draw(source: Source, m = [1, 0, 0, 1, 0, 0], outside = false) {
    const canvas = this.context;
    canvas.resetTransform();
    canvas.fillStyle = "white";
    canvas.fillRect(0, 0, this.width, this.height);
    if (outside) return;
    canvas.setTransform(m[0]!, m[2]!, m[1]!, m[3]!, m[4]!, m[5]!);
    canvas.drawImage(
      source.frame.bitmap,
      -(source.frame.width - this.width) / 2,
      -(source.frame.height - this.height) / 2,
    );
  }
  get source() {
    return this.active ?? this.base;
  }
  baseMatches(state: ReplyValue) {
    return this.base?.state.content === state.content && this.base.state.mapping === state.mapping;
  }
  publish(frame: Frame, state: ReplyValue, active: boolean, matrix?: number[]) {
    const source = { frame, state, interaction: active ? state.interaction : 0n };
    try {
      if (active && !this.baseMatches(state)) throw Error("missing-completed-base");
      this.draw(source, matrix);
    } catch (error: unknown) {
      frame.bitmap.close();
      throw error;
    }
    if (active) {
      this.active?.frame.bitmap.close();
      this.active = source;
    } else {
      this.active?.frame.bitmap.close();
      this.active = undefined;
      this.base?.frame.bitmap.close();
      this.base = source;
    }
  }
  transform(mapping: bigint, matrix: number[], outside: boolean) {
    const source = this.source;
    if (source?.state.mapping === mapping) this.draw(source, matrix, outside);
  }
  cancel(interaction: bigint) {
    if (this.active?.interaction !== interaction || !this.base) return;
    this.draw(this.base);
    this.active.frame.bitmap.close();
    this.active = undefined;
  }
  adopt(
    frame: Frame,
    state: ReplyValue,
    matrix: number[],
    oldMatrix: number[],
    outside: boolean,
    oldOutside: boolean,
    apply: () => boolean,
  ) {
    const previous = this.source;
    if (!previous) return false;
    const candidate = { frame, state, interaction: 0n };
    try {
      this.draw(candidate, matrix, outside);
      if (!apply()) {
        this.draw(previous, oldMatrix, oldOutside);
        return false;
      }
    } catch (error: unknown) {
      this.draw(previous, oldMatrix, oldOutside);
      throw error;
    }
    this.active?.frame.bitmap.close();
    this.active = undefined;
    this.base?.frame.bitmap.close();
    this.base = candidate;
    return true;
  }
  dispose() {
    this.active?.frame.bitmap.close();
    this.base?.frame.bitmap.close();
    this.active = this.base = undefined;
  }
}
