import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { gpuAdmission, retiringCpuResources } from "../../../src/memory/gpu-retirement.ts";
export async function seedRelease(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    f = await seedFixture(canvas),
    release = frames.release;
  let injected = 0;
  // Canonical cleanup uncertainty is terminal for this isolated fixture owner.
  frames.release = (state, id) => {
    if (id === f.prefix.id) {
      injected++;
      throw Error("injected-receipt-release");
    }
    return release(state, id);
  };
  try {
    f.append();
    await f.seed();
    for (let i = 0; f.candidate.busy && i < 1000; i++)
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    check(!f.candidate.busy && injected === 1, "actual completed seed source release failed once");
    check(
      f.leases.resources().uncertainReceiptLeases === 1,
      "unacknowledged receipt remains separately charged",
    );
    const cleanup = async () => {
      try {
        await f.candidate.dispose();
      } finally {
        f.cache.dispose();
        f.base.dispose();
      }
    };
    f.renderer.dispose({ resources: () => f.leases.combine(f.cache.resources()), cleanup });
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
    let rejected = false;
    try {
      gpuAdmission();
    } catch {
      rejected = true;
    }
    check(
      rejected && retiringCpuResources().uncertainReceiptLeases === 1,
      "failed cleanup blocks replacement while retaining uncertainty",
    );
    check(injected === 1, "cleanup does not retry failed receipt release");
    return {
      ...report(),
      injected,
      limit: "terminal isolated owner retained until page close; no poisoned cleanup retry",
    };
  } finally {
    frames.release = release;
  }
}
