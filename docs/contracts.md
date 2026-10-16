Current scope clarification (163–165): one authoritative document mutation owner may serve multiple local editing clients. Scope interaction cancellation, viewport/selection and reviewed history per client. See architecture/incremental-collaboration.md and S02M. Future cloud conflicts initially use warning + explicit version-checked replacement. No custom command codec or new schema approved.

# Shared contract catalog

Status: documentation requirement accepted for planning on 2026-10-16. The concrete signatures,
schemas, resource limits and thread topology still require S02 owner review. No API or test
implementation exists. A contract catalog does not authorize a new protocol.

Contracts define shared behavior; native/JNI/Wasm adapters express it through typed calls.
There is no serialized command packet layer. Generated declarations describe language
boundaries; a saved document schema is a separate contract with separate evolution rules.

## Contracts and ownership

| ID | Contract | Required definition and negative cases | Owner and acceptance |
| --- | --- | --- | --- |
| CT-01 | Commands and capabilities | Typed intents/arguments, availability, validation, outcomes/effects, revision changes and transaction grouping; reject unsupported viewer commands without mutation | rust_engine; SU-02, SU-05, SU-06 |
| CT-02 | Interactions and input | Begin/update/end/cancel states, actual/corrected/predicted ordering, pressure presence, batch atomicity, coordinate units and transform anchors; invalid/reordered samples, focus loss and remaps | rust_engine with native implementer/designer; SU-03–SU-08 |
| CT-03 | State and queries | Single mutable editor owner; document/session/viewport/prediction separation; immutable UI projections, stable IDs/revisions, observer lifetime and bounded publication; stale queries/results | rust_engine; SU-02, SU-10, SU-13 |
| CT-04 | Typed language boundary | Generated declarations, fixed-width types, validated tags, borrowed/owned buffers, handles, explicit release, errors, panic containment, thread affinity and cancellation; stale/reentrant/wrong-thread calls and insufficient output capacity | rust_engine, reviewed by host implementers; SU-13, SU-18 |
| CT-05 | Persistence and recovery | Document schema/version/capabilities, validation limits, dirty/save revision semantics, staged replacement, concurrent-write order, Open/Save As failure and recovery freshness/retention; truncated/hostile files, disk errors and late completion | rust_engine plus native host; SU-09–SU-12 |
| CT-06 | Rendering and caching | Immutable scene input, f64 world coordinates/viewport rebasing, scene generations, invalidation, surface/device ownership, cache keys/limits, overload and frame retirement; stale scenes, eviction, resize/display changes and device loss | rendering_performance with rust_engine/native host; SU-14, SU-16 |
| CT-07 | Diagnostics | Event names/schema, severity, origin/request/session/operation correlation, durations/outcomes, privacy, retention, bounded sink behavior; redaction, sink failure and overload | build_reliability infrastructure; each implementer instruments; SU-15 |
| CT-08 | Testability and evidence | Stable accessibility IDs, deterministic fixtures, observable outcomes, isolated setup, test discovery, scenario/capability mapping and result schema; missing/skipped/stale evidence and disabled production test controls | build_reliability with all implementers/designer; SU-01–SU-20 where applicable |
| CT-09 | Internationalization and localized presentation | Stable semantic action/error/message mappings and typed arguments; native resources, locale/region separation, numeric parsing, fallback, Unicode/IME/RTL and invariant file semantics | rust_engine + host implementers, designer and build_reliability; SU-20, SU-07, SU-09 |

Lead owns cross-contract consistency. One assigned owner changes each concrete contract.
Platform engineers review feasibility before freezing it. Reviewer checks contracts against
actual implementation and evidence. Designer validates user-visible behavior, not ABI safety.

## Contract review packet and lifecycle

Each contract document must include:
1. Purpose, consumers, owner, revision/status, approval reference and non-goals.
2. Concrete types, examples, allowed transitions and observable postconditions.
3. Preconditions, invariants, rejected inputs and error/effect semantics.
4. Ownership, allocation, thread/reentry rules, cancellation and shutdown where relevant.
5. Bounds on memory, queue depth, document size/history, caches and processing work.
6. Native/Wasm feasibility, viewer capabilities and host-specific exceptions.
7. Compatibility/change rules, removal plan and conformance fixtures/test IDs.

Stages: proposed → owner-reviewed where required → implemented → verified on named consumers.
A generated header does not itself establish behavioral parity. Keep schemas/interfaces
versioned; changes to material ABI/schema/ownership/security choices require renewed review.
New APIs must not silently duplicate old state owners. Native document compatibility starts
with Linefield v1, not Native Sketch; define future version rejection/migration policy explicitly.

Resource policy must include undo/history and immutable snapshot retention, not just GPU
caches. A bound may reject a new operation visibly or prune history under an approved policy;
it cannot silently corrupt the current document or falsely promise unlimited undo. Review
recovery eviction so a quota does not delete the only usable recovery copy without policy.

## Mandatory invariant checklist

