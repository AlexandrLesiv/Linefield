Current scope update (2026-10-16, decision 154): launch requires en and uk on every implemented host, OS/per-app selected (browser preferences on web), no in-app switch. Earlier English-only recommendations below are historical and superseded.

# Linefield decisions before design and implementation

Review packet dated 2026-10-16. All recommendations below are pending owner review.
This consolidates choices; it does not supersede [recorded approvals](decisions.md), authorize
code, approve design review or claim competitor research complete. R IDs are discussion references,
not new acceptance IDs. Keep CT/INV/SU and task traceability in concrete decisions.

## What is already settled

Separate Linefield repository; macOS-first local developer preview; platform planning now,
other hosts later; Swift/AppKit native controls; shared Rust commands/state/editing/persistence;
Skia including the future web route; typed FFI/generated declarations instead of binary command
packets; new files without legacy compatibility. Preview tools are pen, pan/zoom, single-stroke
select/move/uniform-scale/delete, undo/redo, open/save/recovery. Keep the existing-style macOS
width/color controls in the design; other-platform color UI is not implicitly approved.

Also settled: 200 physical source-line cap, structured local redacted logs, native and shared
behavior tests, day-one i18n, Node .ts/Vite/Oxc direction, Zed tasks rather than a custom extension,
and owner approval of identified design versions before new UI implementation.

## Decide before detailed design review screens

### R01 Product priorities and reference workflows

Decision 148 records the owner's Concepts-inspired, open-source, cross-platform infinite-canvas
vector sketcher direction, MacBook first with capability-based preparation for possible future touch
hardware. Use drawing/revising/navigating/recovering ideas as initial UX research workflows within
approved preview scope. No complete Concepts parity, CAD tools, layers, asset copying or specific
license is selected. Explain alternatives before any future scope expansion.

S00C researches Concepts.app plus up to two relevant comparators against these workflows.
The owner and designer receive facts/options, not a feature-parity mandate. Confirm the primary
workflow before that study; [research handoff](research/README.md) defines evidence rules.

### R02 Document and window model

Owner selected A on 2026-10-16: one document in one window for the first macOS preview.
New/Open/close/quit use explicit dirty
handling; a failed Open preserves the current drawing. Multiwindow is a later scope.
Benefit: fewer focus, routing, lifecycle and memory interactions to validate initially.
Cost: no side-by-side documents. Keep per-session state and operation IDs so this restriction
is product scope, not a process-wide document singleton that prevents later multiwindow.

### R03 Visual direction and control organization

Recommend restrained, canvas-first native appearance: system fonts, semantic UI colors/accent,
standard menus/toolbar and visible Pen/Select controls; compact persistent settings initially.
Compare a compact toolbar/settings strip with a narrow inspector in design specifications before selecting the
layout. The strip preserves canvas space; the inspector scales better to future settings but
uses width now. Keep future tools out of current mockups. No radial palette or custom glass
framework is implied by referencing Concepts or Apple's current visual language.

Foundation approval chooses roles, hierarchy and platform mappings. Screen approval chooses
actual compositions/states. Native controls retain OS behavior; design review is a specification,
not generated production widgets. Have the designer show two scoped directions, not a large
style exploration. Accessibility, resizing and i18n variants accompany both directions.

### R04 Canvas appearance and brush behavior

Owner selected A on 2026-10-16 (decision 16): a fixed light drawing surface independent of
native chrome following the system theme. Saved stroke colors never change with that theme.
Retain width/color controls and one solid round pressure-sensitive pen: pressure changes width,
not opacity; mouse/unavailable-pressure input uses constant width. Tilt has no effect initially.
No background picker, brush library or adjustable stabilization tool is approved.

Shared Rust geometry defines stroke appearance. Decision 34 selects linear pressure-to-width
response, with selected width as maximum untransformed width and constant-width fallback. S02
reviews minimum width, normalization and zero/contact handling under the top-level document format version (decision 71).
Decision 35 selects no movement filtering, with continuous geometry and round joins/caps;
review interpolation accuracy and corner preservation separately from antialiasing. Evaluate tuning
with the Cintiq; do not silently inherit old defaults. Predictions remain transient, never saved
input. Identified design review approval and implementation authorization remain separate.

### R05 Selection, navigation and transformations

Owner selected A on 2026-10-16 (decision 17): explicit Select mode. Pen mode draws; Select
mode selects and transforms one stroke. Click/tap selects the nearest eligible stroke within
a screen-space tolerance; ties favor the topmost stroke in drawing order. Drag the selected
stroke to move. Corner handles scale uniformly about the opposite corner, including stroke
width; prevent flipping through zero. No automatic selection while drawing is introduced.

Space-drag/scroll pans; pinch zooms toward the gesture location, and menu zoom uses the viewport
center. Escape cancels an active transformation, otherwise clears selection. Focus loss cancels
unfinished transformations. Each completed move/scale is one Undo operation; cancelled/no-op
transforms add none. Native text fields retain normal shortcut/IME priority.

Exact hit tolerances, handle sizes, scale/zoom limits and device gesture mappings remain reviewed
S00/S02 specifications. Rotation, multi-select, keyboard nudging and a numeric scale field remain
out of scope. Identified design review approval and implementation authorization are still required.

### R06 Saving, recovery and export expectations

Owner selected autosave to the document on 2026-10-16, superseding explicit Save plus separate
recovery snapshots as the default. Persist completed edits asynchronously with revision-aware
SQLite transactions. Resolve pending/failed writes on navigation; no routine discard-to-open
behavior. App-managed drafts are selected for new drawings, with naming/location later. Draft retention/restoration and concrete flush/durability/exit semantics remain pending.
See [autosave policy](autosave.md). Session-only Undo/Redo is selected (decision 10); returning to the gallery ends history.
Cancelled navigation retains it; autosave does not clear it. It is not SQLite rollback.

Owner selected native document + PNG export for the preview (decision 18), correcting the initial
C response. Native export is an independent consistent snapshot without library relocation or
synchronization. S07E PNG follows reliable S06 persistence and is required for S08 acceptance.
SVG/PDF are deferred. Bounds, resolution, transparency/background, memory limits and fidelity UI
still need contracts/design review. Export does not imply image import or implementation authority.

### R07 Language and accessibility scope

English initial app/source/fallback is now owner-selected (2026-10-16). Retain pseudo-expanded
LTR/RTL readiness and locale-number, Unicode/IME and accessibility tests from the first UI.
Additional translations remain separate scope. Native resource catalogs and locale formatting
remain the direction; no universal custom message runtime or US regional-format assumption.
Decision 147 selects OS-selected app language at launch; no custom picker or live-switch feature.
Regional numeric parsing remains independently defined. A relaunch follows ordinary save/recovery
rules and does not persist undo. See [i18n](internationalization.md) and S00B.

### R08 Preview devices and support promise

Owner selected A on 2026-10-16 (decision 21): the current Apple Silicon Mac/installed macOS,
mouse/keyboard and Wacom Cintiq/Pro Pen 3 are the preview verification baseline. Record actual
hardware, OS/SDK/toolchain, tablet driver and display scale/refresh before tests. Mouse/keyboard
and tablet cases are separate evidence lanes; unavailable hardware is a coverage gap.
Propose minimum deployment OS after inspecting required APIs/toolchain. Other configurations,
including Intel/older OS, remain unverified without being deliberately blocked. Physical latency
remains pending a suitable camera; software measurements do not establish pen-to-photon latency.

## Review architecture direction now; concrete contracts before code

### R09 Responsibility split and typed boundary

Owner selected B for the crate split on 2026-10-16: editor-engine (pure commands/state/geometry/codec/scene),
editor-services (storage/recovery/diagnostics effects), editor-renderer (Skia resources/caches),
editor-native (composition and typed boundary). Swift owns native presenters/input/window/surface.
This is enough separation without a chain of forwarding crates. Structs/enums/composition are
preferred; use traits only where a real alternative or test seam needs them.

