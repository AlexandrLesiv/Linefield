import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { bridge } from "../../../../src/memory/bridge.ts";
import { accepted } from "../undo-input.ts";
import { hostUnit, stage } from "./telemetry.ts";
import { comparePixels } from "../cpu-raster/raster.ts";
import type { Frame, Result } from "./protocol.ts";
export class Publication {
  private previous: ImageData | undefined;
  reject(frame: Frame, result: Result, validate: () => boolean, receiptFault: boolean) {
    if (!result.bitmap || !result.pixels || result.status !== "completed")
      throw Error("rejection-fixture");
    const canvas = document.getElementById("candidate");
    if (!(canvas instanceof HTMLCanvasElement)) throw Error("rejection-canvas");
    const context = canvas.getContext("2d")!;
    const before = context.getImageData(0, 0, canvas.width, canvas.height);
    let rejected = false;
    try {
      this.submit(
        result.bitmap,
        result.pixels,
        frame.state,
        frame.width,
        frame.height,
        false,
        validate,
        receiptFault,
      );
    } catch (error) {
      rejected =
        error instanceof Error &&
        error.message ===
          (receiptFault ? "injected-receipt-failure" : "stale-publication-rejected");
    }
    const after = context.getImageData(0, 0, canvas.width, canvas.height);
    if (
      !rejected ||
      comparePixels(new Uint8Array(before.data.buffer), new Uint8Array(after.data.buffer))
        .differentChannels
    )
      throw Error("rejected-publication-changed-display");
  }
  submit(
    bitmap: ImageBitmap,
    pixels: Uint8Array,
    state: ReplyValue,
    width: number,
    height: number,
    guarded: boolean,
    validate: () => boolean,
    receiptFault = false,
  ) {
    const canvas = document.getElementById("candidate");
    if (!(canvas instanceof HTMLCanvasElement)) {
      bitmap.close();
      throw Error("candidate-canvas");
    }
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      throw Error("candidate-context");
    }
    let acknowledged = false;
    let submitMs = 0,
      acknowledgementMs = 0,
      acknowledgedAt = 0;
    try {
      if (!validate()) throw Error("stale-publication-rejected");
      const start = performance.now();
      hostUnit(
        "publication",
        () => {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(bitmap, 0, 0);
        },
        guarded,
      );
      submitMs = performance.now() - start;
      if (guarded && submitMs > 8) throw Error("operation-guard:publication");
      if (receiptFault) throw Error("injected-receipt-failure");
      const ack = performance.now();
      hostUnit("acknowledgement", () => accepted(bridge.presented(state)));
      acknowledged = true;
      acknowledgedAt = performance.now();
      acknowledgementMs = acknowledgedAt - ack;
      if (guarded && acknowledgementMs > 8) throw Error("operation-guard:acknowledgement");
      // Validation readback is outside submission/ack timing; never overwrite with expected pixels.
      stage("diagnostic-submitted-readback");
      const actual = context.getImageData(0, 0, width, height);
      const parity = comparePixels(pixels, new Uint8Array(actual.data.buffer));
      if (parity.differentChannels) throw Error("bitmap-parity");
      this.previous = actual;
      return {
        submitMs,
        acknowledgementMs,
        acknowledgedAt,
        parity,
        retainedDiagnosticBytes: actual.data.byteLength,
      };
    } catch (error) {
      // Post-ack diagnostics/guards reject the checkpoint without undoing the receipt.
      if (acknowledged) throw error;
      if (this.previous) {
        canvas.width = this.previous.width;
        canvas.height = this.previous.height;
        context.putImageData(this.previous, 0, 0);
      } else context.clearRect(0, 0, canvas.width, canvas.height);
      throw error;
    } finally {
      bitmap.close();
    }
  }
}