| ID | Invariant | Conformance evidence |
| --- | --- | --- |
| INV-01 | Only the authoritative coordinator mutates document state; client interactions are scoped and late results cannot affect another session | Owner/thread/generation tests |
| INV-02 | Actual samples retain order; corrections are validated; predictions never become durable | Input property tests and saved-document checks |
| INV-03 | Invalid input batches reject atomically | Before/after semantic equality and revision assertions |
| INV-04 | Cancel restores committed state; one finished stroke/move/scale is one undo; no-op adds none | Transaction/undo tests plus native gestures |
| INV-05 | Shortcuts and controls share commands; native text editing retains priority | Command conformance plus real native focus E2E |
| INV-06 | Save completion for revision N cannot clean N+1; cancellation cannot undo an already completed replacement | Deterministic worker races and native save workflows |
| INV-07 | Failed Open leaves the current drawing intact; explicit recovery restore creates a separate managed drawing through the import lifecycle | Codec/service faults plus native failure/recovery E2E |
| INV-08 | Render/cache work cannot mutate document state; eviction affects performance only | Cold/warm/evicted render equivalence and revision checks |
| INV-09 | Diagnostics reveal no private drawing data and sink failure cannot fail an edit | Schema/redaction/overload tests |
| INV-10 | Viewer capability limits are enforced in shared behavior, not just hidden controls | Rejected editing commands and viewer UI assertions |
| INV-11 | UI language, region and direction do not change command IDs, artwork geometry, canonical document semantics or logging privacy | Locale-specific host input/resource tests plus core/file invariance and native RTL/IME E2E |

## Conformance is distinct from E2E

Share fixture definitions and semantic expectations across direct Rust tests and implemented
native/JNI/Wasm adapters. Check actual outcomes, not only marshaling or generated signatures.
Use unique deterministic seeds and explicit tolerances; retain sample order, ID relationships,
transforms and schema semantics. Never normalize away a meaningful failure.

Core tests prove shared behavior. Boundary conformance proves translation/lifetimes. Replay
proves deterministic input/scene behavior. [Shared E2E scenarios](testing/shared-e2e.md)
prove real controls, gestures, focus, lifecycle and files reach that behavior. All are needed;
one green layer does not certify the others or an unimplemented platform.

CT-07 detail: [structured logging](logging.md). CT-08/action evidence reuse: [developer experience](developer-experience.md). Concrete schemas remain S02 review items; Zed tasks are a launcher integration, not an app command protocol.

CT-09 detail: [internationalization](internationalization.md) and [locale test matrix](testing/internationalization.md). Native formatting/parsing is presentation; Rust validates typed canonical values. No translated command packets or finished-English-error parsing.

## Navigation and motion contract supplement

[Navigation](navigation.md) extends CT-01/CT-03/CT-05 with typed destination requests,
guard/operation identity, pending versus accepted state, revision-safe leave/open and restoration.
CT-02 covers gesture settlement; CT-07 logs redacted route kinds/outcomes; CT-08 maps real host
[route/motion scenarios](testing/navigation-motion.md); CT-09 covers localized/RTL presentation.
Host route stacks/URLs are presentation; shared Rust keeps document/capability policy. Motion
is disposable presentation, never a second mutable document owner or commit timer. Concrete
identity/ABI/guard changes require S02 review; no new transport/router framework is approved.

Autosave selection: [policy](autosave.md) supersedes manual-Save defaults. INV-06 still tracks
current versus persisted revisions. For INV-07, recovery-as-unsaved-copy means explicit salvage/
recovery candidates, not normal SQLite transaction recovery on reopening the autosaved file.
No second recovery journal or persisted undo is implied.

Decision 10 refines CT-01/03/05: Undo/Redo stacks belong to one live editing session. Autosave,
focus changes and native dialogs preserve them; accepted gallery return/document replacement/
close ends them. Cancelled or failed navigation preserves the session/history. Reopen restores
saved content, never past Undo/Redo stacks. Require bounded in-memory history and explicit command
availability; do not use SQLite rollback as the implementation of committed-edit Undo.

Decision 12 refines CT-01/03/04: named native typed functions map to authoritative Rust commands/
queries, not independent editing implementations. Batch actual input across the boundary within
reviewed bounds. Native, future Wasm and future agent adapters share semantic validation,
transaction/revision behavior and correlated diagnostics; the C ABI is not a universal transport.
S02 records a function-to-command/query mapping and proves parity/rejection behavior. Future AI
permission checks are a separate gate before domain dispatch, not inferred from command validity.
Concrete signatures, memory/thread rules and generator selection still require owner review.

Decision 13 refines CT-06/INV-08: bounded prepared-vector geometry/path caches and viewport culling
first. Cache keys include relevant content/style/transform/algorithm versions; culling includes
stroke extent and rendering support margins. Cold/warm/evicted paths must agree visually within
reviewed tolerances and preserve canonical state exactly. Spatial indexes/caches are rebuildable,
not document serialization. S02 reviews numeric budgets and f64-to-render coordinate conversion.
Custom canvas raster tiles are deferred pending measured evidence and owner review; ordinary render
surfaces and separately scoped library thumbnails are not a raster-tile strategy.

Decision 14: logical canvas units are authoritative across CT-02/03/05/06. Native point/pixel input
is converted through the viewport before shared commands; renderer conversion does not mutate
stored geometry. Decision 79 maps one canvas unit to one native UI point at 100% zoom (AppKit
points on macOS), with backing scale applied only for raster pixels. Finite f64 representation
(decision 33), viewport rebasing,
coordinate/zoom limits and invalid-value/overflow rejection require S02 review. Test screen/world
round trips at reviewed tolerances, display-scale changes, extreme supported positions and
cross-host fixture parity. No claim of physical millimeter correspondence or unlimited coordinates.

