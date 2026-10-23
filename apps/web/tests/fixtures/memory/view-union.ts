import { seedFixture } from "./seed-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { consumeViewCandidate } from "../../../src/memory/view-candidate.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { currentCoverage } from "../../../src/memory/current-coverage.ts";
import { sceneGraph } from "../../../src/memory/display-graph.ts";
import { LiveOwner } from "../../../src/memory/live-owner.ts";
import { cleanupScene } from "../../../src/memory/scene-cleanup.ts";
import { editorHealthy } from "../../../src/memory/editor-health.ts";
import { gpuAdmission, retiringCpuResources } from "../../../src/memory/gpu-retirement.ts";
import { diagnosticsStore, observeReply } from "../../../src/developer-diagnostics/runtime-port.ts";
export async function viewUnion(
  canvas: HTMLCanvasElement,
  mode: "capacity" | "release" | "submit",
) {
  const { check, report } = assertions(),
    f = await seedFixture(canvas);
  const live = new LiveOwner(f.state),
    held: bigint[] = [];
  const release = frames.release,
    fence = f.renderer.gl.fenceSync.bind(f.renderer.gl);
  let rejected = false,
    injected = 0;
  f.candidate.start(1);
  await f.idle();
  check(f.candidate.ready, "real generated preparation and renderer complete candidate");
  f.update(edit.panBegin(f.state(), 7, 400, 400, false));
  f.update(edit.panUpdate(f.state(), 1n, 450, 420, false));
  observeReply("pan.update", f.state());
  check(diagnosticsStore.start(), "bounded diagnostic capture starts");
  const q = currentCoverage(f.state(), 0n, f.base.installed, f.candidate.receipt?.id);
  check(
    q.viewGestureActive && !q.candidateViewCurrent && q.candidateContentCurrent,
    "accepted pan changes view but retains exact complete source content",
  );
  const base = f.renderer.resources.base,
    candidate = f.candidate.receipt;
  const consume = () =>
    consumeViewCandidate(
      f.state(),
      f.renderer,
      f.base,
      f.candidate,
      live,
      () => sceneGraph(f.state(), f.base, f.candidate, live, q),
      q,
    );
  try {
    if (mode === "capacity") {
      for (let i = 0; i < 6; i++) {
        const receipt = frames.capture(f.state());
        check(receipt.code === "ok", "positive eight-slot occupancy");
        held.push(receipt.id);
      }
      await f.renderer.slot();
      check(!consume(), "anchor capacity defers before union issue");
      check(
        f.renderer.resources.base === base && f.candidate.receipt === candidate,
        "capacity preserves original GPU roles and candidate owner",
      );
      await f.renderer.validated(f.renderer.check());
      const freed = held.pop();
      if (freed === undefined) throw Error("held receipt");
      frames.release(f.state(), freed);
      await f.renderer.slot();
      check(consume(), "one freed slot admits complete visible union");
      await f.renderer.validated(f.renderer.check());
      check(
        !f.base.prefix && !f.base.acknowledgement && !f.candidate.receipt,
        "DisplayOnly union retires candidate without acknowledging gesture",
      );
      diagnosticsStore.stop("manual");
      const capture = diagnosticsStore.report;
      const events =
        capture?.records
          .map((record) => record.value)
          .filter((event) => event.atMs >= capture.startedMs) ?? [];
      const composed = events.filter((event) => event.event === "frame.composed");
      check(
        composed.length === 1 &&
          composed[0]?.owner === String(f.state().owner) &&
          composed[0]?.mapping === String(f.state().mapping) &&
          composed[0]?.operation === String(f.base.receipt?.id) &&
          composed[0]?.frame === String(candidate?.id),
        "provisional union IDs correlate exactly once",
      );
      check(
        !events.some((event) => event.event === "frame.published"),
        "union never reports complete publication",
      );
      for (const id of held.splice(0)) frames.release(f.state(), id);
      await f.close();
      return { ...report(), mode };
    }
    if (mode === "release")
      frames.release = (state, id) => {
        if (id === f.prefix.id) {
          injected++;
          document.documentElement.dataset.trapStage = "release-frame";
        }
        return release(state, id);
      };
    await f.renderer.slot();
    try {
      check(consume(), "union handoff issued");
      if (mode === "submit")
        f.renderer.gl.fenceSync = () => {
          injected++;
          return null;
        };
      f.renderer.check();
    } catch {
      rejected = true;
    }
    f.renderer.gl.fenceSync = fence;
    check(rejected && injected === 1, "positive post-swap terminal handoff failure");
    check(
      f.renderer.resources.base !== base && !f.base.prefix && !f.base.acknowledgement,
      "old GPU role cannot resume or acknowledge after union swap",
    );
    const charged = f.leases.resources();
    if (mode === "release")
      check(
        !editorHealthy() && charged.receiptLeases === 2 && charged.uncertainReceiptLeases === 1,
        "both post-swap owners remain charged",
      );
    f.renderer.dispose({
      resources: () => f.leases.combine(f.cache.resources()),
      cleanup: () =>
        cleanupScene([
          () => f.candidate.dispose(),
          () => f.cache.dispose(),
          () => live.dispose(),
          () => f.base.dispose(),
          () => f.leases.drained(),
        ]),
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    check(!f.candidate.ready && !f.candidate.busy, "terminal retirement stops candidate");
    if (mode === "release") {
      let denied = false;
      try {
        gpuAdmission();
      } catch {
        denied = true;
      }
      check(denied && retiringCpuResources().receiptLeases === 2, "uncertainty gates replacement");
      check(document.documentElement.dataset.afterTrap === "0", "no poisoned Wasm retry");
      check(injected === 1, "failed release never retried");
    }
    return { ...report(), mode, charged, injected };
  } finally {
    frames.release = release;
    f.renderer.gl.fenceSync = fence;
  }
}
