import { bridge } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { viewportBridge } from "../../../src/memory/viewport-bridge.ts";
import { panPreview } from "../../../src/memory/pan-preview.ts";
import { accepted, seedUndo } from "./undo-input.ts";
import { PrototypeWorker } from "./worker-client.ts";
import { compositor } from "./worker-compositor.ts";
import { padding } from "./worker-wire.ts";
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export async function workerCheckpoint(canvas: HTMLCanvasElement) {
  const worker = new PrototypeWorker();
  const view = compositor(canvas);
  let state = accepted(bridge.create());
  state = accepted(bridge.enter(state.owner));
  state = accepted(bridge.metrics(state, 1n, 1024, 768, 1));
  // Fixture setup acknowledgement precedes deterministic input seeding; not production readiness.
  state = accepted(bridge.presented(state));
  let closedBitmaps = 0;
  try {
    state = await seedUndo(state, 1024, 768, false);
    state = accepted(penBridge.undo(state));
    const completedStroke = Array.from(bridge.scene(state).ids);
    await worker.request({ kind: "init", id: 1, width: 1024, height: 768, margin: 0 });
    const unpadded = await worker.render(state, completedStroke, 2, true);
    view.base(unpadded);
    const workerUnpaddedHash = await view.hash();
    await worker.request({ kind: "init", id: 3, width: 1024, height: 768, margin: 1 });
    const padded = await worker.render(state, completedStroke, 4, true);
    view.base(padded);
    const workerPaddedHash = await view.hash();
    state = accepted(bridge.presented(state));
    const panSamples: { elapsed: number; commandAndBlitMs: number }[] = [];
    let requestedAt = 0;
    let busyAt = 0;
    let actions: Promise<void> | undefined;
    worker.onBusy = (id) => {
      if (id !== 5) return;
      busyAt = performance.now();
      actions = (async () => {
        const pan = accepted(viewportBridge.begin(state, 90, 100, 100));
        for (let i = 1; i <= 6; i++) {
          const start = performance.now();
          state = accepted(viewportBridge.update(pan, BigInt(i), 100 + i * 10, 100));
          const m = panPreview(state);
          accepted(m);
          view.transform([m.m11, m.m12, m.m21, m.m22, m.offsetX, m.offsetY]);
          panSamples.push({
            elapsed: performance.now() - busyAt,
            commandAndBlitMs: performance.now() - start,
          });
          await pause(8);
        }
        state = accepted(penBridge.cancel(state, "escape"));
        view.cancel();
        state = accepted(bridge.presented(state));
        requestedAt = performance.now();
        state = accepted(penBridge.begin(state, 91, 100, 100, 0, false));
        // The latest marker contains no queued document copy; geometry is requested once credit returns.
      })();
    };
    const oldFrame = await worker.render(state, completedStroke, 5, true);
    await actions;
    if (requestedAt === 0 || panSamples.length !== 6) throw Error("busy-actions-not-run");
    const baseSubmissionMs = view.base(oldFrame);
    const queuedUntil = performance.now();
    const active = bridge.scene(state).ids.at(-1);
    if (active === undefined) throw Error("missing-active-stroke");
    const activeFrame = await worker.render(state, [active], 6, false);
    const activeSubmissionMs = view.active(activeFrame);
    const inputToFrameSubmissionMs = performance.now() - requestedAt;
    const activeHash = await view.hash();
    const cancelStart = performance.now();
    state = accepted(penBridge.cancel(state, "escape"));
    view.cancel();
    const cancellationMs = performance.now() - cancelStart;
    const restoredHash = await view.hash();
    closedBitmaps = view.dispose();
    return {
      kind: "isolated-single-worker-feasibility; synthetic Rust commands, real worker and bitmap transfer",
      samples: 65_537,
      workerUnpaddedHash,
      workerPaddedHash,
      activeHash,
      restoredHash,
      performanceVerdict: inputToFrameSubmissionMs > 100 ? "failed" : "incomplete",
      failedGate: inputToFrameSubmissionMs > 100 ? "fresh-ink-frame-submission-max100ms" : null,
      inputToFrameSubmissionMs,
      queueWaitMs: queuedUntil - requestedAt,
      workerBusyDrawMs: oldFrame.drawMs,
      workerBusyExportMs: oldFrame.exportMs,
      freshWorkerDrawMs: activeFrame.drawMs,
      freshWorkerExportMs: activeFrame.exportMs,
      baseSubmissionMs,
      activeSubmissionMs,
      panSamples,
      cancellationMs,
      maximumPageBytes: worker.maximumPageBytes,
      maximumQueryMs: worker.maximumQueryMs,
      pageCreditLimit: 1,
      frameCreditLimit: 1,
      closedBitmaps,
      workerHeapBytes: activeFrame.heap,
      smallPadding: padding(1024, 768),
      largePadding: padding(4096, 2048),
      completed: bridge.read(state.owner),
      host: {
        userAgent: navigator.userAgent,
        dpr: devicePixelRatio,
        visibility: document.visibilityState,
        viewport: [innerWidth, innerHeight],
        physicalRefresh: "unavailable headless",
      },
      gaps: [
        "Host padding translates existing Rust viewport geometry only; no shared extent ABI or newly offscreen-content proof",
        "Busy pan callbacks are synthetic boundary actions, not actual application/native pointer E2E",
        "Single latest request marker and one page credit tested; no production dispatcher or hostile-wire conformance",
        "A completed base is present before B preview; B cancel after arrival verified; busy pen cancel and late obsolete frame/restart unrun",
        "Geometry admission has no new2ms scheduler; one acknowledged page yields per transfer and maximum query is reported",
        "Submission not GPU completion/physical display; memory estimates exclude drivers and hidden copy/stencil/cache costs",
        "One dense small-frame timing sample establishes failure only; no p95, fullmatrix, thermal or maximum-size allocation claim",
      ],
    };
  } finally {
    view.dispose();
    await worker.dispose();
    bridge.dispose(state.owner);
  }
}