Decision 15 refines CT-01/02/03/05/07: save failure permits bounded continued editing, followed by
safe mutation pause before capacity is exceeded. Shared command availability exposes the pause;
native input/control adapters cannot bypass it. Preserve accepted edits, failure visibility,
revision correlation and guarded exit. S02 defines active-gesture headroom, rejection/cancellation,
retry/backoff and resumption. Test stale completions and memory/queue bounds; no silent sample or
committed-edit loss. Inspection/retry controls stay available without granting unguarded navigation.

Decision 25 refines CT-02/CT-03/CT-05/CT-06 and INV-04/INV-08: move/scale preserves original
sample coordinates and updates current translation/positive uniform scale. Apply identical
shared semantics to geometry, width, selection, culling and PNG export; invalidate affected
caches. Session-only history stores reversible operations without becoming the document format.
Exact numeric/composition/schema contracts remain pending S02 review.

Decision 30 refines CT-01/03/04: commands and applied worker results produce change summaries;
host reads affected UI projections. No timer polling or Rust-pushed state callbacks. Async
completion wakes the main-thread owner, validates correlation and follows the same flow.
Define versions, bounded queue/wake lifetimes and separate one-time effect delivery/acknowledgement.
Test repeated reads cannot reopen panels, teardown/stale results cannot mutate a new session,
and sample updates do not force full native-control refresh. Rust stays authoritative.

Decision 31 refines CT-03/CT-04: small complete snapshots per affected control group, bounded
initial queries plus typed collection changes. Keep decision 30's change-driven read/drain path.
Specify query/session versions, atomic updates, clear/remove/move semantics, pagination and
snapshot/delta handoff; handle duplicates, gaps, stale results and expired history with bounded
resynchronization. Native presentation mirrors cannot mutate shared state. One-time effects do
not replay on query refresh. No unbounded history or custom binary patch protocol.

Decision 32 refines CT-04: input slices are call-scoped borrows, retained values are copied,
and native hosts own copies of bounded UI results. Default UI result access has no long-lived
Rust-buffer leases. Define size/capacity/temporary-allocation handling and failure-safe output
consumption; insufficient buffers must not lose one-time effects or cause mutating-command
replay. Test lifetime/teardown and retained-copy independence. Keep document/renderer data in
Rust and opaque object-handle contracts separate; arbitrary pointer validity is a caller duty.

Decision 33 selects finite f64 coordinate/transform calculations for CT-02/05/06. Preserve
logical-world semantics and original samples; rebase visible geometry before lower-precision
rendering. S02 still freezes numeric bounds/tolerances and validation/rejection across native
input, persistence, transforms, hit testing and PNG output. Rendering precision limits cannot
silently mutate durable content; pressure and unrelated fields need separate representations.

Decision 34 refines CT-02/CT-06: linear normalized pressure-to-width mapping to selected maximum
untransformed width, with 10% minimum (decision 105); pressure absence uses selected constant width.
Pressure does not change opacity; tilt ignored. Specify exact normalization/contact rules
before implementation. Test linearity/endpoints, presence versus zero, transform scaling and
persistence/render parity; predictions remain transient and real pen evidence is separate.

Decision 36 refines CT-05/CT-06 and SU-19/EXPORT-001: PNG bounds include all committed artwork
with transformed full stroke extents plus 16 logical units on each side (decision 81), independent
of viewport and UI overlays. Specify revision capture, rounding/antialiasing coverage, empty/extreme content
and pre-allocation limits. No silent clipping/omission or document mutation to fit output budgets;
resolution/background remain separate review items.

Decision 37 refines CT-06/SU-19: PNG composites over the same fixed light canvas background,
including margins, with opaque output and no theme-dependent artwork changes. Exact shared
color, output color space/encoding and comparison tolerances remain reviewed; no transparent
export or background picker. Test edge compositing, opacity and theme-independent parity.

Decision 38 refines CT-06/SU-19: PNG dimensions derive from all-artwork bounds/margin at a fixed
scale of one pixel per logical canvas unit (decision 80), independent of viewport/display density.
Use decision 81's 16-unit margin per side; define rounding/minimum dimensions and overflow-safe
pixel/byte/work admission before
allocation. Excessive exports fail without silent resampling/cropping or content changes; no
user-facing resolution/preset/DPI controls are approved.

Decision 39 refines CT-01/03 and INV-04: bounded session history retires oldest whole operations,
never current artwork or partial transactions. Eviction changes available history, not document
revision or persistence status. Specify Undo/Redo retention, shared-memory accounting and admission
headroom; oversized edits cannot silently lose Undo support. Test exact state preservation and
resource release, separately from performance measurements. No persistent history is introduced.

Decision 41 refines CT-01/03/04/05/07: unexpected containable internal failure marks a session
unusable for edits/unsafe persistence; only explicitly safe operations remain. Define stale-work
invalidation, in-flight write handling, fresh-session recovery and diagnostics. Never overwrite
valid content from untrusted partial editor state, silently revive a failed session or conflate
this with ordinary save retry. Uncontainable process faults require relaunch. Test these paths
without promising recovery of arbitrary unsaved memory or successful logging in every crash.

