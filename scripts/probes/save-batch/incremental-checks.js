import { ink, snapshot, equal } from "./fixture.js";
import { collect, stage, runIncremental } from "./incremental.js";
export async function incrementalChecks(load) {
  const batches = [];
  const memory = {
    save: async (streams, base, result) => batches.push({ streams, base, result }),
    reload: async () => batches,
    measurements: [],
  };
  const report = await runIncremental(load, memory);
  const e = await load();
  ink(e, 3);
  const revision = e.delta_revision();
  e.begin(2, 0);
  e.push(1, 2, 0.5);
  e.cancel();
  e.move_begin();
  e.move_add(0);
  e.move_update(0, 0);
  e.move_commit();
  e.slice_begin(0, 0);
  e.slice_push(999, 999);
  e.cancel();
  if (e.delta_revision() !== revision) throw Error("no-op revision");
  report.checks.push("cancel no-op and live gestures do not advance revision");
  const baseline = snapshot(e);
  const corrupt = batches.map((b) => ({ ...b, streams: b.streams.map((s) => s.slice()) }));
  corrupt[0].streams[0][4] = 99;
  let rejected = false;
  try {
    stage(e, corrupt);
  } catch {
    rejected = true;
  }
  if (!rejected || !equal(baseline, snapshot(e)))
    throw Error("malformed restore mutated live state");
  report.checks.push("malformed version restore leaves live document unchanged");
  const invalid = batches.map((b) => ({ ...b, streams: b.streams.map((s) => s.slice()) }));
  new DataView(invalid[0].streams[1].buffer).setFloat64(8, Number.NaN, true);
  rejected = false;
  try {
    stage(e, invalid);
  } catch {
    rejected = true;
  }
  if (!rejected || !equal(baseline, snapshot(e))) throw Error("invalid float accepted");
  report.checks.push("nonfinite sample restore rejected atomically");
  const wrong = batches.map((b) => ({ ...b, streams: b.streams.map((s) => s.slice()) }));
  new DataView(wrong[0].streams[0].buffer).setBigUint64(8, 7n, true);
  rejected = false;
  try {
    stage(e, wrong);
  } catch {
    rejected = true;
  }
  if (!rejected || !equal(baseline, snapshot(e))) throw Error("wrong base accepted");
  report.checks.push("wrong revision chain restore rejected atomically");
  const identity = [e.delta_revision(), e.delta_durable(), e.can_undo(), e.can_redo()];
  for (const kind of ["envelope", "late malformed"]) {
    const bad = batches
      .slice(0, 2)
      .map((b) => ({ ...b, streams: b.streams.map((s) => s.slice()) }));
    if (kind === "envelope") bad[0].result += 1n;
    else bad[1].streams[0][0] ^= 1;
    rejected = false;
    try {
      stage(e, bad);
    } catch {
      rejected = true;
    }
    const after = [e.delta_revision(), e.delta_durable(), e.can_undo(), e.can_redo()];
    if (!rejected || !equal(baseline, snapshot(e)) || identity.some((v, i) => v !== after[i]))
      throw Error(`${kind} changed live state`);
    report.checks.push(`${kind} rejects without changing live document history or revision`);
  }
  const staged = stage(e, batches);
  ink(e, 2, 99);
  const edited = snapshot(e);
  if (e.restore_publish(staged) !== 0 || !equal(edited, snapshot(e)))
    throw Error("restore overwrote newer completed edit");
  report.checks.push("staged restore cannot overwrite a newer completed edit");
  const activeStage = stage(e, batches);
  const live = e.begin(2, 0);
  e.push(5, 6, 0.5);
  if (e.restore_publish(activeStage) !== 0) throw Error("restore overwrote live ink");
  e.push(6, 7, 0.6);
  if (e.raw_length(live) !== 2) throw Error("active ink lost");
  e.cancel();
  report.checks.push("staged restore preserves an active draw gesture");
  const moveStage = stage(e, batches);
  e.move_begin();
  e.move_add(0);
  e.move_update(5, 6);
  if (e.restore_publish(moveStage) !== 0) throw Error("restore overwrote live move");
  e.move_cancel();
  const sliceStage = stage(e, batches);
  e.slice_begin(0, 0);
  e.slice_push(1, -10);
  e.slice_push(1, 10);
  if (e.restore_publish(sliceStage) !== 0) throw Error("restore overwrote live slice");
  e.cancel();
  report.checks.push("staged restore rejects active move and slice gestures");
  const overflow = await load();
  ink(overflow, 1);
  const token = overflow.delta_prepare();
  for (let i = 0; i <= 100000; i++) overflow.layer_set_visible(0, i % 2);
  if (
    overflow.delta_status() !== 1 ||
    overflow.delta_prepare() !== 0 ||
    overflow.delta_ack(token, 0n, 1n) !== 0 ||
    overflow.layer_visible(0) !== 0
  )
    throw Error("overflow contract");
  report.checks.push("overflow disables prepare and ack while accepted edits survive");
  if (overflow.restore_publish(stage(overflow, batches)) !== 0 || overflow.layer_visible(0) !== 0)
    throw Error("restore bypassed sticky overflow");
  report.checks.push("sticky overflow also rejects restore publication");
  return report;
}
export async function incrementalMeasure(load, count) {
  const e = await load();
  const fixtureStart = performance.now();
  for (let i = 0; i < count; i++) ink(e, 1, i);
  const fixtureMs = performance.now() - fixtureStart;
  const coldStart = performance.now(),
    cold = e.delta_prepare(),
    coldPrepareMs = performance.now() - coldStart;
  if (!cold) throw Error("cold prepare rejected");
  const coldAckStart = performance.now();
  e.delta_ack(cold, e.delta_base(cold), e.delta_target(cold));
  const coldAckMs = performance.now() - coldAckStart;
  const repeats = [];
  for (let repeat = 0; repeat < 5; repeat++) {
    e.move_begin();
    e.move_add(0);
    e.move_update(1, 2);
    const completedStart = performance.now();
    e.move_commit();
    const completionHookMs = performance.now() - completedStart;
    const start = performance.now(),
      token = e.delta_prepare(),
      prepareMs = performance.now() - start;
    const encodeStart = performance.now(),
      streams = collect(e, token),
      encodeCopyMs = performance.now() - encodeStart;
    const ackStart = performance.now();
    e.delta_ack(token, e.delta_base(token), e.delta_target(token));
    const ackMs = performance.now() - ackStart;
    repeats.push({
      ackMs,
      completionHookMs,
      prepareMs,
      encodeCopyMs,
      streams: streams.length,
      bytes: streams.reduce((n, s) => n + s.length, 0),
    });
  }
  return {
    count,
    fixtureMs,
    coldPrepareMs,
    coldAckMs,
    repeats,
    wasmBytes: e.memory.buffer.byteLength,
  };
}