Decision 12 selects named typed native entry points, with thin wrappers into the shared Rust
dispatcher and bounded input batches. Decision 55 selects cbindgen-generated C headers from
Rust C-compatible functions/DTOs plus a small handwritten Swift wrapper for macOS. Concrete ABI
signatures/ownership and the pinned generator version remain review items. cbindgen generates headers, not safe ownership wrappers or every language's bindings;
those responsibilities remain explicit. [cbindgen documentation](https://github.com/mozilla/cbindgen).
No handwritten C behavior or UniFFI runtime is proposed. Later JNI/Wasm adapters map the same
commands; they need their own reviewed shapes, not a forced universal binary representation.

S02 must show signatures, fixed-width fields, enums/status validation, bounded borrowed slices,
opaque generation-checked handles, ownership/release, wrong-thread/stale-result rejection and
panic behavior. Compile/conformance probes follow authorization. C headers cannot by themselves
make foreign pointers safe. Generated-output drift and negative boundary tests are required.

### R10 Thread ownership and scheduling

Owner selected A on 2026-10-16: one mutable editor owner and one Skia owner on the macOS main thread initially,
frame work outside input callbacks, a bounded storage worker and an off-thread diagnostics drain.
GPU execution is asynchronous. No lock-shared document, task per sample, disk/GPU-completion
wait in input handling or callbacks reentering Rust mutation. Native events, controls and shortcuts
all dispatch the same shared commands. Keep Rust persistence policy authoritative; do not add
NSDocument as an independent undo/save state machine. Its integration can be reviewed later
with clear ownership if richer document-system behavior is needed.

Benefit: direct ordering and simpler lifetime/cancellation reasoning. Cost: CPU scene/render work
can delay main-thread input. A dedicated renderer is the contingency if measured frame work
cannot meet the reviewed budget, not a promise that a single-thread design is always fastest.
That change needs immutable scene publication, bounded latest-frame scheduling, surface safety
and owner review. Port-specific thread topologies are reviewed when each host is implemented.

```text
flowchart LR
    subgraph Main[macOS main thread]
      Inputs[Native input and controls] --> Adapter[Swift adapters]
      Adapter --> ABI[Typed Rust boundary]
      ABI --> Editor[Single editor state owner]
      Editor --> Frame[Scheduled scene and Skia frame]
      Done[Matching worker result] --> Editor
    end
    Editor -->|immutable revision| Files[Bounded storage worker]
    Files --> Done
    Editor -->|bounded redacted events| Logs[Diagnostics drain]
    Frame --> GPU[Metal GPU and presentation]
```

Historical relationship notation; no diagram renderer is required.

### R11 Document format and compatibility

Owner selected C on 2026-10-16: SQLite application document, superseding the ZIP/JSON proposal.
Persist validated samples/styles/order/transforms with top-level-format interpretation rules (decision 71). SQLite supports
transactions and incremental updates; actual save performance depends on the reviewed schema
and lifecycle. SQL inspection is available, but plain-text editing is not the format.
Review connection ownership, journaling, consistent copy/Save As, provider/Wasm access and
durability. Autosave was selected separately in R06; persisted undo remains unapproved. GPU/native state and
predictions remain transient. [SQLite application-file rationale](https://sqlite.org/appfileformat.html).

S02 freezes schema, IDs, forward-version behavior, finite f64 coordinates, units, sRGB/alpha,
transform order and encoded/expanded/parser limits. Owner selected logical canvas units in
decision 14; exact 100%-zoom mapping and numeric bounds remain S02 review items. Reject unsupported required content rather than silently
stripping it on save. The native format is separate from the rejected binary command protocol.
See [format tradeoffs](successor/formats.md); the file extension itself also awaits review.

### R12 Resource, recovery and performance budgets

Owner selected geometry/path caching first with viewport culling (decision 13, 2026-10-16).
Caches are bounded and disposable; custom canvas raster tiles require evidence and renewed review.
f64 world coordinates rebase near the viewport for GPU conversion. Cache keys include relevant
content/style/transform/algorithm versions; device-scale/zoom/color-space matter for raster
products. Eviction changes speed, never correctness. Review CPU/GPU/cache/input/history limits.

Autosave supersedes the earlier separate-recovery scheduling proposal. Decision 11 selects brief
bounded batching and flush before accepted editor exit. S02 must present exact batching/flush and
pending-write-age targets for SQLite, with actual crash-loss evidence after implementation.
No previous two/five-second proposal is accepted implicitly. Define draft/recovery retention
where applicable, error/overload handling and safe close behavior.

Set provisional numeric caps before implementing parser/queue/history allocations. Set workload-
specific performance targets on the declared host before S04 measurements, then review baselines
and acceptance thresholds before S07. Record p95/p99 input processing, frame preparation/submit,
missed frames, memory and save interference separately. Never substitute a guessed physical
latency target or adjust thresholds to conceal a regression. Exact budgets need a concrete S02
packet, not blanket approval of this walkthrough.

### R13 Reuse, tooling, security and diagnostics details

Recommend reusing only audited model/geometry tests and algorithms from the pinned old checkout,
with provenance and requalification. Rebuild composition/bridges/native wiring. Old passes do
not certify Linefield. Shared test semantics start now; factor runner helpers after a second
platform demonstrates reuse. Real native actions remain mandatory for native E2E.

Keep selected Node/Vite/Oxc and native-language gates; pin versions after compatibility checks,
not by a universal newest-version rule. S01 selects actual Swift lint/format/test tooling and
records license/dependency constraints. No new service for analytics, translations or updates.
Local structured logs are required; S02 fixes event fields, retention/byte limits and redaction
checks. Review parser limits, path handling and ABI safety as part of existing specialists'
work, not through an additional permanent security role or unapproved telemetry.

## Deliberately later decisions

Detailed non-macOS screens and scheduling, platform order after iPhone/iPad, Android XR input
capabilities, Watch network credentials/sync, export expansion, accounts/collaboration/plugins,
workbench GUI, signing/notarization/update policy, Intel/older-OS distribution support, brand
clearance and public licensing/distribution decisions. Keep portability constraints now;
these features must not block the first preview or be implemented incidentally.

## Review sequence and approval record

1. Owner reviews R01–R08 and R14 product/design defaults and R09–R13 architecture direction. Record
   chosen alternatives/conditions in decisions.md; unanswered proposals remain pending.
2. S00C provides bounded competitor evidence to owner and designer. S00A foundation inventory
   and S00B locale policy can progress in parallel; resolve findings before detailed screens.
3. Owner approves identified foundation version, then actual macOS screen/flow versions.
4. S02 presents concrete ABI/schema/topology/budgets/failure examples for owner review; draft
   alongside design so neither stream invents the other's semantics. No unseen-contract approval.
5. Obtain implementation authorization; execute the approved slices with required tests/reviews.

Exact pixels, padding and class filenames need not be preselected by the owner. Detailed designs
and engineering packets are proposed by specialists and reviewed at their appropriate gate.
No actual design or competitor report was produced by adding this document.

## R14 Navigation and motion supplement

Owner requested planning interactive platform motion and route changes on 2026-10-16.
[S00D](../tasks/S00D.md) proposes chooser/editor/viewer destinations, web hash URLs for static
hosting (clean paths if hosting supports reload fallback), native presentation equivalents,
Back/dirty guards and reduced-motion prototypes. Start destination, custom chooser scope, exact
URLs/ID lifetime and platform transition designs remain pending. Owner now selected a Procreate-like gallery/library before the canvas (decision 7/S02L).
Native file panels serve separately reviewed import/export workflows. See [navigation](navigation.md)
and [motion](design/motion.md). This request does not authorize runtime implementation.

Update 2026-10-16: R07 English initial/source/fallback is selected; additional translations remain pending. Wear OS joins the target plan via P12. Owner selected separate UX/UI roles per design/roles.md; other recommendations remain pending.

R06/R14 update: owner selected app-managed library retention and a gallery-first macOS milestone.
Unnamed drawings persist without a naming prompt; library is the normal entry screen. Use S02L
before S04. Decision 8 selects permanent deletion with confirmation, no trash/restore. Concrete
deletion failure handling and concrete native-file exchange contracts remain to review. Decision 19
selects gallery on every launch, including after crash recovery, without last-editor restoration.

## Architecture batch 1 — all policy choices approved

Updated 2026-10-16: owner approved A for Q1-8 and Q10 (decisions 86-94); Q6 additionally requires
on-demand scrolling and no loading-induced layout shifts on every platform. Q9 is now approved A
(decision 103), covering active and queued exports. Original alternatives below are review history.
The owner requested numbered batches,
with answers such as 1 A, 2 B, 3 clarify. Record each answered choice separately; clarification,
omission or approval of another question is not approval. Recommendations below are proposals,
not implementation authorization. Approved directions are recorded in decisions 86-94; exact
schema/ABI/design review remains required.

1. **Autosave SQL updates:** A (recommended) change only affected rows inside a transaction;
   B rewrite the full drawing contents each save. A reduces unnecessary work but needs explicit
   change tracking/parity tests; B simplifies persistence logic but scales poorly for large drawings.
2. **Stroke/sample deletion:** A (recommended) let a reviewed SQLite foreign-key cascade remove
   owned sample rows when a stroke row is deleted; B Rust explicitly deletes children and parent
   in the same transaction. Rust still owns authorization, Undo and edit semantics in both.
3. **Derived stroke bounds:** A (recommended initially) compute from authoritative geometry and
   keep in disposable memory caches; B also persist derived bounds for faster future loading,
   with validation/invalidation/rebuild rules. Neither replaces original sample/transform data.
4. **Transient autosave failure retries:** A (recommended) bounded automatic retries with increasing
   delay plus explicit Retry; B manual Retry only after failure. Both keep failure visible and
   obey approved memory limits. Corruption/unsupported format is not blindly retried as transient.
5. **Cached gallery thumbnail source:** A (recommended) latest durably saved drawing revision;
   B latest completed in-memory revision, even if unsaved. A can lag; B needs clear handling of
   previews ahead of durable content. Neither includes unfinished gestures or changes Saved status.
6. **Gallery opening with many drawings:** A (recommended) show validated catalog entries in
   batches and load previews progressively; B wait for the complete initial gallery load before
   displaying entries. This is normal healthy-catalog loading, not permission to publish unresolved
   identities during recovery. Both use bounded work and explicit loading/error states.
7. **Thumbnail generation scheduling:** A (recommended) prioritize visible/near-visible items and
   generate others when needed; B proactively refresh all stale previews in bounded background
   work. A reduces unnecessary work; B spends resources to prepare later scrolling. Cached previews
   can be used when valid. Neither changes the separate thumbnail-revision choice in Q5.
8. **Initial input prediction:** A (recommended) render actual samples only for the first preview,
   keeping a future transient-prediction seam; B display native-provided predictions where available,
   replacing them with actual input. B requires additional replacement/error tests and may visibly
   correct speculative tips; no custom predictor or durable predicted samples in either option.
9. **Quit during an active export:** A (recommended) normally wait for export completion, showing
   progress and an explicit safe cancel-and-quit path; B ask whether to finish or cancel on each
   quit attempt. Neither silently abandons output or labels cancellation after publication as
   rollback; shared autosave/exit guards remain independent and still apply.
10. **Cross-platform document capacity:** A (recommended) shared format-validity rules with separately
    reviewed host resource limits; B one conservative application capacity cap shared by all hosts.
    A permits larger supported workloads on capable devices but needs explicit unsupported-size
    handling on smaller ones. B is simpler/predictable but constrains capable hosts. Both preserve
    portable encoding, explicit bounded validation and no silent truncation. Exact limits remain review.

## Architecture batch 2 — approved choices B02-Q11 through B02-Q18

Updated 2026-10-16: owner answered using local positions 1-8: A for 1-7 and B for 8.
This records global Q11-17 A and Q18 B as decisions 95-102. Original alternatives below remain
review history, not competing active directions. Global numbers 11-18 identify these questions.
Record future clarification by ID;
clarification/omission is not approval. This package concerns native integration and bounded work,
not renderer selection or a new executor/thread topology. Batch 1 now has Q1-8/Q10 approved A;
Q9 is now approved A (decision 103). All batch 2 policy choices are approved; concrete contracts
and implementation remain unapproved.

Preserve existing decisions: shared Rust commands, generated cbindgen declarations, borrowed
call-scoped inputs, native-owned copied results, initial macOS main-thread editor/Skia ownership,
bounded storage/logging workers, change-driven UI queries and hybrid projections. No custom
protocol, UniFFI, new platform implementation or public SDK is implied. Concrete signatures,
capacity/lifetime contracts and platform feasibility still require S02 review after policy choices.

11. **First macOS Rust library packaging:** A (recommended) statically link Rust into the app;
    B package Rust as a separately loaded dynamic library. A keeps app/core deployment coupled;
    B creates a separate library artifact with loading/distribution compatibility to manage.
    This choice does not mandate linkage for future platforms or alter four-crate source boundaries.
12. **Host/core compatibility policy:** A (recommended initially) build/test/release the Swift host
    and Rust boundary together, with generated-declaration drift/integration checks; no guarantee
    that older host binaries work with a newer core. B maintain explicit ABI backward compatibility
    for older hosts, with version/capability negotiation and a compatibility matrix. Both remain
    typed FFI; file-format migration/versioning is separate. A is not permission for unchecked ABI
    mismatches or unstable layouts across a single build.
13. **Consistent small UI projections:** A (recommended) query all affected small groups together
    from one editor state, returning native-owned copies and a shared update identity;
    B query groups separately with revision checks and bounded retry/resync if state changed.
    Both retain decision 31's separate bounded collections and exclude canvas geometry. No second
    native authoritative state or global full-document copy. Exact structs/query mask reviewed later.
14. **Missed large-collection updates:** A (recommended initially) discard the affected native
    collection projection and request a bounded fresh snapshot/pages when a gap is detected;
    B retain bounded recent Rust changes, replay missing updates where available, otherwise resync.
    A has less replay bookkeeping; B may reduce refetch work but requires history retention rules.
    Both preserve order/identity, atomic handoff and explicit loading/stale behavior; no unbounded
    snapshot, silent missed deletion or dialog replay during state resynchronization.
15. **One-time native requests, such as file panels:** A (recommended) keep a bounded identified
    request pending until the host explicitly acknowledges acceptance; correlate later completion/
    failure separately. B atomically transfer ownership to the host when successfully read, removing
    it from the Rust pending queue; the host must track and report completion/failure. A supports
    explicit delivery tracking; B has fewer acknowledgement states. Neither invokes presentation
    inside a Rust mutation, consumes an effect on insufficient output capacity, duplicates a panel
    on retry, or promises durable exactly-once delivery across a process crash. Review identities,
    acceptance/consumption, shutdown and safe failure handling for the selected policy.
16. **Storage/background work ordering:** A (recommended) prioritize saves and exit-critical work
    over disposable thumbnail/cache work between bounded work units, with fairness to avoid starvation;
    B use a single arrival-order queue with bounded work units. A protects important pending work
    from preview backlog; B is simpler to reason about in arrival order. Neither preempts a running
    SQLite transaction, promises the one-second batching limit as completion latency, or silently
    creates another thread. Exact priorities/admission and responsiveness tests remain reviewed.
17. **Delivering worker results to the main thread:** A (recommended) process a bounded count/time
    slice per scheduled delivery, then yield/reschedule when more remain; B drain the entire bounded
    completion queue in a delivery turn. A limits burst work; B reduces scheduling steps for small
    queues but needs evidence that worst-case drain does not delay input. Both use change-driven
    wakeups, not periodic polling, and preserve semantic completion order/stale-result rejection.
18. **Concurrent export requests in the preview:** A (recommended) permit one outstanding export
    request and reject another with an explicit busy outcome until it completes/cancels;
    B accept a small bounded FIFO of export requests. A bounds retained snapshots/destinations and
    simplifies cancellation; B supports back-to-back exports with additional queue/status semantics.
    Both allow ordinary editing when otherwise valid and keep native overwrite confirmation,
    immutable capture and resource checks. Exact capacity/intent admission still needs review;
    this does not answer batch 1's quit-during-export question or add parallel export workers.

## B01-Q9 clarification — owner selected A (decision 103)

A (still recommended): Quit enters an explicit finishing-export state, permits progress/status
and a cancel-export-and-quit action, and finishes normal quit when output and independent save
guards resolve. Benefits: no recurring confirmation for short exports, usual requested output
finishes, no silent abandonment. Costs: quit can be delayed; stuck/failed work needs a visible
safe escape/status path. Do not promise that a force-quit or OS termination can finish export.

B: Quit immediately asks whether to wait for export or cancel it and quit, with a stay-in-app
path where needed. Benefits: explicit choice before waiting, useful for long jobs. Costs: interrupts
every such quit, can be unnecessary if export completes during the prompt, and still requires
completion/cancellation race handling. The dialog is not a solution to worker failure.

Both need the same cooperative cancellation/publication contract: before publication, stop at a
safe boundary and preserve an existing destination; after publication, do not delete the finished
file or promise rollback. Cancellation itself may need time. Partial staging cleanup and output
success/failure remain honest; autosave/unsaved-exit guards are independent. A default must never
silently discard edits. Concrete design review wording and cancellation implementation remain for review.

## Architecture batch 3 — approved choices B03-Q19 through B03-Q24

Updated 2026-10-16: Q19 A, Q20 A, Q21 B, Q22 A, Q23 A and Q24 A are approved as decisions
104-109. Original alternatives below remain review history. Package: input, geometry and
rendering semantics. Numbering continues globally to avoid mixing batches. No implementation or new input/
format mechanism is authorized by these proposals; preserve prior selection/scope and exact
schema/geometry/design review gates. Recommendations require fixtures and device review, not performance
claims. Q19 concerns invalid actual batches, not normal user-correctable setting rejection.

19. **Malformed actual input batch during a gesture:** A (recommended) reject the whole batch and
    cancel the unfinished interaction, preserving earlier committed work; B reject the batch and
    suspend the interaction until the host resubmits a valid replacement for that same sequence,
    or cancellation/timeout occurs. Both prevent a gap from becoming a committed stroke, preserve
    atomic validation and reject stale samples. B needs bounded resend state/protocol within the
    typed input contract, not serialized packets; cannot simply skip the batch and continue.
20. **Minimum pressure width:** A (recommended starting point) 10% of selected maximum width;
    B 5%, for a thinner light-pressure tip. Both retain the approved linear response up to 100%
    width, no new curve UI, constant selected width without pressure and contact/hover validation.
    This is a proposed initial feel, not evidence from the Cintiq. Absolute style/geometry bounds
    remain separate; contact zero/end rules still need the concrete contract.
21. **Saved sRGB channel representation:** A (recommended initially) 8-bit integer color channels;
    B normalized floating-point channels for finer intermediate precision. This chooses canonical
    document color precision, not working renderer math, another color space or new opacity UI.
    Quantization/range/alpha representation and SQL columns need concrete schema review. Future
    color-space extensions still use reviewed top-level format migration; no per-tool versioning.
22. **Selection distance:** A (recommended) measure screen-space distance to visible stroke shape,
    with distance zero for points inside it; B measure distance to stroke centerline. Apply the
    already-selected nearest-hit tolerance/topmost tie rule in both. A follows visible thick ink;
    B favors line-path proximity and may not select a wide stroke near its edge. Handle selection
    has its own reviewed precedence, not changed by this question.
23. **Move/scale and overlap order:** A (recommended) preserve existing stroke drawing order;
    B automatically bring a moved/scaled stroke to the front on successful transform. No-op/cancel
    cannot reorder. B must include any order change in the same single Undo operation. No layers,
    reorder toolbar or separate history step is implied. Native/export/render order must agree.
24. **PNG integer raster rounding:** A (recommended) use padded artwork bounds as export origin
    and round padded width/height upward to whole pixels; B round left/top outward down and
    right/bottom outward up on the world-aligned pixel grid. Both preserve geometry, one pixel per
    unit, full bounds and nominal 16-unit margins; fractional rounding may add less than one pixel
    per dimension/edge as applicable. A keeps dimensions stable under pure translation; B preserves
    world-grid alignment but fractional movement may change dimensions by a pixel. Antialiasing
    support and overflow tests remain required; neither changes empty 1920 by 1080 output.

## Architecture batch 4 — approved choices B04-Q25 through B04-Q30

Updated 2026-10-16: Q25 B and Q26-30 A are approved as decisions 110-115. Original alternatives
below remain review history. Package: quality evidence and maintenance.
These refine how existing required checks are exercised; they do not waive native E2E, designer/
independent review, privacy, threshold approval or exact-build evidence. No tools/CI/jobs are
installed or scheduled. Foreground reservation rules continue to apply. Batch 1 Q9 A and batch 3
Q19 A/Q20 A/Q21 B/Q22 A/Q23 A/Q24 A are now approved as policy, not implementation. Batch 2
Q11-17 A/Q18 B is also approved. Batch 4 policy choices are now approved; exact tooling/budgets
and implementation remain subject to review.

25. **Automated visual baseline coverage:** A (recommended initially) selected stable key states
    such as gallery loading/loaded/error and editor selection; use semantic assertions and designer
    review for remaining flows. B screenshot baselines at every suitable E2E flow step. Both retain
    required visible-render evidence, per-host baselines and reviewed tolerances. A reduces fragile
    baseline maintenance; B catches more intermediate visual changes but expands review/noise.
    Do not normalize meaningful differences or auto-accept goldens; exact OS/font/scale is recorded.
26. **Performance acceptance comparison:** A (recommended) enforce reviewed absolute budgets and
    same-host relative regression limits; B enforce absolute budgets only, reporting relative changes
    as information. A can catch regressions while still inside a ceiling but needs repeatable baseline/
    noise handling; B is simpler but allows gradual slowdown within the limit. Both require release
    builds, valid hardware/visibility conditions, raw evidence and owner-reviewed thresholds; none
    is chosen numerically here. Physical latency remains separate and no benchmark is run now.
27. **Generated/fuzz test cadence:** A (recommended) include a short bounded seeded generated/fuzz
    run in relevant background commit checks, with longer campaigns before milestones; B run fixed
    regression seeds during ordinary checks and reserve new generated exploration for explicit
    extended verification sessions. Both retain required property/fuzz coverage, reproducible failing
    seeds, crash minimization where feasible and fault tests. A finds new cases earlier at a routine
    compute cost; B keeps routine checks predictable but delays new-case discovery. No recurring
    automation, CI or foreground native run is authorized by this scheduling policy.
28. **Native E2E video capture:** A (recommended initially) collect failure screenshots/logs plus
    required visual acceptance images, and record video only for targeted gesture/motion diagnosis;
    B record video for every native E2E run. A uses less storage/recording overhead; B provides more
    complete timing/context for intermittent UI failures. Both restrict capture to disposable project
    test content, respect host permission/reservation and redact unrelated UI. Video is not physical
    pen-to-screen latency evidence; recording cannot contaminate a benchmark unless its measurement
    protocol explicitly accounts for the overhead.
29. **Test-artifact retention:** A (recommended) automatically prune eligible old successful-run
    artifacts under reviewed age/space limits, retaining review-pinned milestone evidence and
    unresolved failures; B require manual pruning, with a capacity warning and refusal to capture
    additional large artifacts at the reviewed limit. Both keep bounded storage, preserve required
    report/result provenance and never silently delete pending review/failure evidence. If protected
    evidence fills the budget, request cleanup rather than bypass it. Exact quotas remain review;
    app logs/documents/recovery files are out of scope and no existing artifacts are deleted now.
30. **Dependency update organization:** A (recommended) keep unrelated dependency upgrades in
    dedicated changes with compatibility/license/security evidence; a dependency required by a
    feature/fix may be included with an explicit rationale. B routinely combine related dependency
    upgrades with feature work, retaining the same review/tests. A isolates regressions and eases
    rollback; B reduces separate review work but mixes potential causes. Both keep pinned versions,
    existing audit gates and focused urgent security fixes. No automatic latest-version update,
    remote PR creation or recurring dependency bot is authorized.

## Architecture batch 5 — approved choices B05-Q31 through B05-Q35

Updated 2026-10-16: Q31 B, Q32 B, Q33 A, Q34 A and Q35 A are approved as decisions 116-120.
Q35 was listed twice with different answers; the owner explicitly clarified A (8-bit PNG channels).
Original alternatives below remain review history. Package: document lifecycle/recovery and
output encoding. Batch 4 is approved as decisions 110-115.
Previously selected SQLite, lossless migration with
recovery copies, source-preserving import, library ownership and floating-point sRGB are retained.
These are policy alternatives, not concrete locking/schema/ABI/security/design review implementation approval.

31. **Multiple processes accessing one managed library:** A (recommended initially) one writable
    application process owns the library; another launch reuses/activates that instance where
    supported or reports library-in-use rather than becoming a competing writer. B allow multiple
    processes editing different drawings with explicit per-document locks and shared catalog
    coordination. A simplifies recovery/in-memory consistency; B supports independent instances
    but adds ownership and crash-recovery complexity. SQLite transaction locking alone does not
    specify application ownership. OS mechanism and stale-lock/failure tests need separate review;
    no new custom interprocess protocol is selected by either choice.
32. **When to upgrade older supported drawings:** A (recommended) lazily when a drawing is opened
    or a staged import requires upgrade; B proactively upgrade all eligible drawings in bounded
    background work after the app update. A avoids touching unused drawings and concentrates the
    cost on first access; B prepares later access but consumes I/O/recovery-copy space for unused
    items. Both keep validated pre-upgrade copies, supported lossless paths, honest status and
    failure isolation. Catalog migrations and read-only metadata/preview compatibility are separate;
    no migration without the required consistent backup or approval of its exact schema path.
33. **Recovery from an available validated pre-upgrade copy:** A (recommended) offer an explicit
    restore-as-independent-drawing action, assigning fresh document/stroke identities and preserving
    the broken original; B offer explicit restoration into the original library identity, first
    preserving the damaged current file and fencing stale writes. A avoids replacing the original
    but leaves a recovered duplicate; B keeps one continuing identity but has more replacement/
    rollback complexity. Both require confirmation explaining possible loss of edits newer than
    the copy, validation and safe supported migration. No automatic salvage or routine historical
    backups are added, and a problematic migration must not be retried blindly. Exact UI/contract
    remains owner-reviewed; copies are not proof recovery will succeed.
34. **External source changes during import:** A (recommended) complete import from one coherent
    captured source revision even if the source later changes; B detect a newer source revision
    before publication and stop/retry rather than import the earlier snapshot. A has a stable
    target and avoids repeated work; B favors freshness but can keep retrying an actively changing
    file. Both preserve source bytes and reject inconsistent/unreadable input; no mix of old/new
    pages or raw live-main-file copying. S02 must review snapshot acquisition/provider guarantees
    and bounded work; B cannot promise detecting a change after its last check without extra
    coordination. Neither is live synchronization or automatic source write-through.
35. **PNG channel depth:** A (recommended initially) export 8-bit color channels; B export 16-bit
    color channels. A uses a smaller uncompressed pixel payload; B retains finer color gradations
    at higher raw memory cost. Actual compressed file size and consumer compatibility need checks,
    not guarantees. Both keep normalized floating-point native colors, sRGB, opaque background,
    fixed resolution/margins and no bit-depth picker. Conversion/rounding/color metadata must be
    specified; document values must not be overwritten by export quantization. No HDR/wide-gamut
    scope is implied. Independent decoder and representative consumer tests follow implementation.

## Architecture batch 6 — approved choices B06-Q36 through B06-Q41

Updated 2026-10-16: Q36 A, Q37 B, Q38 A, Q39 B, Q40 A and Q41 A are approved as decisions
121-126. Original alternatives below remain review history. Package: concrete export-queue policies.
Batch 5 Q31 B/Q32 B/Q33 A/Q34 A/Q35 A is approved; batch 6 policies are now approved, with
concrete durability/queue-limit scope/security/schema still requiring review.
Keep selected bounded FIFO, latest completed artwork at capture,
active-edit guards, native replacement confirmation, immutable snapshots and finish-on-Quit with
explicit safe cancellation. Choices below refine remaining admission/capture/lifetime semantics;
exact contract/schema/design review approval still precedes implementation. No new parallel export worker.

36. **Export snapshot capture time:** A (recommended) capture completed artwork when the Export
    command is accepted, before its destination panel; B capture when the user confirms the
    destination. A exports what was requested even if later edits occur, but reserves snapshot
    resources during the panel. B defers capture/resources but may include edits made while the
    panel was open. In both cases bind to the intended document/session and validate admission,
    capacity and active-interaction guards; never silently export another drawing. Cancellation
    releases reservations. No capture during rendering/dequeue that follows arbitrary later edits.
37. **Two outstanding exports to the same destination:** A (recommended initially) reject the second
    same-destination request until the first reaches a terminal state; permit a new request or
    different destination. B allow both, serialize publication and renew replacement confirmation
    where needed so later output does not silently overwrite earlier output. A is simpler and
    avoids accidental queued replacement; B supports intentional repeated snapshots but requires
    destination identity/alias/race and confirmation lifecycle rules. Existing external-file race
    protection remains required in both; path strings alone cannot guarantee target identity.
38. **One export job fails:** A (recommended) report that job's failure and continue unrelated safe
    queued jobs; B pause the queue until the user explicitly continues/cancels it. A isolates one
    bad destination; B gives time to inspect failures but blocks unrelated work. Shared faults such
    as storage/resource exhaustion may pause affected work under either option; no blind continuation
    after session isolation or corruption. Failed jobs are not silently retried/reordered/forgotten.
39. **Export queue after app crash/relaunch:** A (recommended initially) session-only queue; do not
    automatically resume unfinished exports after restart. Already published outputs stay intact;
    staged output cleanup must be safe, but no promise to reconstruct lost in-memory requests.
    B persist queued job intent and immutable source data, then reconcile/resume after restart.
    B adds durable job storage, privacy/retention, duplicate-publication and migration complexity;
    it requires a separately reviewed design, not a custom protocol implicitly. Normal Quit still
    follows decision 103 under both; this question concerns interruption outside orderly shutdown.
40. **Navigate away from the drawing while its export is running:** A (recommended) allow normal
    gallery/document navigation while accepted exports retain their immutable source snapshots;
    B finish/cancel that drawing's exports before leaving its editor. A avoids tying the editor to
    a background operation but needs app-scoped status/cancellation and strict resource ownership;
    B simplifies lifetime but delays navigation. Existing unsaved-edit guards always apply. This
    does not settle deletion of a source drawing or add a new progress screen without design review.
41. **Initial export queue count limit:** A (recommended) three accepted exports total (active plus
    waiting/reserved jobs); B ten total. Both require an additional aggregate byte/work cap, explicit
    admission failure and bounded handling of destination panels/snapshots. A provides a modest
    queue; B supports larger bursts at more potential retention cost. One worker remains selected;
    neither choice permits parallel rendering jobs or bypasses resource bounds. Exact byte limits
    and measurements remain required before implementing the queue.

## Architecture batch 7 — all choices approved

Updated 2026-10-16: Q42 activate existing window first, otherwise in-use explanation; Q43 A,
Q45 A, Q46 A and Q47 A are approved as decisions 127-131. Following the portability clarification,
Q44 A is now approved as decision 139. Original alternatives below are retained for history.
Package: multi-process coordination and proactive migration. Keep multiple processes/different drawings,
one mutable owner per drawing and current thread topology. These choices specify policy only;
exact OS mechanisms, database claims/locks, privacy/trust and design review require review. No new custom
IPC protocol, daemon or background agent is approved by proposing these alternatives.

42. **Opening a drawing already owned by another process:** A (recommended initially) report
    already-open/in-use and refuse a second editor; reuse/focus the owning instance where safely
    supported. B allow a separately labelled read-only snapshot view in the second process, with
    a separately reviewed refresh policy. A avoids stale duplicate views/new mode; B enables viewing
    but adds snapshot freshness/accessibility/UI work. Neither permits two writers or automatic
    takeover. B would approve additional read-only macOS design scope, not implementation.
43. **Background upgrade finds an actively owned drawing:** A (recommended) defer that drawing
    until its owner closes/releases it; continue eligible unrelated upgrades. B ask the owner to
    save/close so upgrade can proceed sooner, respecting cancel and pending-save guards. A avoids
    interruption but an upgrade can remain pending; B reaches current format sooner but interrupts
    editing and requires reviewed cross-process request/UI. Neither replaces a live file forcibly.
44. **Who performs proactive drawing migrations:** A (recommended initially) one participating
    process coordinates library maintenance at a time, with reviewed takeover after it exits;
    B distribute per-drawing jobs among participating processes using exclusive claims and a shared
    resource budget. A has simpler concurrency/resource control; B can increase throughput but adds
    claim/fairness/recovery complexity. Both require exclusive catalog schema/rebuild authority,
    per-document ownership and crash-safe job progress. No separate service or new threads implied.
45. **Editor unexpectedly loses verified write ownership:** A (recommended) immediately pause new
    mutations and persistence, retain the in-memory work and report ownership loss; B allow bounded
    in-memory editing while attempting ownership recovery, without writing the contested file.
    B preserves interaction continuity but can create divergence requiring explicit recovery rather
    than automatic overwrite. Both preserve accepted work where possible, reject stale writes and
    revalidate on reacquisition. Neither permits lost-owner autosave or silently merges edits.
46. **How other processes learn about catalog changes:** A (recommended) use platform-supported
    cross-process notifications as advisory wakeups, then read/validate authoritative catalog state;
    B use filesystem change notifications as advisory wakeups, then perform the same validation.
    A provides application-level signals but needs host-specific setup; B depends on filesystem/
    sidecar observation and may produce extra/missed signals. Both require bounded coalescing,
    lifecycle/focus catch-up, validated generations and failure handling; neither treats an event
    payload as authority or uses periodic UI polling. Review exact supported native mechanisms;
    no arbitrary document data, custom serialized command channel or unauthenticated mutation API.
47. **Deleting a drawing currently open in another process:** A (recommended initially) refuse
    deletion with an in-use explanation until that process releases it; B request a coordinated
    close through the owner's normal save/cancel guards, then delete only after verified release
    and valid confirmed deletion intent. A is simpler but requires a manual close; B is more
    convenient but adds cross-process UX and race handling. Never infer consent from a notification,
    force close/discard, delete beneath an active owner or bypass durable deletion intent.

## Architecture batch 8 — approved choices B08-Q48 through B08-Q54

Updated 2026-10-16: Q48 A, Q49 A, Q50 A, Q51 A, Q52 A, Q53 A and Q54 B are approved as
decisions 132-138. Original alternatives remain review history. Package: durable export recovery
and multi-process queue scope. Batch 7 is now fully approved. Preserve accepted capture timing,
immutable job source, native consent, bounded FIFO, normal Quit behavior and completed-output
preservation. The exact schema source/schema/access/locking mechanism still requires review; no implementation.

48. **Durable export metadata storage:** A (recommended) a separate SQLite job database, with
    immutable drawing snapshots in a dedicated managed area using the reviewed Linefield snapshot
    representation; B job tables in the library catalog, with those snapshots stored separately.
    A isolates jobs from catalog rebuild and browsing migrations, but adds a database lifecycle;
    B reuses catalog infrastructure, coupling job recovery to catalog health. Both require separate
    job schema review, bounded cross-file preparation/publication and no raw live-main-file copies.
    No custom binary snapshot format, database implementation or actual directory is created.
49. **When to persist the captured snapshot:** A (recommended) after destination confirmation,
    keeping the accepted snapshot in bounded memory while the panel is open; show preparation until
    durable job acceptance. B persist before/while the destination panel is shown, enabling recovery
    of a source even when no destination was confirmed. A avoids disk work for canceled panels;
    B retains more interrupted preparation but needs an awaiting-destination recovery state and
    retention rules. Both capture at accepted command time; before durable acceptance no promise
    of restart recovery. Resource reservation/cancellation applies regardless of persistence timing.
50. **Restart with safely resumable jobs:** A (recommended) automatically resume jobs whose source,
    ownership, destination access and publication/consent state are valid; pause uncertain or
    changed-target jobs for action. B present recovered jobs and require Resume before processing
    any of them. A minimizes intervention; B gives explicit control over external writes after
    relaunch. Neither blindly retries a potentially completed overwrite or bypasses replacement
    confirmation. Permission expiry and missing/corrupt source remain explicit failures/states.
51. **Destination changed since replacement approval:** A (recommended) pause that job and request
    fresh confirmation or a different destination; B fail that job and require a new export request.
    A can finish the original captured intent; B has a simpler terminal result but may require
    recapture/new work. Neither overwrites without consent. Unrelated safe jobs may continue under
    decision 123, but same-destination dependencies remain ordered. Concrete provider race handling
    cannot be replaced by a single check-then-write assumption.
52. **Snapshots after terminal jobs:** A (recommended) release/delete job-only source snapshots
    after safe durable terminal reconciliation and retention of the required bounded outcome record;
    B retain completed/failed/canceled snapshots for a reviewed short retry period. A limits hidden
    drawing copies and storage; B enables retry from exact older content but adds retention/privacy
    and UI semantics. Bounded outcome metadata is not an unlimited export-history feature. A cannot
    delete sources still referenced by another job or an unresolved publication; failed-job retry
    implications must be explicit. Exact quotas/cleanup permissions remain concrete review items.
53. **Delete a source drawing with outstanding exports:** A (recommended) explicitly confirm
    cancellation of its outstanding export jobs as part of the deletion flow, then coordinate safe
    cancellation/ownership and deletion; B delete the library drawing while accepted independent
    export jobs retain snapshots and may still finish/resume. A avoids unexpected later copies of
    a deleted drawing; B honors exports as independent previously accepted work. Both preserve
    already-published external outputs, retain normal deletion confirmation/durable intent and
    resolve races safely. This is not secure erase or permission to remove exported destination files.
54. **Scope of the three-job cap across processes:** A (recommended) three accepted jobs total
    per managed library, enforced through reviewed cross-process admission/claims; B three per
    process, allowing more total jobs when several app instances run. A bounds shared queue storage
    and pending work more predictably; B gives each process independent capacity but needs additional
    global resource protection. Both count active/waiting/reserved jobs and retain byte/work bounds.
    No worker topology, global renderer or unbounded recovered-job deletion is implied.

## B07-Q44 platform clarification — A approved as decision 139

A means one logical maintenance coordinator at a time, not a permanent process or daemon. B
means distributing migration work across concurrent participants. B is not required for portability.
The owner selected A with durable progress and reviewed ownership transfer after exit/interruption; never
steal an active claim solely because its owner is slow or suspended. Storage fencing remains required.

Suggested host mappings, subject to concrete platform contract review:

- macOS/Windows/Linux: one eligible existing app process coordinates; other processes may edit
  different drawings. No separate service or new thread topology is implied.
- iOS/iPadOS/visionOS: coordinate within the app's permitted lifecycle; checkpoint/resume when
  execution ends. Do not require arbitrary concurrent app processes or perpetual background work.
- Android-family hosts, including the Android-on-ChromeOS route: one logical coordinator;
  platform-scheduled resumable work is a candidate. WorkManager unique work can avoid duplicate
  scheduling but is not by itself the complete database ownership/fencing contract.
- Web/ChromeOS browser route: a participating tab/worker may coordinate under an exclusive
  same-origin lock where supported. A lock does not keep a suspended tab executing or persist jobs.
- Viewer/watch/TV targets: apply only to app-owned storage that actually needs migration; do not
  modify external source documents. Execution is foreground or explicitly supported scheduled work.
  Verify APIs/availability per target SDK; no blanket background capability across Apple/Android OSes.

Apple documents limited/system-scheduled background execution in
[Background strategies](https://developer.apple.com/documentation/backgroundtasks/choosing-background-strategies-for-your-app).
Android documents unique scheduling and stopped-worker handling in
[Managing work](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/manage-work).
[W3C Web Locks](https://www.w3.org/TR/web-locks/) defines same-origin exclusive coordination across
participants. These support the proposed mapping; they do not select a concrete adapter or prove
Linefield runtime behavior. Decision 139 approves A; concrete adapter review remains required.

## Architecture batch 9 — approved choices B09-Q55 through B09-Q58

Updated 2026-10-16: Q55 A, Q56 A, Q57 B and Q58 A are approved as decisions 140-143.
Original alternatives remain review history. Batch 7 Q44 A is approved as139; batch 8 as132-138.
Package: library naming and metadata. Existing duplicate-name allowance, durable document
metadata authority, unchanged artwork on rename, gallery paging and no-loading-shift rules remain.

55. **Scope of automatic Untitled numbering:** A (recommended) one coordinated sequence per managed
    library across app processes; B independent persistent instance sequences, allowing repeated
    automatically assigned names across instances. A makes Untitled, Untitled 2, etc. predictable
    across windows but requires transactional allocation; B reduces shared allocation coordination
    but repeats labels. Neither makes names identity keys, forbids explicitly chosen duplicates,
    reuses deleted/renamed numbers or promises gap-free numbering. First label remains Untitled.
    Concrete counter crash/rebuild recovery remains schema review, not guessed from visible names.
56. **Where a newly imported drawing appears:** A (recommended) at the top as a newly added library
    item, then normal content-edit recency applies; B sort immediately using the source drawing's
    retained content-edit timestamp, possibly far down the library. A makes the import easy to find
    but adds an explicit arrival-order exception; preserve honest source timestamps separately.
    B keeps strict content-date ordering but can hide a successful import in an older position.
    Neither changes source artwork, fabricates a historical edit or makes ordinary opening/renaming
    reorder existing drawings. Exact ordering keys/ties remain concrete review work.
57. **Rename a drawing owned by another process:** A (recommended initially) refuse with an in-use
    explanation until release; B coordinate a rename request through the owning editor's shared
    command dispatcher and report success only after durable metadata confirmation. A avoids a new
    cross-process mutation path; B permits convenient gallery rename while the drawing is open but
    needs a separately reviewed command/acknowledgement/trust contract. Neither edits only the catalog
    copy, bypasses interaction guards, invents IPC or lets two processes write the drawing file.
    Renames within the owning process already use shared Rust behavior.
58. **Whitespace around user-entered drawing names:** A (recommended) remove leading/trailing
    whitespace when committing a name, preserving internal spaces and Unicode; B preserve edge
    whitespace exactly. A avoids visually indistinguishable accidental names; B preserves literal
    user input but can produce confusing labels. Both reject empty/whitespace-only names, use native
    IME completion, retain valid international text and enforce reviewed single-line/length rules.
    Do not normalize legitimate text or direction marks as an incidental validation shortcut.
    Display names remain metadata rather than managed filesystem paths. Apply to rename/new naming;
    imported metadata validation is separate and must not silently rewrite source names.

## Remaining review scope estimate (2026-10-16)

All issued numbered questions Q1-61 are answered after Q60 A (decision 146). Earlier estimates of
5-10 or 3-8 remaining questions were provisional, not a fixed backlog. Do not invent more batches
to meet those estimates. Remaining reviews are the concrete packets listed below, plus the owner's
S00E/F/G agenda. Only ask further policy questions where those reviews reveal a real owner tradeoff.

Then stop generating small implementation-choice questionnaires. Specialists should consolidate
concrete proposals for owner review: schema source/schema and storage state transitions; typed ABI/ownership/
platform mechanisms; numeric resource/performance budgets backed by probes; and identified design
foundations/screens/motion. These are separate approval packets, not counted as A/B questions or
already approved work. Later-platform features/distribution/network choices remain deferred. Detailed
values such as control dimensions, retry timing and SQL indexes belong in those proposals, not an
unbounded owner questionnaire. Existing documentation-only authorization remains in force.

## Architecture batch 10 — all choices approved

Updated 2026-10-16: Q59 A with future-cloud planning is decision 144; Q61 A is decision 145.
Q60 A is now approved as decision 146: no application-level encryption for the first preview.
Package: first-preview storage/security. Batches 7-9 are fully answered. These options concern initial macOS scope;
no system security changes, credentials, dependencies or entitlements are applied by the proposal.

59. **Location of the live managed library:** A (recommended initially) one app-managed local
    location, without a library relocation setting; external folders are import/export destinations.
    B let the user choose/relocate the live managed library to another supported local folder/drive.
    A bounds permissions, missing-volume and ownership cases; B adds capacity/location control but
    requires safe relocation, access persistence, volume removal and filesystem qualification.
    Neither authorizes live SQLite libraries in network shares/cloud-sync folders, multiple library
    UI or accounts/sync. Exact app-container directory is part of the concrete platform proposal.
60. **Application-level encryption for the first preview:** A (recommended initially) no additional
    Linefield database encryption or app password; use OS access controls and whatever disk/device
    encryption the user has enabled. B add app-managed encryption for private local library/job/
    recovery data, with key lifecycle and unlock/recovery design reviewed first. A keeps the selected
    SQLite direction simple but files are not independently protected from someone with sufficient
    filesystem access. B can protect data at rest but adds dependency, key loss/recovery, temporary
    file and cross-platform costs. B does not implicitly choose a crypto library, custom cryptography,
    encrypted interchange format or cloud security model. Exported PNG/native copies require their
    own explicit handling; never imply they are protected by local-library encryption.
61. **macOS App Sandbox timing:** A (recommended) use App Sandbox from the first runnable preview,
    with only necessary entitlements and user-selected import/export access. B start with an
    unsandboxed local developer preview, retaining narrow adapters, and add sandboxing before
    distribution. A exposes container/access/bookmark and cross-process feasibility issues early;
    B reduces immediate setup but leaves permission/storage integration to be revalidated later.
    A requires an early build/entitlement feasibility probe with available signing resources;
    report blockers instead of silently disabling protections or buying services. Neither grants
    broad filesystem permissions or authorizes modifying macOS security settings. Test-runner
    automation permissions and application sandboxing are distinct.

Apple describes App Sandbox as restricting access through entitlements and provides container/file
access guidance in [Protecting user data with App Sandbox](https://developer.apple.com/documentation/security/protecting-user-data-with-app-sandbox)
and [Accessing files from the macOS App Sandbox](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox).
These support the recommendation to evaluate sandbox constraints early; they do not establish that
Linefield's planned Skia, multi-process and durable-export paths have already passed those checks.

## Q60 safe-handling clarification — historical options; A selected in decision 146

Q60 is now A. The first-preview policy uses already-approved App Sandbox,
app-managed local storage, least privilege, redacted diagnostics and review of backup/thumbnail/
recovery/export-job handling. OS disk encryption can protect a locked/stolen device, but must not
be assumed enabled or claimed to encrypt exported copies independently. Sandbox limits application
access; it does not itself encrypt SQLite or protect against every authorized/compromised process.

If independent protection of copied database files is a first-preview requirement, prefer B with
an established encrypted SQLite implementation (SQLCipher is a candidate, not selected/installed),
random data keys protected by platform credential/key facilities, and a separately reviewed key
hierarchy/unlock/recovery policy. No hardcoded key, key beside database, home-grown crypto or password
hash used as a data key. SQLCipher leaves durable key management to the integrating application.
Verify supported Rust/native builds and browser alternatives; do not promise desktop Keychain or
SQLCipher integration is automatically available/equivalent on every target.

Review the entire persistence surface: catalog names/metadata, drawing DBs and WAL/journals,
pre-upgrade copies, thumbnails, temporary files, job DB/source snapshots, backups and test artifacts.
Encryption of one DB does not protect unrelated files. Explicit PNG/native exports may be plaintext;
communicate scope rather than silently changing the selected interchange format. Key unavailability
must not be treated as corruption: no blank replacement, automatic catalog rebuild from locked data,
key regeneration over existing data or plaintext fallback. Test wrong/lost key, lock/unlock, crash
through migration/rekey, backup restoration and denied access before claiming protection. Expensive
unlock/derivation/storage work must not block ink callbacks. No measured performance claim yet.

For cloud later, distinguish transport security, provider-held encryption and end-to-end encryption
(E2EE). Local SQLCipher is not a sync protocol or E2EE. If the cloud provider must not read drawings,
review a client-held key hierarchy, encrypted payloads/metadata scope, device enrollment/revocation,
sharing, browser threat model and recovery before selecting a provider/schema. Password reset does
not inherently recover E2EE keys; metadata exposure and compromised unlocked clients remain relevant.
Choose that policy before cloud implementation, not necessarily before this local preview. Current
approval requests future cloud planning; it does not authorize any particular trust model.

Sources checked 2026-10-16:
- [Apple FileVault](https://support.apple.com/guide/security/volume-encryption-with-filevault-sec4c6dc1b6e/web)
- [Apple Keychain services](https://developer.apple.com/documentation/security/keychain-services)
- [SQLCipher design](https://www.zetetic.net/sqlcipher/design/)
- [SQLCipher key responsibility](https://www.zetetic.net/sqlcipher/database-key-material/)
- [SQLite WAL constraints](https://www.sqlite.org/wal.html)

The owner selected A (OS protections for preview, no app-level encryption). B and the discussed
key hierarchy remain unselected alternatives. Future cloud security is reviewed separately;
no implementation or encryption framework is authorized by discussing safe practice.

## Owner-requested next review stages (2026-10-16)

After remaining current policy decisions, execute S00E security, S00F cross-platform input and S00G
store/distribution requirements reviews. Review their cross-cutting findings before freezing relevant
design review/contracts. Q60 remains unanswered; this agenda does not choose encryption. Do not manufacture
additional questions to reach earlier count estimates. Prepare concrete review packets rather than
an unbounded series of details.

The owner requests thorough consideration of day-zero security and whether a separate agent helps;
all-platform shortcuts/gestures/device support with shared Rust behavior/binding data; and store
eligibility rules plus role ownership. Proposed direction: shared action/availability/state and typed
platform binding profiles, native acquisition/IME/OS precedence. Exact schema/profile ownership is a
review proposal, not adopted code. Security/store role changes need a recommendation before adding
agents; existing engineers own implementation, designers own flows/presentation. Research official
current store requirements when S00G executes; this note asserts no current compliance.

## Current outstanding review inventory after decision 146

No numbered batch question remains unanswered. Do not claim that all architecture/design is final.

1. Product direction is now clarified by decision 148: Concepts-inspired open-source cross-platform
   infinite-canvas vector sketching, MacBook first, without feature-parity or future-hardware promises.
   UX research/design still needs review; exact open-source license remains unselected.
2. S00E security: threat boundaries, untrusted imports/IPC/FFI, privilege/secret/artifact handling,
   negative tests and whether scoped security-specialist support is warranted. Respect Q60 A.
3. S00F input: actual per-platform keyboard/gesture/device mappings and shared Rust binding contract,
   native focus/IME precedence and capability gaps; owner reviews consolidated matrix.
4. S00G distribution: current official channel requirements and day-zero implications, intended
   channels and role ownership. Actual enrollment/publishing stays deferred and separately approved.
5. S02 technical packets: schema source/schema, typed signatures, ownership/rename transport, crash-safe
   persistence/export coordination, name allocation/import ordering and lifecycle transitions.
   Exact mechanisms require review; policy-level approvals are insufficient to implement them.
6. Measured/provisional engineering settings: input/zoom/selection tolerances; memory/queue/history/
   cache/export caps; retry/scheduling/checkpoint policy; performance targets; actual toolchain and
   minimum macOS; browser persistence feasibility. Specialists propose grouped justified defaults
   and probes, preserving already selected numbers. No arbitrary demand for the owner to invent them.
7. design review: foundations and gallery/editor/export/recovery flows, native controls/layout, exact fixed
   light canvas color, adaptive/i18n/AX/motion and identified versions. Decision 147 now selects
   OS-selected supported language at launch; English source/fallback remains selected.

Proceed with S00E/F/G review preparation now that the numbered policy round is complete. Bring
material choices back in coherent proposals. Existing documentation-only authorization still
prohibits runnable app/dependencies/runtime implementation until the owner authorizes it.

S00E execution update: security architecture proposal v1 is in security/day-zero-review.md and
security/gates-and-response.md, with read-only Rust/storage and macOS capability specialist input.
Independent review and owner disposition are tracked separately. The proposal recommends existing
implementers plus scoped independent security review, not a permanent security implementer. Do not
silently configure a new role. S00F/S00G remain queued, not completed by S00E research.

S00E independent assessment is now recorded in security/review-record.md: packet suitable for owner
review, no blocking findings; task-status issue resolved. No new security role/mechanism adopted.
Runtime protections are unverified. S00F/S00G remain queued.

## Current S00F/S00G handoff (supersedes queued notes above)

Read [input proposal](input/README.md) and [distribution register](distribution/README.md), checked
2026-10-16. Platform engineers researched feasibility; scoped UX findings were incorporated. Review
records are linked from the packets. Owner has not selected the new binding/touch defaults or channels.
Next: review input defaults as one coherent package, then prepare UX briefs/design review foundations/gallery
and concrete S02 contracts. Store chores do not require another long micro-question batch now.
No implementation, design review artifact, store compliance test or native device execution occurred.

Latest owner direction (151–152): use docs/input/inventory.md during feature design, with UX proposing behavior for owner approval alongside design review. Do not seek global binding approval now. watchOS/tvOS/Wear OS/Android TV are view-only; Wear capability is no longer undecided.

S00G current review: [channel strategy](distribution/channel-strategy.md) separates the selected local preview from recommended public channels, current requirements, early architectural constraints and existing-agent responsibilities. No channel/publication/packaging implementation approval inferred.