Decision 42 refines CT-01/03/04/05: portable document/stroke identity uses UUIDv4; SQLite local
integer keys are private storage references. Samples use ordered indices under their stroke,
not independent UUIDs. Names/paths/order are not identity. Define UUID representation/validation,
randomness failure, uniqueness scopes and safe interop; local keys may remap without confusing
commands. Import assigns a new document identity; stroke-copy policy still needs review.

Decision 43 refines CT-05/SU-09/11 and FILE-IMPORT-COPY-001: independent imports regenerate
portable document and stroke UUIDv4 values in a staged copy and remap references completely.
Retain sample/geometry/style/transform/order semantics; preserve source bytes. Each import is
independent. Normal saves/reopen/schema migrations preserve IDs; future sync is separate.
Concrete mapping/failure/publication contracts require review before implementation.

Decision 44 refines CT-01/03/05/09: display names may repeat; UUIDs identify library documents
and all actions. No UNIQUE name constraint, implicit merge/overwrite or forced rename on import.
Validate name content/length independently; exact defaults remain review items. Tests distinguish
same-name selection/rename/delete/reopen and exported-path collisions from library identity.

Decision 45 refines CT-01/03/05/09 and LIBRARY-CREATE-001: new library drawings receive
numbered default names without requiring user input. Hosts localize the full template; shared
creation semantics stay authoritative. Persist assigned names and retain duplicate rename/import
support. Define allocation/retry/rebuild and locale contracts before implementation; names and
numbers never identify command targets. Existing items are not automatically renumbered.

Decision 46 refines CT-01/03/05 and LIBRARY-CREATE-001: default-name allocation increases
without gap reuse after rename/delete; preserve progress across ordinary restart. Existing names
remain unchanged, duplicate labels are permitted, and commands use UUIDs. Review durable
allocation/retry, failure/recovery, sequence scope and overflow explicitly; never infer allocation
history solely from display names or claim recovery of lost counter history without evidence.

Decisions 45-46 first-name correction: render the first allocated default label as Untitled,
then Untitled 2, Untitled 3, etc.; localize both forms. Omitting the first suffix does not change
allocation or identity semantics. Test first/subsequent labels and restart continuity.

Decision 47 refines CT-01/02/03/05/06: each stroke owns its appearance values; current pen
settings are session state and do not retroactively change existing strokes. Validate settings
and stored values in Rust. Define setting capture/active-stroke interactions explicitly in S02.
Preserve samples, base width and transform separation; render/export consume equivalent stroke
semantics. No shared mutable style reference, native paint object or Skia object in document data.

Decision 48 refines CT-04/05/06: sRGB is the initial artwork and PNG color space. Define explicit
stored semantics, native-picker conversion, render surface configuration, channel/alpha/transfer
rules and export metadata. Display conversion must not mutate artwork. Future spaces require
reviewed version compatibility and preservation of existing sRGB meaning; unsupported spaces
cannot be silently reinterpreted. Test round-trips and canvas/export color equivalence with
reviewed tolerances; software checks do not certify every physical display.

Decision 49 refines CT-01/03/05/08 and INV-06/07: explicit confirmed exit after save failure
may abandon only unpersisted edits, with Stay as default. Define consent revision binding,
queued/in-flight commit outcome handling, stale completion rejection and release ordering.
Do not roll back committed content, delete the item, or clear history on cancelled/failed exit.
Retry/Stay/confirmed exit and failed replacement need shared conformance and native E2E cases.

Decision 50 resolves active-stroke style policy for CT-01/02/03/04: reject style changes while
Drawing is active with a typed unavailable/busy outcome, leaving settings/stroke/history intact.
Expose authoritative disabled availability; never queue a rejected style command or cancel/split
the stroke to apply it. Define begin/end/cancel ordering and callback rejection. Test all current
origins, no delayed replay, pressure continuity and restored availability after end/cancel.

Decision 51 refines CT-01/03/05/06 and EXPORT-001: native/PNG exports capture the latest
completed artwork even if library autosave is pending/failed. A snapshot remains fixed after
capture; exclude unfinished interactions/predictions/overlays. Export outcomes must not advance
library durable revision or clear its failure/history. Define capture timing, immutable ownership,
resource bounds and publication separately; native output must include captured unsaved edits,
not merely copy an older database. Active-gesture availability is still undecided.

Decision 52 refines CT-01/02/03/04/05/06: reject new native/PNG export requests while a stroke
or move/scale gesture is active. Project shared availability to native actions; no panel opening,
queued request, forced gesture completion/cancellation or history mutation on rejection. Define
admission/capture ordering and callback revalidation; completed snapshots stay immutable if later
editing starts. Test every active interaction and end/cancel boundary through all current origins.

Decision 53 refines CT-03/06 and EXPORT-001: an empty completed drawing may export a blank
opaque sRGB PNG using the fixed light background at predefined dimensions, still awaiting review.
Define the empty fallback separately from nonempty artwork bounds/margins/scale. Do not infer
emptiness solely from zero geometric extent or mutate the document/history/save state. Viewport
and display settings cannot change blank output dimensions; active-gesture guards still apply.

