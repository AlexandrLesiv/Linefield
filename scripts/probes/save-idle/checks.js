import { scheduler } from "/scheduler.js";
import { storage } from "/adapter.js";
import { drawing, pointer } from "/input.js";
import { exitController } from "/exit.js";
import { ink, snapshot, equal } from "/fixture.js";
import { stage } from "/incremental.js";
export async function runChecks(load) {
  const checks = [];
  const ok = (value, name) => {
    if (!value) throw Error(name);
    checks.push(name);
  };
  for (const fault of [undefined, "after-commit", "before-commit", "storage-error"]) {
    const e = await load(),
      store = await storage(fault?.replaceAll("-", "") || "normal", fault),
      save = scheduler(e, store),
      input = drawing(e),
      exit = exitController(e, save, input);
    ink(e, 30);
    pointer(input, "pointerdown", 1, "pen");
    pointer(input, "pointermove", 2, "pen");
    const closing = exit.request();
    await new Promise((r) => setTimeout(r, 5));
    ok(!exit.state.closed && input.active(), "exit waits for active pen");
    pointer(input, "pointerup", 3, "pen");
    const closed = await closing;
    if (fault === "storage-error" || fault === "before-commit") {
      ok(
        !closed && !exit.state.closed && save.failure && e.delta_durable() === 0n,
        "failed exit preserves session and pending revision",
      );
      await save.retry();
      ok(await exit.request(), "retry permits confirmed exit");
    } else ok(closed, "exit waits through commit and cleanup");
    ok(
      e.delta_durable() === e.delta_revision() && e.idle_status() === 0,
      "exit target durable and cleanup complete",
    );
    const fresh = await load();
    ok(
      fresh.restore_publish(stage(fresh, await store.load())) === 1 &&
        equal(snapshot(e), snapshot(fresh)),
      "exit saved all completed input exactly",
    );
    exit.dispose();
    input.dispose();
    await store.close();
  }
  const e = await load(),
    store = await storage("cancel"),
    save = scheduler(e, store),
    input = drawing(e),
    exit = exitController(e, save, input);
  ink(e, 5);
  pointer(input, "pointerdown");
  const old = exit.request();
  exit.cancel();
  pointer(input, "pointerup");
  ok(!(await old) && !exit.state.closed, "cancelled exit cannot close later");
  pointer(input, "pointerdown");
  const n = e.delta_revision();
  await save.flush(n, true);
  ok(input.active() && e.delta_revision() === n, "manual flush leaves active gesture untouched");
  const warning = new Event("beforeunload", { cancelable: true });
  dispatchEvent(warning);
  ok(warning.defaultPrevented, "active unsaved gesture requests unload warning");
  pointer(input, "pointerup");
  ok(await exit.request(), "completed gesture included on subsequent exit");
  exit.dispose();
  input.dispose();
  await store.close();
  return checks;
}
