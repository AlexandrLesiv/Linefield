import { ink, bytes, snapshot, equal, metadata } from "./fixture.js";
export async function checks(load) {
  const e = await load(),
    results = [];
  const check = (name, value) => {
    if (!value) throw Error(name);
    results.push(name);
  };
  const id = ink(e, 101);
  const before = snapshot(e);
  e.delete_begin();
  e.delete_add(id);
  check("pending deletion excluded", equal(before, snapshot(e)));
  e.cancel();
  e.begin(4, 0);
  e.push(2, 3, 0.5);
  check("active ink excluded", equal(before, snapshot(e)));
  e.push(3, 4, 0.6); // Retention must not break active Rc::get_mut.
  e.cancel();
  e.move_begin();
  e.move_add(id);
  e.move_update(30, 50);
  check("live transform excluded", equal(before, snapshot(e)));
  e.move_cancel();
  e.slice_begin(0, 0);
  e.slice_push(50.25, -20);
  e.slice_push(50.25, 20);
  check("live slice excluded", equal(before, snapshot(e)));
  e.slice_commit();
  const sliced = snapshot(e),
    decoded = metadata(sliced[0]);
  check("fragment sources deduplicated", sliced.length === 2 && decoded.strokes.length === 2);
  check(
    "fractional slice retained",
    decoded.strokes.every((s) => s.fields[8] === 1) && decoded.strokes[0].slice[1] % 1 !== 0,
  );
  check(
    "raw source/style retained",
    equal([before[1]], [sliced[1]]) &&
      decoded.strokes.every((s) => s.fields[5] === 2 && s.fields[6] === 0x123456),
  );
  e.layer_set_visible(0, 0);
  check("hidden artwork included", metadata(snapshot(e)[0]).strokes.length === 2);
  e.layer_set_visible(0, 1);
  e.move_begin();
  e.move_add(decoded.strokes[0].fields[0]);
  e.move_update(12, 24);
  e.move_commit();
  const moved = metadata(snapshot(e)[0]);
  check(
    "completed transform retained",
    moved.strokes[0].transform[2] === 12 && moved.strokes[0].transform[3] === 24,
  );
  check(
    "transformed fragments split blend groups",
    moved.strokes[0].fields[3] !== moved.strokes[1].fields[3],
  );
  const beforeFragmentMove = snapshot(e);
  e.move_begin();
  e.move_add(decoded.strokes[1].fields[0]);
  e.move_update(12, 24);
  check(
    "live fragment move preserves completed blend groups",
    equal(beforeFragmentMove, snapshot(e)),
  );
  e.move_cancel();
  const token = e.save_capture(),
    retained = bytes(e, token, 1);
  check("second capture bounded", e.save_capture() === 0);
  check("stale release rejected", e.save_release(token - 1) === 0);
  check(
    "stale and range reads rejected",
    e.save_chunk(token - 1, 1, 0) >>> 0 === 0xffffffff &&
      e.save_chunk(token, 999, 0) >>> 0 === 0xffffffff &&
      e.save_chunk(token, 1, 999999) >>> 0 === 0xffffffff,
  );
  e.undo();
  e.undo();
  ink(e, 5, 70);
  check(
    "N retained across N+1 undo and redo branch discard",
    equal([retained], [bytes(e, token, 1)]),
  );
  e.save_release(token);
  const next = e.save_capture();
  check(
    "generation advances and old release cannot free new",
    next > token && e.save_release(token) === 0 && e.save_stream_count(next) > 0,
  );
  e.save_release(next);
  const exact = await load();
  exact.begin(3, 0);
  exact.push_regional(9007199254740993n, 0.125, -9007199254740993n, 0.25, 0.375);
  exact.commit();
  const raw = snapshot(exact)[1],
    view = new DataView(raw.buffer);
  check(
    "exact i64 local and pressure preserved",
    view.getBigInt64(0, true) === 9007199254740993n &&
      view.getFloat64(8, true) === 0.125 &&
      view.getBigInt64(16, true) === -9007199254740993n &&
      view.getFloat64(24, true) === 0.25 &&
      view.getFloat32(32, true) === 0.375,
  );
  exact.layer_create();
  const name = new TextEncoder().encode("Шар α");
  new Uint8Array(exact.memory.buffer, exact.layer_name_input_ptr(), name.length).set(name);
  exact.layer_rename(1, name.length);
  exact.layer_move(1, 0);
  exact.layer_set_locked(1, 1);
  const layerState = metadata(snapshot(exact)[0]).layers;
  check(
    "layer order Unicode name and lock retained",
    layerState[0].fields[0] === 1 &&
      layerState[0].name === "Шар α" &&
      layerState[0].fields[3] === 1,
  );
  exact.layer_delete(0);
  check("deleted layer artwork excluded", metadata(snapshot(exact)[0]).strokes.length === 0);
  return results;
}
