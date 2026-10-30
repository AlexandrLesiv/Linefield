export async function imageRecovery(c, fresh, check) {
  const add = (e, digest, w = 100, h = 50, layer = 0) => {
    new Uint8Array(e.memory.buffer, e.image_digest_input_ptr(), 64).fill(digest.charCodeAt(0));
    return e.image_add(1, w, h, 500, layer, 0n, 100, 0n, 100, 1, 0, 800, 600) >>> 0;
  };
  const draw = (e) => {
    const id = e.begin(6, 0x112233);
    e.push(10, 10, 1);
    e.push(40, 50, 1);
    e.commit();
    return id;
  };
  const invalid = await fresh();
  for (const id of [0x80000000, 0x80000007, 0xffffffff]) {
    check(
      invalid.session_selection_set(id, 1) === 0 && invalid.selection_eligible(id, 0) === 0,
      "invalid tagged selection rejected",
    );
    invalid.move_begin();
    check(invalid.move_add(id) === 0, "invalid tagged transform rejected");
    invalid.move_cancel();
    invalid.delete_begin();
    invalid.delete_add(id);
    check(invalid.delete_commit() === 0, "invalid tagged delete rejected");
    check(
      invalid.image_opacity(id, 1) === 0 && invalid.image_exists(id) === 0,
      "invalid tagged image rejected",
    );
  }
  const opacity = await fresh();
  const alphaA = add(opacity, "1", 4096, 4096);
  opacity.image_opacity(alphaA, 0);
  add(opacity, "2", 4096, 4096);
  const beforeAlpha = opacity.delta_revision();
  check(
    opacity.image_opacity(alphaA, 1) === 0 && opacity.delta_revision() === beforeAlpha,
    "opacity budget rejects without history",
  );
  const pick = await fresh(),
    pic = add(pick, "3");
  check(
    pick.image_hit(pic, 0n, 0n, 100, 100, 0) === 1 && pick.image_hit(pic, 0n, 0n, 1, 1, 0) === 0,
    "canonical image pick",
  );
  const lasso = (points) => {
    pick.lasso_reset();
    new Float64Array(pick.memory.buffer, pick.pick_input_ptr(), points.length).set(points);
    pick.lasso_append(points.length / 2);
    pick.lasso_finish();
  };
  lasso([90, 90, 110, 90, 110, 110, 90, 110]);
  check(
    pick.image_lasso(pic, 0n, 0n, 1) === 1 && pick.image_lasso(pic, 0n, 0n, 0) === 0,
    "lasso inside image partial only",
  );
  lasso([0, 0, 200, 0, 200, 200, 0, 200]);
  check(pick.image_lasso(pic, 0n, 0n, 0) === 1, "lasso whole rectangle");
  check(add(pick, "3", 101, 50) === 0xffffffff, "digest descriptor immutable");
  const m = await fresh();
  const first = draw(m),
    img = add(m, "c"),
    last = draw(m);
  check(
    m.selection_precedes(img, first) === 1 && m.selection_precedes(last, img) === 1,
    "mixed selection order",
  );
  const oldTransform = m.stroke_transform(first, 2);
  m.move_begin();
  check(m.move_add(first) === 1 && m.move_add(img) === 1, "mixed transform membership");
  m.move_update(5, 8);
  m.move_commit();
  m.undo();
  check(m.stroke_transform(first, 2) === oldTransform, "mixed transform undo stroke");
  const svg = m.svg_begin();
  while (m.svg_prepare(svg) === 1) {}
  m.svg_configure(svg, 2, 2, 0);
  while (m.svg_measure(svg) === 1) {}
  const order = [];
  for (;;) {
    const n = m.svg_next(svg, m.svg_tolerance(svg));
    if (!n) break;
    const p = new Float64Array(m.memory.buffer, m.svg_output_ptr(svg), n);
    order.push([p[0], p[1]]);
  }
  check(
    JSON.stringify(order) ===
      JSON.stringify([
        [1, first],
        [2, img],
        [1, last],
      ]),
    "SVG mixed order",
  );
  const source = await fresh();
  const huge = add(source, "d", 4096, 4096);
  const layer = source.layer_create();
  check(layer === 1, "second layer");
  check(source.layer_set_visible(0, 0) === 1, "hide large image layer");
  const other = add(source, "e", 4096, 4096, layer);
  check(other === 0x80000001, "hidden assets do not charge GPU");
  const revision = source.delta_revision();
  check(
    source.layer_set_visible(0, 1) === 0 && source.delta_revision() === revision,
    "layer admission preserves history",
  );
  source.undo();
  source.undo();
  check(source.image_read(huge, 0n, 0, 0n, 0) === 1, "history restore image");
  check(
    new Float64Array(source.memory.buffer, source.image_output_ptr(), 15)[9] === 1,
    "undo hide after undo import",
  );
  source.redo();
  source.redo();
  check(source.image_read(other, 0n, 0, 0n, 0) === 1, "redo image");
  const sparse = await fresh();
  sparse.begin(6, 0);
  sparse.cancel();
  add(sparse, "f");
  const token = sparse.idle_begin();
  while (sparse.idle_step(token, 64) === 1) {}
  const metadata = sparse.idle_chunk(token, 0, 0);
  const data = new Uint8Array(sparse.memory.buffer, sparse.idle_chunk_ptr(), metadata).slice();
  const r = await fresh(),
    rt = r.restore_begin();
  r.restore_batch_begin(rt, 1, 0n, sparse.delta_revision());
  const append = () => {
    new Uint8Array(r.memory.buffer, r.restore_input_ptr(), data.length).set(data);
    return r.restore_append(rt, 0, data.length);
  };
  check(
    append() === 1 &&
      r.restore_metadata_replay(rt) === 1 &&
      append() === 1 &&
      r.restore_batch_end(rt) === 1,
    "cancelled stroke order gap restores",
  );
  check(r.restore_checkpoint_begin(rt) === 1, "image compaction begin");
  while (r.restore_checkpoint_step(rt, 64) === 1) {}
  const compact = [];
  for (let i = 0; ; i++) {
    const n = r.restore_checkpoint_chunk(rt, 0, i);
    check(n <= 65520, "compaction bounded");
    compact.push(new Uint8Array(r.memory.buffer, r.restore_checkpoint_ptr(rt), n).slice());
    if (n < 65520) break;
  }
  const q = await fresh(),
    qt = q.restore_begin();
  q.restore_batch_begin(qt, 1, 0n, sparse.delta_revision());
  const send = () => {
    for (const part of compact) {
      new Uint8Array(q.memory.buffer, q.restore_input_ptr(), part.length).set(part);
      check(q.restore_append(qt, 0, part.length) === 1, "checkpoint append");
    }
  };
  send();
  check(q.restore_metadata_replay(qt) === 1, "checkpoint replay");
  send();
  check(q.restore_batch_end(qt) === 1 && q.restore_publish(qt) === 1, "checkpoint publish");
  check(q.image_count() === 1 && q.count() === 1, "compaction preserves image and order highwater");
}
