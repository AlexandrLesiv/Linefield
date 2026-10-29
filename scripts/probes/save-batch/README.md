# Rust completed-state capture checkpoint

Isolated SAVE-02 investigation, not production saving or a stable ABI/format. Build
`linefield-vector-engine` for `wasm32-unknown-unknown`, profile `vector-editor`, feature
`save-checkpoint`, with target directory `.build-cache/save02-rust-target`. The default
build has no save exports. Never replace an application's Wasm/public/dist assets.
Run `node scripts/probes/save-batch/run.ts` using installed Playwright. Optional environment:
`LINEFIELD_PLAYWRIGHT_ROOT` (package.json used to resolve Playwright),
`LINEFIELD_CHECKPOINT_WASM`, `LINEFIELD_EVIDENCE_DIR`, `LINEFIELD_CHECKS_ONLY=1`,
`LINEFIELD_LIMITS=1`. The latter includes a deliberately expensive100k-tiny-stroke fixture.
The runner uses a disposable loopback server and headless installed Chrome.

## Contract and bounds

One Rust snapshot owns copied completed metadata and deduplicated Rc source references.
No raw sample copy occurs at capture. New input never shares its active Points. Live move
uses its before transform; live Slice excludes created fragments and restores originals;
pending deletion is excluded. Hidden layers remain present; deleted/undone history-only
instances do not. Raw sources of live fragments remain complete and exact.

Capture returns a checked nonzero snapshot generation, **not a content/durable revision**.
A second capture fails without replacing retained state. Release validates the generation;
stale/duplicate releases cannot retire a new capture. Rejected reads return wasm32 UINT_MAX;
valid exact-end reads return zero. Calls do not clear or mutate document/history.

Bounds:100k scanned stroke entries including tombstones,4096 layer entries,1MiB total
layer-name bytes,1M unique retained source samples,one snapshot,one65520-byte staging buffer.
These are experimental admission limits, not product capacity recommendations or process
memory guarantees. Metadata capture is O(all stroke entries), has allocation costs, and
serializes its small fields immediately; source encoding is deferred in bounded chunks.
No Arc/thread-safety/native memory ownership claim applies to these Rc references.

Stream0 begins LFS2,encoding version u32,layer count u32,stroke count u32 (little endian).
Each ordered layer has six u32 fields:id,rank,visible,locked,default-name,name-byte-count,
then UTF-8 name. Each stroke has nine u32 fields:id,source-stream-index-minus-one,original
source-id,completed blend-group,layer-id,brush,color,raw-count,has-slice;four f32 fields:
width,pressure minimum,gamma,opacity;two f64 slice endpoints;two i64/f64 source anchors;
four f64 transform fields:basis real,imaginary,offset x,y. Source streams encode exact
40-byte regionX/localX/regionY/localY/pressure/reserved-zero records as in SAVE-01.
No serialization of struct padding or render/derived coordinates occurs.

## Evidence and limitations

Browser assertions exercise real Wasm exports, live gestures, completed transforms,
fragment grouping, Unicode layers, exact i64 values, retention across undo/redo-branch
cleanup, stale handles, bounds, and transferable detachment plus worker checksum equality.
No unit suite is introduced. Separate feature-off build/export inspection, Rust compilation,
Rust formatting, Oxfmt/Oxlint and strict runner TypeScript checks complement E2E evidence.

Report capture, per-chunk encode, copy and worker roundtrip independently. The main-thread
checksum oracle is validation overhead outside those timing fields; therefore total UI,
frame responsiveness and input/render latency are **not measured**. Non-isolated browser
timer resolution is coarse; zero is below resolution, not zero work. Wasm memory size is
committed linear memory including the fixture and allocator, not RSS or capture-only memory.
There is no SQLite write, durable receipt, reload/pixel roundtrip, native adapter, paper/grid
capture or production content-revision tracking. Browser storage is a separate probe.

Metadata-heavy timing is deliberately retained even when it fails responsiveness goals.
A future incremental design must track completed changed records/tombstones and already
saved immutable sources; transform/layer edits should reference sources without copying
unchanged samples. This checkpoint always captures the current complete engine projection;
it does not implement deltas, scheduling, revision receipts or production persistence.