Decision 54 resolves decision 53's empty PNG dimensions to exactly 1920 x 1080 pixels, with
no extra margin or display/zoom/nonempty-export-scale multiplication. Preserve opaque fixed light
sRGB output and all existing export guards; nonempty artwork bounds/scale remain unchanged.

Decision 55 resolves macOS declaration generation for CT-04: cbindgen-generated C headers
from Rust definitions, imported through a thin handwritten Swift wrapper. Rust commands remain
authoritative. Review exact signatures, handles, ownership, buffers, errors and thread/lifetime
rules before implementation; generated headers alone cannot enforce them. Require reproducible
header drift and Rust/Swift compile/link/conformance checks. JNI/Wasm shapes remain separate.

Decision 56 refines CT-01/03/05/07/08: Command-S/Save requests immediate scheduling of completed-
state persistence, bypassing normal batching through the same Rust command/worker. No dialog,
new save path, forced gesture/field commit or history mutation. Define bounded request coalescing,
retry and idle/in-flight handling; preserve revision-aware durable acknowledgement. Test native
menu/shortcut equivalence and focus/IME separately from shared persistence scheduling fixtures.

Decision 57 refines CT-03/05/06 and library navigation cases: restore local per-drawing viewport
on reopen, otherwise fit artwork or use the empty default. View persistence is separate from
portable document revisions/recency/history/exports and from launch routing (still gallery).
Define finite validation, display/window mapping, bounded coalesced writes and stale-session
rejection. Lost/invalid local view metadata falls back without blocking valid artwork; view-save
failure does not change artwork Saved status. Do not restore selection or Undo history.

Decision 58 refines CT-01/03/05/06: current pen color/width restores per drawing from validated
device-local metadata. Shared Rust validates and supplies accepted settings to native controls;
future strokes use them while existing strokes remain unchanged. Keep settings outside artwork
history/revisions/recency/exports; decision 50 guards active strokes. Specify bounded persistence,
defaults, invalid/stale metadata and write-failure handling; do not restore active tool implicitly.

Decision 59 extends decision 58: per-drawing/device preferences support typed settings by stable
tool identity, with Rust-owned validation/defaults and native control adapters. Do not constrain
the universal interface to color/width or introduce untyped arbitrary settings transport. S02
reviews exact types, versioning, unknown-setting policy and persistence. One tool's changes must
not overwrite another's preferences. Stored artwork remains reproducible without local settings;
future tools/active-tool restoration/presets are not implicitly approved.

Decision 60 refines CT-01/03/05/08, FILE-IMPORT-COPY-001 and library navigation: successful native
import opens the new independent copy, respecting current-session exit guards. Failed import/open
preserves the current session. Define staging/publication/open boundaries, cancellation and stale
completion rejection; published library content must not be silently deleted on navigation failure.
Source/new-identity rules remain unchanged; accepted replacement alone ends prior history.

Decision 61 resolves active-tool restoration for CT-01/03/05: per-drawing/device mode restores
with that tool's validated preferences. Initial editor uses Pen/Select; absent/invalid/unavailable
metadata falls back to Pen. Native UI mirrors accepted shared state. Keep other tool preferences
intact and restore no selected object, interaction or history. Define lifecycle ordering and
fallback under capabilities; editor Pen fallback cannot enable tools on future view-only hosts.

Decision 62 refines CT-03/05/06 and gallery cases: thumbnail framing fits all artwork with margin,
including full transformed stroke extents, independent of last viewport. Exclude temporary input/
selection state. Cached previews are disposable and cannot change content/save authority. Define
revision source, bounded generation/cache/invalidation and stale results in S02; missing preview
must not block valid open. Keep thumbnail sizing separate from PNG export fallback dimensions.

Decision 63 refines CT-01/05/08: native/PNG export replacement needs explicit destination-specific
consent. Stage/validate before replacing, preserve existing bytes on pre-publication failure and
reject internal live-storage targets. Define changed-target revalidation, provider limits,
cancellation/interruption and truthful completion. Do not alter library save/history state or
add a second confirmation if the native workflow already satisfies the contract.

Decision 64 refines CT-03/05/07/08: cap normal deliberate autosave batching at one second from
the oldest completed unsaved edit using monotonic time. Never extend that deadline with later
edits; Command-S/normal exit bypasses batching. Define pending/in-flight accounting and bounded
retry/overrun handling separately. A scheduling deadline is not a durable-write guarantee;
no timer advances saved revision or forces unfinished gestures to commit.

Decision 65 refines CT-07: initial native app diagnostics use rotating local JSON Lines files,
one bounded versioned UTF-8 JSON object per line. Keep correlated native/Rust events, redaction,
bounded background drain and no editing dependency on sink success. Specify framing/truncated-tail
handling, location/access, process ownership and size/age limits in S02. No SQLite log database,
new command protocol or universal filesystem guarantee for future browser hosts.

Decision 66 refines CT-07/08: app diagnostic retention is at most seven days and 20 MiB total
logical bytes, active plus rotated files, with oldest-first cleanup. Keep drawing/recovery/test
artifacts outside cleanup. Define cadence, age/clock handling, rotation/accounting and bounded
failure/drop behavior; no background daemon or editing dependency on successful log cleanup.
Test byte/age boundaries, restart, failed cleanup and preservation of unrelated content.

