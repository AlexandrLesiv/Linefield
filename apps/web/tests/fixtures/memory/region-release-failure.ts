import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import {
  gpuAdmission,
  retiringCpuResources,
  retiringGpuBytes,
} from "../../../src/memory/gpu-retirement.ts";
export async function regionReleaseFailure(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    f = await regionFixture(canvas),
    gl = f.renderer.gl;
  const draw = gl.drawArrays.bind(gl),
    fence = gl.fenceSync.bind(gl),
    release = frames.release;
  const source = f.base.receipt?.id;
  let copied = false,
    failedSubmit = false,
    releases = 0,
    drained = false;
  gl.drawArrays = (...args) => {
    draw(...args);
    if (args[2] === 3) copied = true;
  };
  gl.fenceSync = (...args) => {
    if (copied && !failedSubmit) {
      failedSubmit = true;
      return null;
    }
    return fence(...args);
  };
  frames.release = (state, id) => {
    if (id === source) {
      releases++;
      throw Error("injected-source-release-failure");
    }
    return release(state, id);
  };
  try {
    f.pan(24, 16);
    f.start();
    let rejected = false;
    try {
      await f.idle();
    } catch {
      rejected = true;
    }
    check(
      copied && failedSubmit && rejected,
      "actual copy and fence failure transfer source reader",
    );
    await f.candidate.dispose();
    f.cache.dispose();
    f.base.dispose();
    f.renderer.dispose({
      resources: () => f.leases.combine(f.cache.resources()),
      cleanup: async () => {
        await f.leases.drain();
        drained = true;
      },
    });
    const deadline = performance.now() + 3000;
    for (;;) {
      if (releases) break;
      if (performance.now() > deadline) throw Error("source release failure not reached");
      await new Promise<void>((resolve) => setTimeout(resolve, 4));
    }
    let denied = false;
    try {
      gpuAdmission();
    } catch {
      denied = true;
    }
    const resources = retiringCpuResources();
    check(
      denied && !drained && resources.receiptLeases === 1 && resources.uncertainReceiptLeases === 1,
      "failed reader release remains charged and blocks replacement",
    );
    check(
      retiringGpuBytes() > 0 && releases === 1,
      "failed retirement never claims zero GPU ownership or retries release",
    );
    return {
      ...report(),
      releases,
      resources,
      limit: "terminal isolated retirement retained until browser page closes",
    };
  } finally {
    gl.drawArrays = draw;
    gl.fenceSync = fence;
    frames.release = release;
  }
}
