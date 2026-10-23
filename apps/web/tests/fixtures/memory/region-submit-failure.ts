import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
export async function regionSubmitFailure(canvas: HTMLCanvasElement, contextLoss = false) {
  const { check, report } = assertions(),
    f = await regionFixture(canvas),
    gl = f.renderer.gl;
  const draw = gl.drawArrays.bind(gl),
    fence = gl.fenceSync.bind(gl),
    wait = gl.clientWaitSync.bind(gl);
  let copied = false,
    failed = false,
    hold = true,
    closed = false;
  gl.drawArrays = (...args) => {
    draw(...args);
    if (args[2] === 3) copied = true;
  };
  gl.fenceSync = (...args) => {
    if (copied && !failed) {
      failed = true;
      return null;
    }
    return fence(...args);
  };
  gl.clientWaitSync = (...args) => {
    const value = wait(...args);
    return hold ? gl.TIMEOUT_EXPIRED : value;
  };
  try {
    const source = f.base.receipt?.id;
    check(!!source, "actual B receipt exists");
    f.pan(24, 16);
    f.start();
    let rejected = false;
    try {
      await f.idle();
    } catch {
      rejected = true;
    }
    check(
      copied && failed && rejected && !f.candidate.ready,
      "real copy submission failure never publishes",
    );
    const closing = f.close().then(() => {
      closed = true;
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    check(
      !closed && f.leases.resources().receiptLeases === 1,
      "only explicitly transferred source reader remains charged during GPU retirement",
    );
    check(
      frames.transform(f.state(), source!).code === "ok",
      "source receipt retained until GPU read completion",
    );
    if (contextLoss) {
      const extension = gl.getExtension("WEBGL_lose_context");
      check(!!extension, "context loss capability exists");
      extension!.loseContext();
    } else hold = false;
    await closing;
    if (contextLoss)
      check(
        gl.isContextLost(),
        "actual context loss releases transferred GPU reader without fence completion",
      );
    check(
      f.leases.resources().receiptLeases === 0,
      "confirmed retirement reconciles transferred reader",
    );
    return { ...report(), copied, failed, contextLoss };
  } finally {
    hold = false;
    gl.drawArrays = draw;
    gl.fenceSync = fence;
    gl.clientWaitSync = wait;
    if (!closed) await f.close();
  }
}
