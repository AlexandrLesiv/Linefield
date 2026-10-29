import { drawing } from "/input.js";
import { exitController } from "/exit.js";
import { decodeSaved } from "/transport.js";
import { stage } from "/incremental.js";
import { storage } from "/adapter.js";
import { scheduler } from "/scheduler.js";
import { ink, snapshot, equal } from "/fixture.js";
import { client } from "/client.js";
export async function stageTermination(load, mode) {
  const e = await load(),
    disk = await storage(
      `terminate${mode === "before-commit" ? "before" : "after"}`,
      `pause-${mode}`,
    ),
    save = scheduler(e, disk);
  ink(e, 3);
  await save.flush(1n, true);
  ink(e, 4);
  window.terminationReady = false;
  save.flush(2n, true).catch(() => {});
}
export async function reopenTermination(mode, load) {
  const c = client(),
    pool = `terminate${mode === "before-commit" ? "before" : "after"}`;
  try {
    const opened = await c.call("open", { pool, guarded: true });
    if (!opened.admitted) throw Error("reopen rejected");
    const result = await c.call("receipt-load", {
      document: "drawing",
      incarnation: "idle1",
      grant: "writer1",
    });
    const expected = mode === "before-commit" ? "1" : "2";
    if (result.revision !== expected || result.batches.length !== Number(expected))
      throw Error("partial or missing committed exit state");
    const restored = await load(),
      expectedEngine = await load();
    ink(expectedEngine, 3);
    if (mode === "after-commit") ink(expectedEngine, 4);
    if (
      restored.restore_publish(stage(restored, await decodeSaved(result))) !== 1 ||
      !equal(snapshot(restored), snapshot(expectedEngine))
    )
      throw Error("reopened drawing mismatch");
    await c.call("close");
    return { mode, revision: result.revision, batches: result.batches.length };
  } finally {
    c.terminate();
  }
}

export async function installWarning(load) {
  const e = await load(),
    pad = drawing(e);
  const controller = exitController(e, { flush: () => Promise.resolve() }, pad);
  window.removeWarning = () => {
    controller.dispose();
    pad.dispose();
  };
}