Decision 67 refines CT-05/08: native SQLite drawings use .linefield; opening/import still validates
internal identity, version/content and limits. Suffix or file-panel filtering never substitutes
for shared validation. Define native filename/extension edge cases and OS type integration in
S02/S06 without inventing a selected MIME/reverse-domain identifier or registering an association.

Decision 68 refines CT-03/05: local per-tool settings persist in explicit relational columns
and tool-specific tables, with typed Rust defaults/validation. No JSON/BLOB/EAV preference payload
or universal wide optional-field table. S02 reviews exact keys/types/constraints and migrations;
future approved tools extend this design. Keep portable artwork and native command DTOs independent
of table layout and preserve per-drawing/device settings isolation.

Decision 71 supersedes decisions 69-70: tools retain stable identity/readable keys but no separate
version table or per-tool settings/contract versions. Top-level drawing format version governs
persisted artwork interpretation; local catalog has its own top-level migration version. Maintain
old artwork meaning through reviewed compatibility/migrations, not silent reinterpretation.

Tool/document/stroke UUIDs use standard 16-byte binary SQLite representation. Define length/type/
UUID validation and canonical cross-host conversion; do not serialize native GUID memory layouts.
Keep document/stroke UUIDv4 generation, fixed tool identities, local integer relationship keys and
sample indices. Review exact DBML/ABI representation and malformed/round-trip/import fixtures.
Binary database storage does not introduce a command serialization protocol.

Decision 72 refines CT-05/08: owned drawing/catalog tables use SQLite STRICT with verified
compatible runtimes, including future browser adapters. Keep explicit 16-byte UUID, nullability,
range, uniqueness and FK constraints plus Rust validation. Lossless type coercion is permitted by
SQLite; STRICT is not full semantic validation. Test storage-type errors separately from domain
rejection and never silently substitute flexible tables or suppress incompatible-runtime errors.

Decision 73 refines CT-01/02/03/08: drawing-window focus loss cancels every tool's unfinished
interaction with rollback of that interaction only, no Undo entry or partial persistence. Keep
completed actions/history/worker acknowledgements. Define idempotent cancel, native lifecycle
mapping, temporary cleanup and stale update/end rejection; resume requires a valid fresh begin.
All future tools inherit this contract. Native field/IME editing retains its platform behavior.

Decision 74 refines CT-01/02/03/04/08: document Undo/Redo is unavailable during any active tool
interaction. Shared typed rejection preserves gesture/content/history and never queues or forces
end/cancel. Project availability to native controls; re-evaluate after end/cancel without replay.
Keep native field/IME Undo independent. Define ordering/stale callbacks and test all active tools
with shared fixtures plus native history/menu/shortcut/focus scenarios.

Decision 75 refines CT-01/02/03/04/08: switching tool during any unfinished interaction is
unavailable. Shared rejection preserves preview/settings/history and persisted active-tool state;
no deferred switch or automatic end/cancel. Native action availability mirrors Rust, and end/
cancel requires a fresh explicit switch under remaining guards. Test preference activation races
and stale callbacks while preserving native field/IME routing and completed-state manual Save.

Decision 76 refines CT-01/02/03/08: canvas Escape cancels an active interaction via the shared
all-tool rollback command; when idle it clears selection or does nothing. Keep active tool and
completed work/history intact. Native dialog/field/IME priority prevents double handling. Define
idempotence and stale/held-input rejection requiring a fresh begin; no auto-restart/deferred replay.
Test shared state and real native Escape/focus behavior separately.

Decision 77 refines CT-01/02/03/06/08: on initial macOS, reject canvas pan/zoom while stroke or
artwork move/scale is active, preserving viewport/edit/history and never deferring deltas. Permit
normal idle navigation and navigation with a selection; navigation interactions can update
normally. Define input/momentum/ordering/stale rejection and preserve native field behavior.
System window/display remap policy is separate; no simultaneous editing/navigation is selected.

### Canvas mapping interruption (decision 78)

CT-02/CT-03/CT-06: before accepting a changed canvas mapping during an unfinished interaction,
invoke shared cancellation. Resize/display adaptation then proceeds, preserving completed artwork,
history and valid worker results. No partial edit/Undo entry; previews clear and current tool stays.
Define invalidating content-size/backing-scale/surface changes and ordering/identity checks in S02.
Reject late input/results from the invalidated interaction/mapping; require fresh begin. A window
move with unchanged mapping is not itself a cancellation trigger. Shared ordering tests and real
resize/display E2E are distinct; untested display transitions stay explicit coverage gaps.

Decision 79 refines CT-02/CT-03/CT-06: after artwork transforms, a world-space length L maps to
L * zoom view points; native backing scale then maps to device pixels. Inverse input conversion
must match rendering at reviewed tolerances. No physical-size guarantee or display-driven geometry
mutation. PNG scaling is independently selected; future host logical-unit mappings need review.

