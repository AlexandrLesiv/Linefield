export async function seedLayers(frame) {
  await frame.evaluate(() => {
    const e = lab.core,
      hidden = e.layer_create(),
      top = e.layer_create();
    const name = new TextEncoder().encode("Hidden paper · Київ");
    new Uint8Array(e.memory.buffer, e.layer_name_input_ptr(), name.length).set(name);
    if (!e.layer_rename(hidden, name.length)) throw Error("Layer rename failed");
    e.layer_set_visible(hidden, 0);
    e.layer_set_locked(hidden, 1);
    e.layer_move(top, 0);
    e.layer_select(0);
    e.document_settings(2, 2);
  });
}
export async function documentSnapshot(frame) {
  return frame.evaluate(() => {
    const e = lab.core;
    return {
      paper: e.document_paper(),
      grid: e.document_grid(),
      active: e.layer_active(),
      layers: Array.from({ length: e.layer_count() }, (_, rank) => {
        const id = e.layer_at(rank);
        return {
          id,
          rank,
          visible: e.layer_visible(id),
          locked: e.layer_locked(id),
          defaultName: e.layer_name_is_default(id),
          name: new TextDecoder().decode(
            new Uint8Array(e.memory.buffer, e.layer_name_ptr(id), e.layer_name_len(id)),
          ),
        };
      }),
    };
  });
}
