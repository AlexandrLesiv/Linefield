import { cancelledPublication } from "./performance-observation.ts";
import { frames } from "./frame-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
export type Receipt = { id: bigint; through: bigint; key: string };
export class FramePromotion {
  private current: Receipt | undefined;
  private submitted = false;
  private state: () => ReplyValue;
  private renderer: GpuRenderer;
  private published: (next: Receipt) => void;
  private failed: (error: unknown) => void;
  constructor(
    state: () => ReplyValue,
    renderer: GpuRenderer,
    published: (next: Receipt) => void,
    failed: (error: unknown) => void,
  ) {
    this.state = state;
    this.renderer = renderer;
    this.published = published;
    this.failed = failed;
  }
  get busy() {
    return !!this.current;
  }
  stage(next: Receipt, draw: () => void) {
    if (this.current) {
      frames.release(this.state(), next.id);
      throw Error("gpu-queue");
    }
    this.current = next;
    this.submitted = false;
    try {
      draw();
    } catch (error) {
      this.cancel();
      throw error;
    }
  }
  submit(serial: number) {
    const next = this.current;
    if (!next || this.submitted) return;
    this.submitted = true;
    void this.finish(next, serial).catch((error) => this.failed(error));
  }
  private async finish(next: Receipt, serial: number) {
    let transferred = false;
    try {
      await this.renderer.validated(serial);
      if (this.current !== next || frames.transform(this.state(), next.id).code !== "ok") return;
      this.renderer.promote();
      this.published(next);
      transferred = true;
    } finally {
      if (!transferred) frames.release(this.state(), next.id);
      if (this.current === next) {
        this.current = undefined;
        this.submitted = false;
      }
    }
  }
  cancel() {
    if (this.current) {
      cancelledPublication(this.current.id);
      frames.release(this.state(), this.current.id);
    }
    this.current = undefined;
    this.submitted = false;
  }
}
