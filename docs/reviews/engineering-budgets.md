# Engineering budgets — remaining review
Prepared 2026-10-16. Decision 181 approves S02 v2 starting resource caps. Updated 2026-10-17: decisions 183–187 record the owner’s EB1–EB5 selections. Selected targets are not achieved measurements; remaining numeric/accounting proposals are explicitly pending.

## Approved starting limits
See [limits-v2](../architecture/limits.md): 512 MiB aggregate owned memory; 128 MiB GPU starting target; 64 MiB/client and 128 MiB aggregate Undo; 64 MiB disposable rendering cache; 128 MiB projection/geometry; bounded pending edits, receipts, queues, logs, WAL and exports. Category maxima cannot all be allocated independently. Oldest complete Undo-entry retirement is already selected by decision 39. Pending recovery data is never cache.

Existing numeric input semantics: f64 logical coordinates; one logical unit per native point at 100%; actual samples only initially, no movement filtering; pressure width W*(0.10+0.90*p), absent pressure W. A call has at most 256 samples; a live stroke at most 65,536. These are not yet a complete geometry envelope or performance contract.

## Decision batch — selected 2026-10-17
| ID | Selected policy | Remaining validation |
| --- | --- | --- |
| EB1-B viewport zoom | 10%–800% (0.10–8×); decision 183. | Validate boundaries/precision; other geometry limits remain pending. |
| EB2-A numerical tolerance | At most 0.25 native-point visible derived-geometry approximation error; preserve original samples exactly; decision 184. | UX interaction tolerances remain feature-specific; prove numerical conformance throughout supported zoom. |
| EB3-A software responsiveness | Provisional input callback p99 ≤1 ms; frame CPU p95 ≤half and p99 ≤three-quarters of refresh interval; delivery to submission p95 ≤one and p99 ≤two intervals. Retain ≤2 ms completion drain; decision 185. | Exact reference workloads/hardware and measurements required; no physical pen latency claim. |
| EB4 macOS compatibility | Apple Silicon only; latest stable macOS for the first preview. Intel and older-macOS compatibility are outside the selected target; decision 186. | Pin and validate exact OS/deployment target and matching tools at implementation; no automatic baseline drift. |
| EB5-A browser feasibility | Chromium, Firefox and Safari/WebKit storage, pinned Rust/Wasm SQLite, VFS/worker/recovery/conformance; decision 187. Keep decision 182’s transport. | Existing preliminary checks do not establish working browser persistence or completed platform support. |

EB1–EB5 policy choices are recorded above. Remaining concrete geometry bounds and accounting changes require review. Derived stroke bounds must include radius and transforms; canonical data and viewport clipping are distinct. Viewport origin/clamping, PNG pixel dimensions and broad-phase precision need a complete follow-on numeric contract rather than hidden constants.


## EB1 focused competitor review — 2026-10-17

Question: how much viewport zoom is justified for the existing infinite-canvas sketching scope?
Method: public-source research by the lead and assigned competitor researcher; no installed-app
inspection, benchmark or design review approval. This is a bounded EB1 review, not completion of S00C.