Decision 82 refines CT-05: automatically rebuild a missing/confirmed-corrupt catalog from
validated managed-library drawings, preserve damaged artifacts and unvalidated files, and notify
the user. Do not scan external directories or treat transient access/newer-schema failures as
corruption. Document metadata survives where valid; catalog-only preferences may fall back.
Specify bounded staged recovery/publication, lifecycle reconciliation, duplicate handling and
restart-safe failure semantics in S02. No silent deletion/merge or unsupported claim of full recovery.

Decision 83 refines CT-03/CT-05: retain a catalog entry for a missing/unopenable drawing, mark
unavailable, preserve identity/known metadata and permit explicit retry through shared opening.
Expose typed reasons without equating access failure with corruption. Failed open creates no blank
replacement and removes no entry; preserve the prior accepted session/history. Revalidate identity
and reject stale retry results. Native presentation must distinguish last-known metadata from
verified availability. No locate-file/search/salvage feature is authorized by this policy.

Decision 84 refines CT-03/CT-05: recovery reports distinct files sharing a document identity as
an unresolved conflict, preserving all candidates while recovering unrelated valid drawings.
No automatic winner, merge, new IDs or ambiguous open. Define identity-safe candidate references,
scan/publication ordering and idempotent retry in S02. Equal names alone are not conflicts.
Typed outcomes must distinguish conflict from successfully recovered or ordinary missing content.

Decision 85 refines CT-05: resume permanent deletion after restart only from a valid durable
record of the user's confirmed operation and exact target, persisted before destructive work.
No repeated confirmation solely for restart, no inference from missing files/corrupt catalog.
S02 reviews concrete representation, cancellation/completion boundaries, writer fencing and
idempotent crash recovery. Preserve unrelated files and prevent stale writes/rebuild resurrection.

## Batch 1 approved refinements (decisions 86-94)

- CT-05: incremental transactional autosave; verified FK cascade for stroke-owned samples. Rust
  retains command/Undo semantics. Require reference-state, rollback and reopen parity tests.
- CT-06: bounds derived from authoritative geometry live only in bounded disposable memory caches.
- CT-05/07: bounded delayed retries for transient saves plus manual Retry; honest status, error
  classification, no queue growth/duplicate application or stale worker mutation.
- CT-03/05/06: gallery thumbnails derive from coherent durable revisions, retain revision identity,
  may lag honestly and reject stale results. Visible/near-visible demand drives bounded scheduling.
- CT-03/08/09: gallery entries load on scroll through bounded pages/windowing. Reserve layout space
  and stable identities; hydration must not move items/scroll anchors/focus. Native responsive and
  locale/text-size changes are separate from loading shifts. Apply on each implemented platform.
- CT-02/06: initial preview uses actual samples only; prediction seam/invariants remain future scope.
- CT-05: distinguish shared format invalidity from host resource-capacity rejection. Bound validation
  and preserve oversized valid documents unchanged. No silent truncation or per-host format drift.

Concrete types/budgets and native Figma remain for review. Shared tests and per-host E2E evidence
must distinguish implemented, pending and untested behavior. B01-Q9 is selected A in decision 103.

## Batch 2 approved refinements (decisions 95-102)

CT-04: static Rust linkage for initial macOS, matching host/core builds, generated declaration and
ABI checks without an old-host compatibility promise. CT-03: coherent grouped reads of affected
small projections; collection gaps use bounded fresh resync, not replay history. Preserve native-
owned copies, on-demand paging, stable identity and atomic publication; no geometry transfer.

CT-01/03/04: one-time identified effects await explicit host acceptance; later completion/error
is distinct. Capacity failure/repeated reads cannot consume or duplicate presentation. CT-03/05:
priority/fairness for storage work between bounded units; slice main-thread completion delivery,
preserving order and atomic result application. No new executor/thread or polling timer.

CT-05/06: bounded FIFO export requests, per-job outcomes, retained snapshot/resource bounds and
safe destination ordering. Exact admission/capture/panel/overwrite/cancellation rules require S02
review; decision 103 selects finish-on-quit with explicit cancellation for active and queued jobs.
Reject overload honestly.
Tests cover stale/duplicate delivery, coherent projections, resync gaps, priority bursts/fairness,
completion slices, queue cancellation/overload and same-destination races. Separate UI evidence.

## Quit/input/geometry refinements (decisions 103-109)

CT-05/06: Quit normally finishes accepted active/queued exports with explicit safe cancellation;
unsaved-edit guards remain independent. Cancellation must not undo a published file. CT-02:
malformed actual batches for the current interaction reject atomically and cancel via shared
rollback; stale/wrong-session batches cannot cancel unrelated current work. Fresh begin required.

CT-02/06: valid pressure width is W*(0.10+0.90*p), absent pressure uses W, transforms scale width.
CT-01/05/06: saved sRGB channels are normalized floating point; exact width/alpha/conversions await
schema review, no implicit 8-bit quantization or opacity UI. CT-02/06: select against visible
stroke shape in screen space (inside=zero), preserving nearest/topmost rules. Move/scale preserve
stroke order. PNG origin is padded bounds; round dimensions upward, not world-grid edges.
Keep nominal margin and exact empty-output exception; review numerical/antialiasing bounds.

## Batch 5 approved refinements (decisions 116-120)

CT-03/04/05: multiple processes may edit distinct drawings, with one owner per drawing, coordinated
catalog/maintenance and stale-result fencing. Exact locks/notifications/security boundaries require
review; no custom IPC/runtime is chosen. CT-05: proactively upgrade eligible drawings after updates
under reviewed coordination, bounds and required recovery-copy rules; active owners cannot be bypassed.

