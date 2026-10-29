// Read-only compatibility surface for existing stream/replay helpers. Preparation
// and cleanup deliberately remain explicit stepped calls owned by the host scheduler.
export function idleBoundary(engine) {
  return {
    memory: engine.memory,
    delta_base: engine.idle_base,
    delta_target: engine.idle_target,
    delta_stream_count: engine.idle_stream_count,
    delta_chunk: engine.idle_chunk,
    delta_chunk_ptr: engine.idle_chunk_ptr,
    delta_ack: engine.idle_ack,
  };
}
// Actual edit path makes the captured source's Rc the last reference: Undo removes
// completed metadata, then a layer command discards redo-owned original samples.
export function abandonCapturedSource(engine) {
  engine.undo();
  engine.layer_set_visible(0, 0);
}