| Evidence | Product/platform and source | Finding and confidence |
| --- | --- | --- |
| ZOOM-01 | Concepts, official cross-platform [FAQ](https://tophatch.helpshift.com/hc/en/3-concepts/faq/260-does-concepts-support-infinite-zoom/?han=1&p=all), version unspecified | Explicitly distinguishes infinite canvas from limited zoom, citing technical/usability constraints. High confidence in documented policy; no numerical endpoints published there. |
| ZOOM-02 | Concepts, official [workspace manual](https://concepts.app/en/manual/workspace), version unspecified | Zoom percentage is visible/editable. Documentation evidence, not verified platform parity or native Mac behavior. |
| ZOOM-03 | Prodrafts, [official listing](https://apps.apple.com/us/app/prodrafts-infinite-notes/id1545810067), retrieved version 5.1.3 | Infinite canvas and zoom/scroll improvements are documented; current numerical endpoints were not established from official sources. |
| ZOOM-04 | Prodrafts iPad free-version firsthand [walkthrough dated 2022-10-06](https://www.horry-s.co.jp/buttonyablog/481/), app version unknown | Reports 3%–1000%, plus return-to-100%/previous-view navigation. Historical observation by its author, not our measurement or a current specification. |
| ZOOM-05 | Prodrafts iPad Pro M1 firsthand [report dated 2023-01-07](https://note.com/isegon01/n/nf9f21f4f3314), app version unknown | Independently reports 3%–1000%. Historical corroboration only; current iPhone/Mac limits remain unknown. |

All sources accessed 2026-10-17. The official Prodrafts infinite-document manual was linked
from its website but could not be retrieved. Do not turn missing documentation into a claim
that an endpoint or feature is absent. Do not copy historical iPad limits into every host.

Historical recommendation A (not selected): 5%–1000%. At 5%, the viewport spans 20 times the logical width
and height visible at 100%; at 1000%, one logical unit spans ten native UI points. This gives
an overview/detail range substantially narrower than the old proposal. It is our proposed
design compromise, not a verified Concepts/Prodrafts specification or proven optimum.
Owner-selected B (10%–800%) reduces extremes further but shows less of a large drawing and
offers less detail magnification. Both need representative sketching/selection evaluation.

Tradeoffs: a finite minimum zoom cannot fit arbitrarily spread-out content into one view.
Panning can still reach content; zoom does not define document size. Zoomed-out dense scenes
can remain expensive, so narrowing the range does not establish performance by itself.
Do not add navigation pins, new Fit controls or competitor features implicitly. UX should
review orientation and endpoint feedback within the approved pan/zoom design; UI supplies
identified design, and the owner approves behavior before implementation.

Historical, superseded EB1 envelope suggestions (not approvals): finite coordinates
±2^30 logical units, positive uniform stroke scale 1/1024–1024, and untransformed width
0.1–1024. View zoom does not scale saved artwork or determine these limits. Validate original
and transformed stroke bounds including radius; reject overflow without rewriting content.
Current status: EB7-A and EB8 owner-selected 1–512 supersede scale/width suggestions; EB6 coordinates remain open.

Planned acceptance for the eventual numeric contract: exact endpoints and just-outside values;
NaN/Infinity rejection; coordinate round trips and hit testing near world bounds; display-scale
changes; dense scenes at minimum zoom; thin/wide strokes at maximum zoom; no document/history
mutation from viewport navigation. Preserve existing active-interaction guards. UX device
bindings remain feature-specific. These are proposed test cases, not executed evidence.
Owner status: old zoom range rejected; revised B (10%–800%) selected on 2026-10-17. Other geometry bounds remain pending. EB2–EB5 selections are recorded above.

## Accounting questions to settle with the numeric contract
- Decision 190 selects nesting the 64 MiB CPU render cache inside 128 MiB projection/geometry and 512 MiB aggregate.
- PNG decoded surfaces need overflow-safe dimensions, total pixels and temporary-raster admission. A 16,384² RGBA8 surface alone is 1 GiB; snapshot caps do not protect against it. Decision 191 selects starting full-surface limits; feasibility and actual allocation accounting still need proof.
- Thumbnail decoded memory, gallery page/window/prefetch and shader/path caches need subordinate limits, not extra uncharged pools.
- Distinguish GPU allocations owned by Linefield from system drawable/library overhead; 128 MiB is not an enforced total-device quota.
- Bound actual encoded IPC messages, decoded Foundation allocations and response copies, not only Rust DTO sizes.
- Test aggregate reservations with four hosted documents, multiple clients and accepted export jobs. Admission can fail below individual document caps when global resources are occupied.

## Reproducible validation
Use deterministic 10k/100k/1m-sample documents (dense all-visible and mostly culled), 65,536-sample accepted live stroke and 65,537 atomic cancellation. A 100k-sample single live stroke is an over-cap case, not accepted performance capacity. Include extreme coordinate/zoom/scale combinations, repeated transforms/Undo, NaN/Infinity, missing/zero/full pressure, cold/warm/evicted caches and output parity.

Record exact build and fixture hash, actual Mac/chip/RAM/display/refresh/power/thermal conditions, release configuration, sample count, percentiles and maxima. Time input callback, shared command, queue residence, scene/CPU, submission and available presentation separately. Report local and remote-client paths separately. Sustained save/export/log pressure and quit/recovery are separate workloads. Repeated same-host comparisons and an owner-reviewed relative regression threshold remain to be defined after the first baseline. No visible/physical benchmark ran during this review.

## Installed versus supported toolchain
Observed locally: Node 24.12.0, pnpm 10.26.0, Rust/Cargo 1.99.0, Swift 6.4, Xcode 27.0 build 27A266a, macOS 27.0.1 build 26A434. Root Node tools are pinned and their checks passed. Native versions are inventory, not a Linefield compatibility matrix or latest-version claim. Skia/rusqlite/cbindgen pins require the respective build/conformance lanes. No global developer-directory change: default selection is CommandLineTools; use an explicit matching Xcode toolchain/SDK and private module cache per command.

Decision 186 targets Apple Silicon and the latest stable macOS only; older-macOS/Intel support is not required. Minimum app OS, build-host OS, SDK and Swift compiler are separate pinned values. A probe compiling for an older target on a newer OS does not prove execution on that older OS. Verify the latest stable release and compatible toolchain when pinning the first preview; installed inventory is not proof of public release status.

## Browser persistence boundary
OPFS is a candidate browser-owned store. Storage availability, flush completion, quota and persistence mode are distinct; none promises permanent backup or power-loss equivalence. Expose supported capability and honest local-save status. User deletion/eviction/quota/worker loss need explicit scenarios; no permission prompt or persistent-storage request in the disposable check.

Current rusqlite upstream documents a wasm32-unknown-unknown SQLite backend option, so retaining Rust storage logic is plausible, but a specific pinned build plus VFS and worker integration must pass before declaring reuse. The official JS SQLite Wasm build is a useful reference candidate, not a replacement of the approved Rust boundary. Do not initialize two SQLite engines against one live file incidentally.

Sources checked 2026-10-16:
- [rusqlite upstream](https://github.com/rusqlite/rusqlite): target-dependent wasm backend is documented; not a Linefield build result.
- [SQLite Wasm persistence](https://sqlite.org/wasm/doc/trunk/persistence.md): VFS choices differ in locking/header requirements; WAL needs exclusive mode and adds no concurrent-reader benefit in that environment.
- [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/): quota is not guaranteed capacity; origin data can be evicted.
- [Apple Xcode requirements](https://developer.apple.com/xcode/system-requirements/): build tool/host compatibility is separate from app deployment support.

See [native/browser feasibility report](../architecture/platform-ipc-defaults.md) for actual probe results and gaps. Distinguish selected decisions 183–187 from the remaining unapproved geometry/accounting proposals.

## EB6–EB11 — owner responses 2026-10-17

Current selections: EB7-A; EB8 custom 1–512; EB9-A with host-specific profiles; EB10-A; EB11-A (decisions 188–192). EB6 remains open after the owner asked for a practically infinite canvas. The alternatives table below preserves proposal history; it is not the current selection ledger. These are provisional first-macOS-preview admission budgets,
not measured optimal values, permanent file-format restrictions or automatic mobile/web caps.
For structurally valid content beyond the supported profile, report capacity/unsupported status
and preserve original data rather than declaring corruption, clipping or rescaling silently.
Existing approved zoom, persistence, history, export pixel scale and active-tool guards remain.

| ID | A — recommended starting proposal | B — alternative and cost |
| --- | --- | --- |
| EB6 coordinate envelope | Original coordinates and transformed painted bounds within ±1,048,576 logical units per axis (±2^20), including stroke radius. View navigation remains finite and validated against this envelope; exact edge presentation needs UX review. | Retain original ±2^30 proposal: much larger workspace, more demanding numerical/culling validation with little established preview need. |
| EB7 stored uniform transformation scale | Cumulative positive scale 1/64–64 relative to original stroke; never zero/negative and never rewrite original samples to evade the cap. Validate resulting painted bounds too. | Original 1/1024–1024: more extreme resizing; harder geometry/width/hit-test fixtures. Neither choice changes 10%–800% viewport zoom. |
| EB8 base pen width | 0.1–256 logical units before pressure and stored transformation; apply already-selected pressure curve and width-scaling rules. This is engine admission, not a prescribed slider range. | Original 0.1–1024: permits broader marks but increases extreme geometry cases. design review still determines native presentation within the selected engine limit. |
| EB9 cache accounting | Count 64 MiB disposable CPU render cache inside 128 MiB projection/geometry, both inside 512 MiB aggregate; shared physical allocations counted once. | Separate 64 MiB and 128 MiB category ceilings, still inside the same 512 MiB total. More cache headroom competes with pending/history/model allocations. |
| EB10 initial PNG raster budget | Target at most 16,777,216 pixels total and 8,192 pixels on either axis; reserve up to 128 MiB aggregate temporary PNG raster/encoder memory within the existing 512 MiB ceiling, separate from retained source charge. Start with a bounded full-surface implementation feasibility check. | Plan tiled/streamed export first, then choose a larger output cap from measurements. More renderer/encoder seam, cancellation and memory-accounting work before preview acceptance. |
| EB11 gallery thumbnail budget | Up to 32 MiB decoded CPU thumbnail cache, nested inside the 64 MiB disposable cache; load visible items first and at most one viewport of items before/after. Keep approved stable-size placeholders and lazy gallery. | Visible-items-only requests with up to 16 MiB decoded cache inside the same parent budget: lower memory, potentially more placeholders/reloads during scrolling. |

EB6–EB8 narrow the earlier unapproved envelope suggestions for a focused preview; neither
range is competitor-derived or proven safe by numbers alone. Implement view-relative rendering
and precision tests before acceptance; f64 storage alone does not prove Skia output accuracy.
Viewport at document edges must not mutate artwork; exact center clamping and partial empty
viewport presentation belong in the concrete numeric/UX contract. No new navigation UI implied.

For EB10, 4096×4096 RGBA8 needs 64 MiB for pixels alone; encoder buffers, row alignment,
copies and renderer scratch also count. Pixel count and per-axis limits both apply.
Three accepted export jobs do not imply three simultaneous rasters. Reserve work memory before
raster allocation and release after completion/cancel; lower global availability may defer work.
If an export cannot meet its reservation/size limits, report failure without publishing partial
output or silently lowering the approved export scale. No new resolution setting is approved.
Approved output is opaque 8-bit sRGB PNG at the selected fixed pixel scale; native export is unchanged.

For EB11, GPU texture copies are separately charged to the existing GPU target; encoded data,
in-flight decode buffers and decoded images must not become uncharged memory. Prefetch is
cancellable and lower priority than visible/ink work. Do not introduce a new thread topology
through this budget. Exact thumbnail raster dimensions follow approved design review sizes/display
density plus measured admission checks, rather than guessing a platform-wide fixed pixel size.

Planned tests: all endpoints, invalid finite/nonfinite values, cumulative scale, radius-aware
bounds, no partial mutation, original-point preservation, pressure/transform/render/hit parity;
nested cache accounting and eviction; aggregate multi-document/export pressure; PNG both-axis/
pixel/memory failures with unchanged destinations; gallery rapid scroll, cancellation and no
layout shifts. These are requirements for future implementation, not executed evidence.

## EB6 background research — superseded by decision 193

Current selection: EB6-B region addresses plus local coordinates. The f64-only recommendation below is retained as research history, not the chosen direction. Concrete schema/ABI and normalization await review.

Owner asks whether the canvas can be actually infinite and how Concepts handles it.
Concepts documents an [infinite canvas](https://concepts.app/en/manual) and separately
[bounded zoom](https://tophatch.helpshift.com/hc/en/3-concepts/faq/260-does-concepts-support-infinite-zoom/?han=1&p=all).
Its public materials checked 2026-10-17 do not establish coordinate representation, maximum
extent or a particular rebasing/tile scheme. Do not invent a description of its internals.

An infinite-canvas product experience means no fixed page boundary and allocating storage
for actual content, not a giant blank bitmap. All actual stored coordinates, precision,
storage and computation remain finite. Existing f64 coordinates support a much larger
representable space than the proposed million-unit envelope, but spacing between representable
numbers grows with magnitude. Rendering libraries may use lower precision internally.

Recommendation for review: retain finite f64 document coordinates, derive view-relative
render coordinates in f64 before narrowing for Skia, cull offscreen content and validate an
operating envelope through the approved 0.25-point accuracy tests at 10%–800% zoom.
Do not adopt ±2^20 as a product boundary yet. A larger envelope still needs overflow and
precision admission checks; never accept Infinity/NaN or silently move saved strokes.
This is a proposed rendering detail/validation strategy, not a newly approved numeric bound.
Chunk-addressed coordinates plus local offsets could extend practical range later, but would
be a reviewed schema/ABI change with cross-chunk transform, import, export and migration tests.
No coordinate redesign is approved by asking the question. EB6 remains unanswered.

## Platform budget profiles — provisional approval, decision 194

Decision 190 requests platform-specific profiles. Host category alone cannot guarantee safety:
device memory, OS pressure, concurrent work and framework overhead matter. These owner-approved provisional owned-memory
starting caps require target-device selection and measurements before platform acceptance.

| Host/profile | Owned CPU aggregate MiB | Disposable CPU cache MiB | Undo per client / aggregate MiB |
| --- | --- | --- | --- |
| macOS Apple Silicon | 512 approved | 64 approved | 64 / 128 approved |
| Windows / Linux desktop | 512 provisional | 64 provisional | 64 / 128 provisional |
| iPadOS / Android tablet | 384 provisional | 48 provisional | 48 / 96 provisional |
| iOS / Android phone | 256 provisional | 32 provisional | 32 / 64 provisional |
| Web baseline | 128 provisional | 16 provisional | 16 / 32 provisional |
| visionOS / Android XR initial 2D profile | 384 provisional | 48 provisional | 48 / 96 if editing approved |
| tvOS / Android TV viewers | 256 provisional | 32 provisional | 0 / 0 |
| watchOS / Wear OS image-viewer candidate | 32 provisional | 8 provisional | 0 / 0 |

ChromeOS selects the reviewed Android or web profile and actual device class; it is not
another engine. XR capabilities remain separately gated. WatchOS image viewing is selected separately by decision 195; Wear OS acquisition/rendering remains open. These are app-owned accounting caps,
not total RSS, available-memory promises, GPU allocations or OS kill thresholds.
All table values above are approved as provisional starting caps (decision 194); actual platform acceptance requires measurements. Cache is nested within geometry/presentation
and aggregate budgets; decoded thumbnails use at most half that profile's disposable cache.
Resource pressure may reduce caches/prefetch/admission, never authorize unique-data eviction.

Do not transplant other macOS category maxima into smaller totals. Each port must supply a
complete reconciled profile for pending input/model/history/snapshots/IPC/logging/temporary
exports and separately measured GPU headroom before implementation. Preserve room for recovery;
a smaller host can reject an unsupported document/export without modifying it or calling it
corrupt. Watch viewers do not need editor Undo/pending-stroke allocations.
The 32 MiB watch candidate excludes OS/framework overhead and must be measured on real watches.

## Watch rendering clarification — initial research, decision 195 now selects advance downloads

No requirement to drop watchOS follows from an unproven Rust/Skia port. Proposed initial viewer:
iPhone Skia produces bounded images from a specific drawing revision; WatchConnectivity
transfers files, the watch displays them with native UI and stores a bounded offline cache.
Use small reachable request/reply messages for control and system-scheduled file transfer for
image payloads. Do not promise transfer latency or continuous background execution.
Apple documents these mechanisms in its [Watch Connectivity sample](https://developer.apple.com/documentation/watchconnectivity/transferring-data-with-watch-connectivity).
Source checked 2026-10-17; no device or streaming experiment performed.

A cached image is not the editable SQLite document. Native pan/zoom can transform cached
pixels locally; detail is limited by resolution. Later requests could fetch a higher-resolution
region or tiles, each tied to document identity/revision and viewport request. Reject stale
results and never combine tiles from different revisions. Offline use covers downloaded areas/
detail only; show stale/unavailable state honestly. Future approved server/network acquisition
could supply the same media, but remains separate scope and requires authentication/privacy review.

This is on-demand still-image delivery, not a promised continuous video stream. Live video
would need a separate transport/codec/latency/battery/background feasibility study and explicit
scope. Do not misuse audio/background modes to keep a drawing stream alive. Start with bounded
snapshots if approved; independent on-watch rendering of arbitrary native files remains a gap.
Shared document/command logic must remain independent of Skia even if a viewer uses only media.
Test transfer loss/reordering, oversized images/decompression, revision mismatch, low storage,
revoked access, offline/reconnection and battery/memory before claiming support.

## Decision batch — selected 2026-10-17

Owner selected EB6-B, EB12-A and WV1-A; see decisions 193–195. The option descriptions below are review history. Exact coordinate and watch-package contracts remain pending, not the direction choices.

The owner's request to proceed to decisions does not select a watch architecture. Present
these together; EB7–EB11 are settled by decisions 188–192. This batch approves directions
and provisional profiles only, not application implementation, design review or measured support.

- EB6 revised A (recommended): practically infinite, pageless canvas using existing finite
  f64 document coordinates and view-relative rendering; establish the largest validated
  operating envelope through precision tests before shipping. Do not adopt the proposed
  million-unit product boundary. Numerical guards, resource caps and finite zoom remain.
  B: design chunk-addressed coordinates plus local offsets now, with concrete schema/ABI/
  transform/migration review before implementation. This extends practical range at higher
  complexity; it is still not mathematical infinity. Exact EB6 bounds remain a validation
  deliverable even if A is selected, not permission for unchecked f64 values.
- EB12 A (recommended): adopt the platform budget candidate table above as provisional
  engineering starting caps. Each port must reconcile all subordinate reservations, validate
  actual device memory pressure and GPU/framework overhead, and obtain review for material
  changes before acceptance. This is not a promise that every document fits every host.
  B: keep only macOS numeric budgets selected and defer all other numbers to each port.
- WV1 A (recommended for initial watchOS viewer): explicit Keep on Watch downloads prepared
  in advance by iPhone, containing a bounded overview/detail image package. Queue background
  updates when the source changes and execution is available. Open downloaded revisions
  immediately offline; optional connected refresh cannot block the stored view. Distinguish
  waiting/downloading/available-offline/current-or-older status. Do not mark ready until the
  watch has validated and stored the complete promised package. Keep the previous complete
  revision until a replacement is installed safely; reserve replacement storage first.
  Explicit offline downloads are managed persistent data, not disposable cache, and ordinary
  cache eviction must not remove them. Disk quotas/removal/revocation and exact prepared
  detail/zoom guarantees need a bounded follow-up contract and owner-approved design review.
  B: investigate a native watchOS vector renderer so downloaded native documents can be
  viewed independently at arbitrary permitted zoom. More geometry/render parity, parser,
  memory and device work; requires a concrete architecture review, not automatic coding.
  C: retain watchOS as a target and defer its acquisition/rendering choice until P08.

WV1 A supersedes the earlier open-time-only example: background delivery in advance is the
normal offline path; on-demand transfer is supplementary. No near-phone-at-open requirement
for completed downloads. Missing downloads, newer revisions and uncached detail cannot be
promised offline. WatchConnectivity schedules transfers; no deadline or always-running phone
renderer is assumed. Future server acquisition remains separately scoped. Do not infer that
Wear OS has selected the same media design; its separate feasibility decision remains P12.

## Region contract choices — RC1–RC4 selected 2026-10-17

Decisions 196–199 select signed i64 region X/Y, 65,536-unit square regions,
region/local coordinates per sample (one row per sample), and authoritative shared Rust
normalization. Preserve original samples, stroke identity/order, one-operation Undo,
typed commands, f64 local precision and reviewed platform resource profiles.
Region labels are not raster tiles or document UUIDs.

Next concrete packet must reconcile stroke transforms, cross-region arithmetic/precision,
viewport/hit-testing/indexing, schema source/typed declarations, migration/version consequences and
boundary/failure/conformance tests. Keep the old approved S02 v2 snapshot immutable.
Selected directions do not approve exact replacement columns/signatures or runtime code.
The lead is obtaining scoped Rust review before presenting further owner tradeoffs;
do not invent another broad questionnaire or reopen selected policies.

## Region batch — RC5-A / RC6-A selected 2026-10-17

Owner selected A for both (decisions 200–201). The alternatives below are historical review
context. Exact per-stroke span and replacement schema/ABI remain for the concrete packet;
there are no unanswered RC1–RC6 policy questions.

Scoped read-only rust_engine review (region_contract_next_review) inspected approved
native-v2/schema and current choices; no implementation or tests. This is specialist
planning input, not an independent final contract approval.

- RC5 A (recommended): a single stroke's original span must fit a tested local precision
  envelope for the first preview. Different strokes may be placed across the entire
  supported region address space; this does not reintroduce fixed page boundaries.
  No arbitrary numerical span selected yet: propose it with precision evidence/contract
  before implementation acceptance. Over-limit interactions follow existing atomic
  rejection/cancellation rules; never silently truncate, split or alter stored samples.
  Also validate transformed bounds at the selected 1/64–64 scale and 10%–800% zoom.
  B: require individual strokes spanning the whole region address space immediately,
  with segmented/wide arithmetic, clipping, transformation and substantial edge tests.
  Whole-drawing/resource/address limits still apply; neither option means infinite memory.
- RC6 A (recommended): native pointer samples carry canvas-local logical coordinates and
  a captured mapping generation. Shared Rust converts through the accepted viewport to
  canonical region/local document positions. Platform owns event-to-view conversion and
  native backing-scale semantics, not world-coordinate math. Keep mapping-change cancellation
  and stale-generation rejection. Persisted samples remain region/local per RC3.
  B: native hosts supply region/local document positions; each must perform precise
  view-to-world conversion while Rust still validates/normalizes. More duplicated adapter
  logic and cross-platform conformance work. This does not authorize duplicated editing.

Next packet should propose immutable source anchor + current placement anchor + positive
uniform scale, conceptually placement + scale*(original-source). Anchors are region/local;
original samples are not rewritten. Gesture pivot changes affect placement, not source.
First actual sample is a candidate deterministic source anchor, not an implemented choice.
Specify checked wide integer differences before floating-point narrowing; never collapse
huge absolute region positions into f64 before subtracting them.
Concrete columns, signatures, normalization, revision-safe mapping and conformance cases
are one owner-review packet after RC5/RC6, not a sequence of invented preference questions.

## Complete remaining region questionnaire — 2026-10-17

Owner requested all independent questions in revised schema/typed interfaces, anchors,
normalization, stroke span and cross-region rendering/selection, with dependent questions
deferred. Read-only rust_engine review (region_contract_next_review) checked decisions
through 201 and native-v2/schema. It found two independent representation choices.
These options are proposals; no schema/ABI edit, publication, probe or implementation.

### Batch 1 — selected RC7-A and RC8-A (2026-10-17)

Decisions 202–203 approve [0,65536) local coordinates and first-sample anchored transforms.
The A/B options below are historical review context; all RC1–RC8 choices are settled.
The dependent concrete packet and exact evidence-based stroke-span limit remain pending.

RC7 canonical local range:
- A (recommended): [0,65536) for each finite f64 local coordinate. Whole-region carry/borrow;
  local65536 becomes next-region local0. Global -1 can be region-1/local65535.
- B: [-32768,32768); region addresses refer to centers. Global -1 can be region0/local-1.
  Same capacity and basic precision; signed half-region boundaries need consistent handling.
Both retain exact i64 addresses, checked arithmetic, canonical +0, rejection of nonfinite/
overflow, Rust ownership, and no visible region/page boundary.

RC8 anchored transform representation, common to both choices:
  displayed_point = placement_anchor + uniform_scale * (original_point - source_anchor)
Both anchors are region/local positions; original points stay immutable.
- A (recommended): immutable source anchor is the first actual sample, derived from ordered
  samples without redundant source-anchor columns. Store placement anchor and scale.
  Initial placement equals source; movement updates placement.
- B: immutable source anchor is the center of original sample bounds. Smaller maximum
  source-relative distances, but center definition and persistence or deterministic derivation
  need additional validation. This does not change the stroke's visible geometry.
Choosing A/B approves this anchored representation direction for the exact packet, not
unseen generated declarations. Source anchor is NOT the UI scaling pivot. Existing
opposite-corner scaling remains: placement'=pivot+k*(placement-pivot), scale'=k*scale,
computed relative to captured gesture state with checked regional arithmetic. Keep approved
positive cumulative scale and original-point preservation. Do not convert huge absolute
positions to f64 before computing relative differences.

RC7 and RC8 can be answered in either order. RC1–RC6, all current geometry/style/zoom
policies and memory-only spatial indexing remain settled.

### Batch 2 — dependent review, not unanswered invented preferences

Dependency: RC7+RC8 -> exact arithmetic/schema/ABI proposal -> scoped precision evidence ->
numerical span proposal and consolidated owner review. Any new executable precision probes
need authorization within applicable task/tooling scope; no foreground session is implied.

1. Exact per-stroke original-span number and transformed-bounds admission: evidence at
   min/max zoom/scale, width/pressure bounds, negative/near-extreme addresses and crossings.
   If evidence warrants a smaller span versus more sophisticated arithmetic/clipping, present
   that real tradeoff with measurements. Do not ask the owner to guess an untested bound.
2. Exact schema/interface amendment approval: schema source/constraints/dictionary, anchored transforms,
   generated declaration proposal, canvas-local vs world DTOs, ownership/mapping generation,
   canonical command fingerprints, version/snapshot/import/export impact and tests.
3. Cross-region rendering/selection conformance and limitations: clipped/rebased derived
   geometry, segments crossing viewport with both endpoints outside, round trips, visible
   error and hit-test parity. Present acceptance evidence/actual limitations, not claims
   inferred from i64/f64 types. No reopen of selected memory-only spatial-index policy.

### Engineering specification items included in that packet

Use scalar region_x/region_y INTEGER plus local_x/local_y REAL per sample, matching selected
RC1/RC3; placement uses the same position shape and scale remains REAL. No lookup table,
packed coordinate protocol, per-region database or stored redundant source anchor implicitly.
Propose distinct reusable world-position and canvas-local input DTOs; future web preserves
i64 exactly. Normalize/validate boundaries, negative zero, carry/borrow and SQL reads.
Region-aware bounds/indexing must cover whole painted segments/width, not only sample regions.
Cull/clip/rebase before narrowing to renderer precision; drawing and hit tests share mapping.
Preserve approved atomic batch cancellation, stale-mapping rejection, no silent saved-artwork
clipping/splitting, original samples, stroke IDs/order and one-operation Undo.

## Second batch — selected concrete directions RC9/RC10 (2026-10-17)

Owner selected RC9-A and RC10-A on 2026-10-17 (decisions 205–206). The two amendment
proposals below are accepted directions for the final review packet. They are not a compiled
ABI or final visualized schema source approval. Do not infer implementation or publication authority.
The owner supplied an empty RC11 entry; no RC11 question is defined here or answer recorded.
Exact tested per-stroke span remains deferred until numerical evidence exists.
Scoped rust_engine planning review checked the field layout and identified missing
start-point/handle/generation data in old transform calls; no tests performed.

### RC9 — flat coordinate and placement columns

Propose replacing only affected columns in the existing drawing database:
| Table | Remove | Add / retain |
| --- | --- | --- |
| samples | x REAL, y REAL | region_x INTEGER, region_y INTEGER, local_x REAL, local_y REAL |
| strokes | translation_x REAL, translation_y REAL | placement_region_x INTEGER, placement_region_y INTEGER, placement_local_x REAL, placement_local_y REAL |
| strokes | none | uniform_scale REAL retained |

New fields NOT NULL; region values signed i64, finite local f64 in [0,65536).
Rust enforces canonical +0/checked arithmetic and validates hostile reads; exact SQL DDL
constraints will be included in the visualized packet. Scale remains [1/64,64].
Keep PK/FK/sample order/pressure semantics, one row per sample, IDs, paint order, revisions,
receipts and existing transaction/Undo semantics. Derive source anchor from sample0.
No region table, coordinate blob, new database or stored redundant source anchor.
The schema adds four columns net: samples +2 and strokes +2 (two removals and four
additions in each table).
Estimate actual SQLite/heap/batch costs with fixtures; do not treat raw field width as
measured row cost or silently raise resource caps.
Choices: A accept this column-layout proposal for the final schema source/constraint review;
B request revisions before producing that packet. Final visual approval remains separate.

### RC10 — distinct pointer/world types and Rust-owned viewport/transform math

Proposed semantic DTO shapes (names tentative; generated repr(C) declarations still need
layout/ownership review):
- WorldPosition: region_x:i64, region_y:i64, local_x:f64, local_y:f64.
- CanvasPoint: x_points:f64, y_points:f64.
- CanvasSample: CanvasPoint, pressure:f64, sample_index:u64, has_pressure:u32, reserved:u32.
- StoredSample: WorldPosition, pressure:f64, sample_index:u64, has_pressure:u32, reserved:u32.
- CanvasMetrics: width_points:f64, height_points:f64, backing_scale:f64.
- ViewportSnapshot: center:WorldPosition, zoom:f64, accepted metrics, mapping_generation:u64.
- SelectionSnapshot: coherent revision/mapping generation, selected stroke token and bounded
  view-local handles/bounds for native presentation; no authoritative Swift geometry copy.

Host reports metrics; it does not set authoritative viewport center/zoom/generation.
Rust returns the accepted mapping generation after ordering/cancellation. Native event
adapters tag input with the displayed/accepted mapping generation; reject stale input.
Pan/zoom remain named intents with shared guards and Rust-computed canonical viewport.
Pointer stroke/select/zoom anchors use canvas points. Queries return canonical stored samples.
Move begin carries expected stroke + start CanvasPoint + mapping generation; update carries
interaction + input sequence + mapping generation + absolute current CanvasPoint.
Scale begin additionally carries a typed corner handle ID; Rust captures original painted
bounds/opposite corner, start point and base transform. Updates carry absolute current
CanvasPoint, not host-computed scale or world anchor. Existing commit/cancel identities stay.
Rust derives updates from captured base, revalidates target token at commit and owns scale
bounds, normalization, mapping and atomic failure. Swift must not calculate world transforms.

Detailed corner-drag factor algorithm, handle-click offset, degenerate geometry and accessible
presentation belong to the concrete contract/feature UX review. Do not choose them silently
or claim they follow just from a DTO. Exact coordinate axis convention and metrics/input
ordering must be explicit in that packet; shared mapping must cover each native convention.
Future non-pointer command interfaces may use WorldPosition without pointer emulation;
no agent transport or generalized command blob is introduced.
Choices: A accept this semantic boundary proposal for exact generated declarations/UX handoff;
B request revisions. Final exact ABI/visualized schema review and tests remain required.

### Still dependent — no arbitrary approval question now

Exact per-stroke span and required precision/clipping implementation depend on the complete
arithmetic and render test evidence. Keep pending, show evidence when available. The next
combined review must cover actual schema source delta, declaration layouts/ownership, canonical
fingerprints, transform and viewport math, sample0/hydration ordering, tests and limitations.
Do not add further preference rounds for field naming or settled sample/history policies.

## RC11 — shared coordinate orientation (A selected, 2026-10-17)

A read-only rust_engine review found no selected axis/origin convention in current decisions
or contracts. Decision206 leaves this explicit. This is the one remaining independent
coordinate convention; do not invent additional preference rounds to pad a batch.

- A (recommended): X increases right and Y increases down in both document and normalized
  canvas coordinates. Canvas-local (0,0) is the canvas top-left. Rust maps via its independently
  stored canonical viewport center. Document origin stays fixed while panning.
- B: document X increases right and Y upward; normalized canvas X right/Y down. This uses
  Cartesian document orientation but requires consistent Y inversion in mapping/rendering,
  selection, transforms and export.

Either choice preserves logical units, region/local addressing, unbounded-looking navigation,
positive uniform scale and selected normalization. Region Y and local Y share direction.
Native hosts still convert event/view coordinates into the shared canvas convention; do not
assume AppKit orientation. RTL never mirrors artwork. Neither changes region size or scope.
Require known-point round trips, both-axis positive/negative region crossings, pan/zoom,
selection/render/export parity and native flipped/unflipped adapter checks as applicable.

The owner subsequently selected RC11-A (decision 207). The earlier empty entry was not approval.
Prepare the consolidated schema source/exact ABI/ownership/test packet; exact tested
stroke span still needs numerical evidence. Handle dragging/click offset/scale-factor UX belongs
to feature-specific UX and identified design, not an incidental architecture selection.
No schema changes, executable probes, app implementation or publication authorized here.
