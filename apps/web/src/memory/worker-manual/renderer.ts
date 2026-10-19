import type { ReplyValue } from "../bridge.ts";
import { panPreview } from "../pan-preview.ts";
import { targetBridge } from "../render-target-bridge.ts";
import { WorkerClient } from "./client.ts";
import { BitmapView } from "./compositor.ts";
import { transferGeometry, Superseded } from "./geometry.ts";
export class WorkerRenderer {
  private worker: WorkerClient;
  private display: BitmapView;
  private ready: Promise<unknown>;
  private job = 1;
  private stopped = false;
  private shown = -1n;
  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    backing: number,
    failure: () => void,
  ) {
    this.display = new BitmapView(canvas, width, height);
    this.worker = new WorkerClient(failure);
    this.ready = this.worker.request({ kind: "init", id: 1, width, height, backing });
  }
  changed(previous: ReplyValue, next: ReplyValue) {
    if (next.activeCancelled) this.display.cancel(previous.interaction);
    const preview = panPreview(next);
    if (preview.code === "ok")
      this.display.transform(
        preview.sourceMapping,
        [preview.m11, preview.m12, preview.m21, preview.m22, preview.offsetX, preview.offsetY],
        preview.outside,
      );
  }
  async render(read: () => ReplyValue, alive: () => boolean, publish: (s: ReplyValue) => boolean) {
    await this.ready;
    const initial = read();
    const valid = () =>
      !this.stopped &&
      alive() &&
      read().owner === initial.owner &&
      read().session === initial.session &&
      read().content === initial.content;
    if (!valid()) return;
    if (panPreview(initial).code === "ok") {
      await this.navigation(initial, read, valid, publish);
      return;
    }
    const current = () => valid() && read().mapping === initial.mapping;
    try {
      if (!this.display.baseMatches(initial)) {
        const id = ++this.job;
        await transferGeometry(this.worker, id, initial, read, current, false);
        const frame = await this.worker.finish(id);
        if (!current()) {
          frame.bitmap.close();
          return;
        }
        this.display.publish(frame, initial, false);
        publish(initial);
      }
      const active = read();
      if (!current() || !active.interaction || this.shown === active.scene) return;
      const activeValid = () => current() && read().interaction === active.interaction;
      const id = ++this.job;
      await transferGeometry(this.worker, id, active, read, activeValid, true);
      const frame = await this.worker.finish(id);
      if (!activeValid()) {
        frame.bitmap.close();
        return;
      }
      this.display.publish(frame, active, true);
      this.shown = active.scene;
    } catch (error: unknown) {
      if (!(error instanceof Superseded)) throw error;
    }
  }
  private async navigation(
    initial: ReplyValue,
    read: () => ReplyValue,
    valid: () => boolean,
    publish: (s: ReplyValue) => boolean,
  ) {
    const target = targetBridge.capture(initial);
    if (target.code !== "ok") return;
    let bitmap: ImageBitmap | undefined;
    try {
      const id = ++this.job;
      await transferGeometry(this.worker, id, initial, read, valid, false, target.target);
      const frame = await this.worker.finish(id);
      bitmap = frame.bitmap;
      if (!valid()) return;
      const current = read();
      const plan = targetBridge.transform(current, target.target);
      const old = panPreview(current);
      if (plan.code !== "ok" || old.code !== "ok") return;
      if (!plan.canAdopt) {
        publish(initial);
        return;
      }
      const source = { ...initial, mapping: target.sourceMapping };
      if (
        this.display.adopt(
          frame,
          source,
          plan.affine,
          [old.m11, old.m12, old.m21, old.m22, old.offsetX, old.offsetY],
          plan.outside,
          old.outside,
          () => valid() && targetBridge.adopt(current, target.target).code === "ok",
        )
      ) {
        bitmap = undefined;
        publish(initial);
      }
    } catch (error: unknown) {
      if (!(error instanceof Superseded)) throw error;
    } finally {
      bitmap?.close();
      targetBridge.release(initial, target.target);
    }
  }
  dispose() {
    this.stopped = true;
    this.worker.dispose();
    this.display.dispose();
  }
}
