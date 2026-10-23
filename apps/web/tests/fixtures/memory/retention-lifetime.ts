import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import {
  gpuAdmission,
  retiringCpuResources,
  retiringGpuBytes,
  watchGpuAdmission,
} from "../../../src/memory/gpu-retirement.ts";
import { retentionSource } from "./retention-source.ts";
import { assertions } from "./tail-fixture.ts";
export async function retentionLifetime(canvas: HTMLCanvasElement, reject: boolean, lost: boolean) {
  const { check, report } = assertions();
  const f = retentionSource();
  const { cache } = f;
  const token = cache.begin();
  await f.read(f.source, 129);
  cache.end(token, false);
  const heldBytes = cache.resources().bytes;
  check(heldBytes > 0, "actual worker geometry retained before replacement");
  const renderer = new GpuRenderer(canvas, 100, 100);
  let release = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let oldWake = 0,
    newWake = 0,
    stopped = false;
  const oldUnwatch = watchGpuAdmission(() => {
    if (!stopped) oldWake++;
  });
  renderer.dispose({
    resources: () => cache.resources(),
    cleanup: async () => {
      await hold;
      if (reject) throw Error("held CPU cleanup rejected");
      cache.dispose();
    },
  });
  stopped = true;
  const unwatch = watchGpuAdmission(() => {
    newWake++;
  });
  oldUnwatch();
  const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  try {
    if (lost) {
      const extension = renderer.gl.getExtension("WEBGL_lose_context");
      if (!extension) throw Error("fixture context loss unavailable");
      canvas.addEventListener("webglcontextlost", (event) => event.preventDefault(), {
        once: true,
      });
      extension.loseContext();
    }
    for (let i = 0; i < 200 && retiringGpuBytes(); i++) await turn();
    check(retiringGpuBytes() === 0, "GPU positively drained before CPU completion");
    check(!gpuAdmission(), "CPU hold independently blocks new generation");
    check(retiringCpuResources().bytes === heldBytes, "old CPU arrays remain charged");
    let denied = false;
    try {
      const unexpected = new GpuRenderer(canvas, 100, 100);
      unexpected.dispose();
    } catch {
      denied = true;
    }
    check(denied, "second renderer cannot allocate during CPU-only retirement");
    release();
    for (let i = 0; i < 100; i++) {
      if (newWake) break;
      await turn();
    }
    check(
      newWake === 1 && oldWake === 0,
      "current attachment wakes once; stopped attachment untouched",
    );
    if (reject) {
      let failed = false;
      try {
        gpuAdmission();
      } catch {
        failed = true;
      }
      check(
        failed && retiringCpuResources().bytes === heldBytes,
        "cleanup rejection stays failed and charged",
      );
    } else
      check(
        gpuAdmission() && retiringCpuResources().bytes === 0,
        "positive CPU drain reopens admission",
      );
    return {
      ...report(),
      reject,
      lost,
      newWake,
      scope: "held host cleanup and actual GPU retirement; no natural timing claim",
    };
  } finally {
    unwatch();
    release();
    cache.dispose();
    f.close();
  }
}
