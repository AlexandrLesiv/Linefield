# Incremental Rust saving checkpoint — SAVE-03

Feature `save-incremental` includes the SAVE-02 oracle feature. Build into the isolated
`.build-cache/save03-rust-target` directory; never replace application assets. Run the existing
runner with `LINEFIELD_INCREMENTAL=1`, `LINEFIELD_CHECKPOINT_WASM` pointing to that build, and
`LINEFIELD_EVIDENCE_DIR=.build-cache/save03-rust-final`. `LINEFIELD_CHECKS_ONLY=1` skips timing.
The separate save-recovery runner supplies actual SQLite persistence to `runIncremental`.

## Completion ownership

Fresh engines journal from their first completed command. Hooks run after `record(Command)`
and Undo/Redo application; preview updates, cancellation and no-ops do not create revisions.
Each operation gets one checked u64 revision and ordered immutable metadata records. Sources
are retained by Rc only when first encountered; geometry and raw samples are not serialized
again for later transforms. A completed metadata index and per-layer membership index avoid
scanning unrelated strokes. Layer deletion/Undo expands only affected membership; layer order
is copied as its own bounded vector. Blend groups derive from source and transform on restore.

Preparation drains only pending operation bytes and new source references into one retained
batch. Completion-hook work is measured separately, rather than presenting work shifted to
completion as free. The cold initial drain is still O(all pending records), not bounded per
frame:100k-stroke observations varied substantially (roughly60–354ms across recorded runs).
The final source-hashed report is authoritative for its run. Cold prepare and acknowledgement
costs remain explicit limitations (final cold acknowledgement162.2ms); this is not a production responsiveness claim. Fixture time
includes initial drawing and journaling. Zero timer readings mean below resolution.

Experimental limits are100k engine stroke slots/operation records,4096 layers,1M historical
source samples,32MiB pending operation bytes including12-byte per-operation framing,one
in-flight batch and65520-byte encoding chunks. A frozen batch and later pending records may
coexist. Invalid capture state, exhausted counters or capacity overflow is sticky: accepted
editing survives, but prepare and acknowledgement fail. This is an investigation fallback,
not production capacity admission or recovery UX. No data is silently declared saved.

## Revision and receipt boundary

`delta_prepare` returns a checked immutable generation. `delta_base` and `delta_target` expose
its u64 revisions; `delta_revision` is current completed state, `delta_durable` is the last
acknowledged revision. `delta_ack(token,base,result)` accepts only the retained descriptor and
never clears later edits. Batch bytes and canonical source references remain available until
acknowledgement, permitting transferred-buffer reconstruction after worker failure.

Rust acknowledgement trusts the checkpoint host to validate the SQLite receipt's document,
incarnation, grant, operation identity and SHA-256 body binding. Those checks belong to the
save-recovery adapter; the scalar Rust API alone is not the full production receipt contract.
No separate payload-release lifecycle or production revision/identity ABI is adopted.

Stream0 is versioned LFD3:base/result u64 values, ordered operation revisions and bounded
layer/stroke upsert/deletion records, plus source descriptors. Later streams contain the exact
40-byte source records used by SAVE-02. Source order and stream lengths are included in the
host's SHA-256 framing. Existing instances without journaling are not migrated implicitly.

## Validated cold reload

`restore_begin` explicitly starts replacement staging and captures the live journal generation
and revision. `restore_batch_begin(session,count,expectedBase,expectedResult)` binds the checked
storage envelope to the embedded Rust header; append uses a65520-byte scratch buffer. Each
batch validates canonical coordinates, finite styles/transforms, source and layer references,
intervals, version, bounds and contiguous operation revisions into a separate model.
Malformed batches poison staging. A later malformed batch cannot publish an earlier prefix.

`restore_publish` rejects newer completed edits, changed journal generation, active gestures
or sticky overflow. Only a fully validated candidate replaces the engine. It clears history,
rebuilds derived blending, preserves revision/source identity accounting and invalidates older
batch tokens. Staging and rebuilding are cold O(document) operations with whole-model copies;
this is not incremental loading or a memory-efficient production loader.72MiB is the Rust
staging cap; the storage adapter's smaller framing cap also applies.

Browser assertions cover saved/reloaded source bytes, style/layer/fragment/transform metadata,
all six floats per rendered capsule, and final-byte corruption detection. Geometry equality is
not a rendered-pixel or whole-app test. Paper/grid, native adapters, migration, encryption,
production capacity handling, bounded initial capture/reload, session scheduling and actual
input/frame latency remain outside this checkpoint. Existing previews remain unchanged.