CT-05: explicit restore-as-independent-copy assigns fresh document/stroke IDs, preserves damaged
original, validates/stages and communicates potential missing newer edits. Imported external source
is one coherent captured revision, unaffected by later source changes. No raw live-main-file copying
or write-through. CT-06: PNG output channels are 8-bit, while native colors remain floating point;
review conversion/metadata/rounding and verify export cannot quantize the authoritative document.

## Batch 6 approved export refinements (decisions 121-126)

CT-01/03/05/06: accepted Export captures completed artwork before destination selection; immutable
job ownership survives editor navigation, with independent save guards. Persist job intent/source
for crash recovery under reviewed schema/durability/privacy/access/retention and fencing contracts.
Do not replay uncertain publication or label non-durable preparation recoverable.

Allow same-destination queued requests but serialize publication and revalidate consent/target.
Continue safe independent jobs on failure; preserve failed outcomes and pause common unsafe work.
Cap accepted active/waiting/reserved jobs at three plus aggregate byte/work limits, with explicit
scope review for multiple processes. Exact job storage, durable preparation timing, recovery UI,
source deletion and global/process cap scope remain pending. No automatic topology change.

## Batch 7 ownership refinements (decisions 127-131)

Explicit contested Open first reuses/activates the verified owning document window where supported;
otherwise report in-use. No second editor/read-only mode or unsolicited background focus change.
Defer upgrades of actively owned drawings; continue eligible unrelated work. On ownership loss,
pause mutations and persistence, retain completed in-memory work, cancel unfinished interaction
and reject stale writes; no blind reacquisition/flush. Use platform advisory notifications plus
authoritative catalog validation, coalescing and lifecycle catch-up. Refuse deletion while another
process owns the drawing; rejected deletion is not deferred consent. Q44 coordinator policy remains
pending. Specify actual identity, activation acknowledgement, locks/fencing and in-flight-write
limits before implementation; no custom IPC/daemon or new thread topology is authorized.

## Batch 8 approved durable-export policies (decisions 132-138)

Use a separate SQLite job database and dedicated immutable snapshot area; exact DBML/source
representation still needs review. Accepted Export captures before its panel in bounded memory;
persist after destination confirmation, with an honest preparing/durable boundary. Automatically
resume only validated safe recovered work; pause uncertain publication/access and changed targets.
Changed destinations need renewed consent or another destination. Release terminal job-only
snapshots after safe durable reconciliation, retaining bounded outcomes and live references;
exact-source retry is unavailable after release. Source deletion explicitly confirms canceling
outstanding exports and coordinates safe cancellation before deletion; published files survive.

The count cap is three accepted active/waiting/reserved jobs PER PROCESS (Q54 B), alongside shared
resource protections. No global count/byte budget or new worker topology is chosen. Specify abandoned
job claims/reassignment, recovered admission, cross-database deletion/job lifecycle and idempotent
cleanup before code. Do not drop durable jobs, blindly retry uncertain overwrites or bypass consent.
Q44 maintenance ownership and batch 9 naming remain pending. Policies are not implementation.

## Maintenance and naming refinements (decisions 139-143)

CT-03/05: one logical maintenance coordinator, resumable across permitted platform lifecycles;
review safe release/transfer/fencing, no perpetual runtime assumption. Use one library-wide
transactional default-name sequence. Imported items receive initial top placement without falsifying
source content dates; define deterministic ordering and stable paged projections.

Cross-process rename is an explicit typed request to the verified owner, dispatched through shared
Rust commands. Confirm durable metadata before reporting success and reconcile catalog state.
An advisory catalog signal cannot authorize this mutation. Review trust, conflicts, deduplication,
unknown outcomes, owner exit and stale requests before choosing any transport. Shared validation
trims only outer whitespace for user-entered names; preserve internal/valid Unicode and IME semantics.
Batch 10 storage/security choices remain pending; no actual new protocol/schema is implemented.

## Local storage and future cloud (decision 144)

The preview has a fixed app-managed local library. Preserve a future cloud adapter boundary around
local services, provider-independent identity and coherent snapshots/change queries. Keep offline
editing/local durable save independent of network work; future remote status is separate. Do not
share live SQLite/WAL files across devices, treat process locks/local revision counters as distributed
coordination or reuse import's identity regeneration for sync replicas. Future schema/protocol review
must cover concurrent edits, deletions, retries, remote versions, authentication and encryption/key
recovery. No cloud SDK/provider/CRDT/trust model or implementation is selected. Q60 stays pending.

## S00E security proposal cross-reference

[Day-zero threat review](security/day-zero-review.md) and [proposed gates](security/gates-and-response.md)
map SEC risks/scenarios to CT-01 through CT-09. They identify import schema trust, actual stale-writer
fencing, authenticated rename, destination access/consent, deletion/export admission, private-copy
retention and unsafe/native limits. Proposed mechanisms are not owner-approved contracts. S02 must
present concrete typed interfaces/state transitions and adversarial fixtures before implementation.
Keep generated FFI distinct from a process security boundary and catalog wakeups distinct from commands.
