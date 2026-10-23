import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { editorHealthy } from "../../../src/memory/editor-health.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { cleanupScene } from "../../../src/memory/scene-cleanup.ts";
import { gpuAdmission, retiringCpuResources } from "../../../src/memory/gpu-retirement.ts";
export async function seedPublication(
  canvas: HTMLCanvasElement,
  mode: "promote" | "fold" | "create" | "create-release",
) {
  const { check, report } = assertions(),
    f = await seedFixture(canvas),
    release = frames.release,
    create = f.leases.create.bind(f.leases),
    completed = metrics.completeFrames;
  let incoming = 0n,
    oldReleases = 0,
    incomingReleases = 0,
    creations = 0,
    rejected = false;
  f.append();
  if (mode !== "fold") {
    f.candidate.start(1);
    await f.idle();
    check(f.candidate.ready, "real complete replacement candidate validated before handoff");
  } else f.candidate.sealed = true; // Force ordinary fold without an optional seed borrow.
  f.leases.create = (receipt, state) => {
    incoming = receipt.id;
    creations++;
    if (mode === "create" || mode === "create-release") throw Error("injected-owner-creation");
    return create(receipt, state);
  };
  frames.release = (state, id) => {
    if (id === f.prefix.id) oldReleases++;
    if (id === incoming) incomingReleases++;
    if (
      (id === f.prefix.id && (mode === "promote" || mode === "fold")) ||
      (id === incoming && mode === "create-release")
    )
      document.documentElement.dataset.trapStage = "release-frame";
    return release(state, id);
  };
  try {
    try {
      if (mode === "fold") await f.seed();
      else {
        const next = f.candidate.take();
        if (!next) throw Error("missing replacement");
        f.renderer.promote();
        f.base.publish(next, f.renderer, true);
      }
    } catch {
      rejected = true;
    }
    check(
      rejected && creations === 1 && incoming !== 0n,
      "incoming handoff fault positively reached",
    );
    check(
      !f.base.prefix && !f.base.acknowledgement && metrics.completeFrames === completed,
      "failed handoff cannot publish or acknowledge current content",
    );
    check(!f.candidate.receipt, "incoming ownership has left candidate");
    const charged = f.leases.resources();
    if (mode === "create") {
      check(
        incomingReleases === 1 && oldReleases === 0,
        "creation failure safely releases incoming only",
      );
      check(
        charged.receiptLeases === 1 && charged.uncertainReceiptLeases === 0,
        "old owner retained",
      );
      check(
        frames.transform(f.state(), incoming).code === "stale-scene",
        "incoming release acknowledged",
      );
      await f.close();
      return { ...report(), mode, charged };
    }
    check(!editorHealthy(), "actual generated frame release poisoned the boundary");
    check(
      charged.receiptLeases === 2 && charged.uncertainReceiptLeases === 1,
      "both owners remain charged",
    );
    check(
      mode === "create-release"
        ? incomingReleases === 1 && oldReleases === 0
        : incomingReleases === 0 && oldReleases === 1,
      "no speculative incoming release after failed old acknowledgement",
    );
    for (let i = 0; i < 2; i++) {
      try {
        f.base.dispose();
      } catch {
        // Repeated failed-owner disposal retains the first structural failure.
      }
    }
    check(oldReleases === 1, "old release is never retried");
    check(
      incomingReleases === (mode === "create-release" ? 1 : 0),
      "incoming release is never retried",
    );
    f.renderer.dispose({
      resources: () => f.leases.combine(f.cache.resources()),
      cleanup: () =>
        cleanupScene([
          () => f.candidate.dispose(),
          () => f.cache.dispose(),
          () => f.base.dispose(),
          () => f.leases.drained(),
        ]),
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    let denied = false;
    try {
      gpuAdmission();
    } catch {
      denied = true;
    }
    check(
      denied && retiringCpuResources().receiptLeases === 2,
      "unresolved handoff blocks replacement",
    );
    check(
      document.documentElement.dataset.afterTrap === "0",
      "no canonical export after fatal release",
    );
    check(oldReleases === 1, "retirement does not retry old release");
    return {
      ...report(),
      mode,
      charged,
      limit: "terminal isolated owner retained until page close",
    };
  } finally {
    frames.release = release;
    f.leases.create = create;
  }
}
