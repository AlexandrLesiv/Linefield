import { scheduler } from "/scheduler.js";
import { storage } from "/adapter.js";
import { drawing, pointer, continuous } from "/input.js";
import { exitController } from "/exit.js";
import { ink } from "/fixture.js";
import { client } from "/client.js";
import { unpack } from "/transport.js";
export async function lifecycle(load) {
  const results = [],
    ok = (value, name) => {
      if (!value) throw Error(name);
      results.push(name);
    };
  const e = await load(),
    store = await storage("autosave"),
    save = scheduler(e, store),
    input = drawing(e, () => save.changed());
  await continuous(input, 350);
  ok(
    e.delta_durable() > 0n && e.delta_durable() < e.delta_revision(),
    "oldest pending autosave progresses during sustained input",
  );
  await save.flush(e.delta_revision(), true);
  ok(e.delta_durable() === 350n, "remaining N+1 autosave flushed");
  const exit = exitController(e, save, input);
  pointer(input, "pointerdown");
  const closing = exit.request();
  input.canvas.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1 }));
  ok(await closing, "pointer cancellation settles controlled exit");
  exit.cancel();
  pointer(input, "pointerdown");
  ok(!input.active() && exit.state.closed, "closed controller cannot reopen input");
  exit.dispose();
  input.dispose();
  await store.close();
  const next = await load(),
    disk = await storage("targetwait"),
    saver = scheduler(next, disk);
  let commits = 0,
    releaseSecond,
    seenSecond;
  const entered = new Promise((r) => (seenSecond = r)),
    original = disk.commit;
  disk.commit = async () => {
    if (++commits === 2) {
      seenSecond();
      await new Promise((r) => (releaseSecond = r));
    }
    return original();
  };
  ink(next, 1);
  const one = saver.flush(1n, true);
  while (!(next.idle_status() & 3)) await new Promise((r) => setTimeout(r, 1));
  ink(next, 1);
  const two = saver.flush(2n, true);
  await entered;
  ok(
    await Promise.race([one.then(() => true), new Promise((r) => setTimeout(() => r(false), 100))]),
    "flush N resolves while N+1 commit is paused",
  );
  ok(
    await Promise.race([
      saver.flush(1n).then(() => true),
      new Promise((r) => setTimeout(() => r(false), 100)),
    ]),
    "new flush for cleaned N ignores paused N+1",
  );
  releaseSecond();
  await two;
  await disk.close();
  for (const phase of ["prepare", "transfer", "commit", "cleanup"]) {
    const raw = await load(),
      engine = { ...raw },
      phaseDisk = await storage(`phase${phase}`);
    let reached,
      release,
      paused = true;
    const phaseEntered = new Promise((r) => (reached = r)),
      gate = new Promise((r) => (release = r));
    if (phase === "prepare" || phase === "cleanup") {
      const key = phase === "prepare" ? "idle_step" : "idle_cleanup",
        phaseOriginal = engine[key];
      engine[key] = (...args) => {
        if (paused && (phase === "prepare" || raw.idle_status() & 4)) {
          reached();
          return 1;
        }
        return phaseOriginal(...args);
      };
    } else {
      const key = phase === "transfer" ? "parts" : "commit",
        phaseOriginal = phaseDisk[key];
      phaseDisk[key] = async (...args) => {
        reached();
        await gate;
        return phaseOriginal(...args);
      };
    }
    ink(raw, 10);
    const phaseSaver = scheduler(engine, phaseDisk),
      pad = drawing(raw),
      phaseExit = exitController(raw, phaseSaver, pad);
    const saving = phaseSaver.flush(raw.delta_revision());
    await phaseEntered;
    const exiting = phaseExit.request();
    await new Promise((r) => setTimeout(r, 5));
    ok(!phaseExit.state.closed, `exit waits during ${phase}`);
    paused = false;
    release();
    ok(await exiting, `exit completes after ${phase}`);
    await saving;
    phaseExit.dispose();
    pad.dispose();
    await phaseDisk.close();
  }
  const c = client(),
    context = {
      document: "drawing",
      incarnation: "parts1",
      grant: "writer1",
      operation: "op1",
      base: "0",
      result: "1",
    };
  await c.call("open", { pool: "parts" });
  await c.call("receipt-init", context);
  await c.call("idle-start", { context, streams: 2 });
  for (const parts of [
    [{ stream: 0, bytes: new Uint8Array(), last: false }],
    [
      { stream: 0, bytes: new Uint8Array([1, 2]), last: true },
      { stream: 1, bytes: new Uint8Array(), last: false },
    ],
  ]) {
    const refused = await c.call("idle-parts", { parts }).then(
      () => false,
      () => true,
    );
    ok(refused, "invalid parts rejected before staging mutation");
  }
  ok(
    await c
      .call("idle-parts", {
        parts: [
          { stream: 0, bytes: new Uint8Array([1, 2]), last: true },
          { stream: 1, bytes: new Uint8Array(), last: true, kind: "idle-seal" },
        ],
      })
      .then(
        () => false,
        () => true,
      ),
    "part discriminator rejected atomically",
  );
  await c.call("idle-parts", {
    parts: [
      { stream: 0, bytes: new Uint8Array([1, 2]), last: true },
      { stream: 1, bytes: new Uint8Array(), last: true },
    ],
  });
  ok(
    await c.call("idle-part", { stream: 2, bytes: new Uint8Array(), last: true }).then(
      () => false,
      () => true,
    ),
    "extra stream rejected",
  );
  const sealed = await c.call("idle-seal"),
    duplicate = await c.call("idle-seal");
  ok(sealed.digest === duplicate.digest, "duplicate seal idempotent");
  await c.call("idle-commit");
  const saved = await c.call("receipt-load", context),
    streams = unpack(saved.batches[0][4]);
  ok(
    streams[0].length === 2 && streams[0][1] === 2 && streams[1].length === 0,
    "staging remains exact after rejected and duplicate messages",
  );
  await c.call("close");
  c.terminate();
  return results;
}
