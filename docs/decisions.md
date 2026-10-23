# Decision and approval record

Recorded 2026-10-16. Do not promote a proposal to approval based on an agent's recommendation.

| Decision | Status |
| --- | --- |
| Name Linefield and separate root /Users/oleksandr/projects/linefield | Owner selected |
| Documentation, tasks, instructions and folder scaffold | Owner authorized now |
| Multiplatform architecture from day one, apps/ placeholders for all planned hosts | Owner explicitly requested; macOS features first, platform implementation later |
| Application code/dependencies/build manifests | Not authorized by scaffold request |
| Focused editable macOS preview, including single-stroke move/scale/delete | Owner selected |
| Local developer preview; distribution separate | Owner selected |
| R02: one document in one window for the first macOS preview | Owner selected A on 2026-10-16; independent session ownership, tabs/multiwindow deferred |
| New native format; no old document compatibility | Owner selected direction; concrete schema pending |
| Shared Rust commands, AppKit native controls, Skia | Established direction |
| Typed FFI and generated declarations | Established direction; concrete ABI pending |
| R09 crate structure: engine, services, renderer, native integration | Owner selected B on 2026-10-16; dependency boundaries recorded below |
| R10 macOS starting topology: editor and Skia owner on main thread; background storage/logging | Owner selected A on 2026-10-16; early measured checkpoint required |
| Concrete ABI, scheduler/queue capacities and other-platform thread topology | Pending separate review |
| R11 native document: SQLite | Owner selected C on 2026-10-16; schema and save/recovery lifecycle pending |
| R06 persistence: autosave to the document | Owner selected on 2026-10-16; app-managed drafts selected; concrete scheduling/lifecycle pending |
| Native snapshot + PNG exports | Owner selected B, decision 18; SVG/PDF deferred; concrete contracts/design review pending |
| Identified design/version | Not prepared or approved |
| Preview verification hardware | Current Apple Silicon Mac/macOS, mouse/keyboard and Cintiq/Pro Pen 3 selected (decision 21); exact inventory, minimum OS and performance thresholds pending |

Record future approvals with date, exact artifact revision/frame links, approved scope, conditions and superseded decisions. New material deviations return for review. Do not ask again for already-authorized routine work.

## Contracts and coverage direction

The owner requested adding the shared contract catalog and E2E approach to the plan on
2026-10-16. See [contracts](contracts.md), [shared E2E](testing/shared-e2e.md) and
[architecture audit](decisions.md). This authorizes documentation only;
actual contract signatures, formats, tools and runtime behavior remain subject to their gates.

## Established constraints index

| Direction/constraint | Definition |
| --- | --- |
| Native controls/layout; shared Rust action IDs/availability/behavior | AGENTS, CT-01–CT-03, platforms |
| Full normal Skia build; web CanvasKit; no production Vello | platforms, successor/reuse |
| One mutable state owner, validated commands, predictions transient, one-operation undo | contracts INV-01–INV-04; macOS starting topology selected in R10; concrete scheduling and other hosts still reviewed |
| Bounded queues/caches/logging and revision-safe workers/storage | contracts CT-03/CT-05–CT-07; capacities and mechanisms pending S02 |
| Structured local redacted correlated diagnostics | contracts CT-07, quality |
| <=200 physical lines per handwritten source/test/script | AGENTS, quality |
| Native Node .ts, strict erasable types, Oxc gates and no owned shell/PowerShell/Python orchestration | AGENTS, quality; exact tool versions unselected |
| Owner-approved design version before new screens/tools; native platform variants | AGENTS, S00, designer instructions |
| Shared behavioral scenarios plus actual-host E2E and explicit coverage | testing/shared-e2e, quality; implementation not begun |
| Existing specialists own quality; fresh reviewer; isolated concurrent writers | AGENTS and .codex/agents |

The [architecture audit](decisions.md) also lists proposals and deferred
features; an established constraint does not approve a specific unshown implementation.

## Tooling and developer experience update

Owner selected Zed tasks on 2026-10-16; no custom Zed extension. Node .ts, Vite and Oxc are the tooling direction; zx is an optional candidate, not an adopted dependency. Plan reusable reports/actions and design review handoff from day one. Workbench GUI, concrete services/schemas and all implementation remain gated. See [tooling](tooling.md), [developer experience](developer-experience.md), [logging](logging.md) and [design workflow](design/workflow.md).

## Adaptive design and additional platform planning

Owner requested Android TV/Google TV and Android XR folders on 2026-10-16; apps/android-tv and apps/android-xr now hold documentation placeholders with P10/P11. Implementation remains deferred. Adaptive design review mockups and design foundations are required in the design plan (S00A); no palette, component library, design artifact or screen design has yet been selected/approved.

## Internationalization direction

Owner requested day-one i18n planning on 2026-10-16. Shared Rust commands/data remain locale-independent; native resources/presentation and shared readiness tests are required. English is now selected as initial app/source/fallback language (owner request 2026-10-16). Additional translations, language-change behavior, concrete catalog/tool/library choices and translation review workflow remain S00B/S02 decisions. Pseudolocale preparation does not authorize a language-picker screen, translation service or text tool. See [internationalization](internationalization.md).

## Competitor research role

Owner requested competitor_researcher on 2026-10-16, with recommendations delivered to both
the owner and the design roles (now split into UX and UI). Role/workflow/task instructions are added; no competitor report
or feature recommendation is approved. See research and S00C.
The [planning walkthrough](objectives.md) consolidates remaining recommendations; all
its proposals remain pending explicit owner decisions.

## Motion and navigation planning

Owner requested platform-specific animations/transitions and in-app routing plans on 2026-10-16.
S00D, [navigation](navigation.md) and [motion](design/motion.md) document the requirement.
Interactive motion/reduced-motion handoff joins design review approval. Custom chooser scope, route
grammar/identity, external-link registration and actual transitions remain proposals; no new
screens, routing library or implementation approved. Existing Rust command ownership remains.

## Wear OS, English and two design roles

Owner selected English as initial language on 2026-10-16; document it as app/source/fallback
language while regional number/date/keyboard settings remain independent. Resources and tests
are not implemented. Additional translations and concrete English locale mapping remain reviewed.
Owner added Wear OS as a target: apps/wearos and P12; viewer capability is a recommendation,
not an approved toolkit/network plan. Owner explicitly requested separate ux_designer and
ui_designer roles; the combined configuration is replaced. See [responsibilities](design/roles.md).
Existing implementation/design review gates and concurrency limits remain unchanged.

## Architecture review — decision 1 (R02)

On 2026-10-16 the owner selected A: one document in one window for the first macOS
preview. New/Open replaces the active document through persistence/cancellation safeguards
(updated by decision 5: autosave; no routine discard-to-open behavior).
Use independent EditorSession ownership of document, history and interaction state rather
than a process-wide current-document singleton. Async results identify session/operation
so late completions cannot affect a replacement session. Tabs and multiple document windows
are deferred; future support still requires design, implementation and testing. Concrete
thread topology/ABI remain pending. This choice does not authorize implementation or design review.

## Architecture review — decision 2 (R09 crate structure)

On 2026-10-16 the owner selected B: four focused Rust crates. editor-engine owns pure
commands/document/geometry/history, file-format validation and renderer-independent scene
data. editor-services owns storage/recovery/diagnostic effects, not editing decisions.
editor-renderer owns Skia resources, caches and rendering. editor-native composes these and
exposes the typed native boundary without editing policy. Swift retains native UI/input/
window responsibilities. Services/rendering depend on engine definitions; the engine depends
on none of those layers and requires no native UI, filesystem access or Skia.

Use cohesive internal modules under the existing 200-line source rule. Future JNI/Wasm/native
adapters preserve shared behavior without forcing one binary interface or GPU backend on
every platform. Exact ABI/generator, concrete types and thread topology remain separately
reviewed; no application code/build/dependencies are authorized by this decision.

## Architecture review — decision 3 (R10 macOS threading)

On 2026-10-16 the owner selected A for macOS: main-thread AppKit input, Rust editor state
and Skia context/frame preparation/submission. Frame work is scheduled outside input callbacks
but still shares the main thread. GPU execution is asynchronous. Bounded background storage/
recovery work and diagnostics draining use immutable owned inputs and typed completions.
Only the editor owner mutates state; input callbacks do not wait for disk or GPU completion.

An early release-build checkpoint must measure dense-scene drawing and save interference,
including input/frame costs and stalls. This is a simplicity/ownership choice, not a claim
of best latency. If rendering preparation misses reviewed budgets, present a dedicated-renderer
proposal for owner review before expanding the app. Do not switch topology silently. Concrete
scheduling/queue limits and ABI safety stay S02 review items; each other host reviews its own
topology. No implementation, runtime validation or foreground reservation is authorized here.

## Architecture review — decision 4 (R11 native format)

On 2026-10-16 the owner selected C: a SQLite application document, superseding the ZIP/JSON
container proposal. Preserve the single portable document goal and shared Rust semantics.
This selects storage technology, not autosave, WAL, persisted undo, a SQL schema, binding
library, extension or new server. Concrete schema/version/validation and transaction/durability/
backup/file-provider/Wasm strategy require S02 review. Database work stays off the ink path;
engine state remains authoritative in memory, with no SQLite connection in the pure engine.
No implementation is authorized by this decision. Next choice is user-visible save behavior.

## Architecture review — decision 5 (R06 save behavior)

On 2026-10-16 the owner selected autosave to the document. Ordinary completed edits are
persisted in the background using SQLite, without requiring explicit Save. This supersedes
the explicit Save plus separate recovery-copy recommendation. Close/navigation must resolve
pending/failed persistence; cancellation does not revert edits already saved. Undo changes
are also autosaved. New untitled-document storage, manual Save/Save As details, batching,
durability and failure UI remain review items. See [autosave policy](autosave.md). No code
or new screens are authorized by this choice.

## Architecture review — decision 6 (R06 new documents)

On 2026-10-16 the owner selected app-managed drafts. New does not require choosing a name or
location before drawing; completed edits autosave to a SQLite draft in app-managed storage.
Naming/location can be chosen later. Draft retention/restoration, empty-draft cleanup and safe
publication/identity rules remain pending. No gallery, automatic draft deletion, concrete SQL
schema or implementation is approved by this choice. See [autosave policy](autosave.md).

## Database specialist and visual schema review

The database designer prepares scoped SQLite schema proposals and visual review material. Shared schema inputs and DTCG styles generate local review views; owner approval names the exact proposal scope. The role cannot approve its own schema or implement production persistence without authorization.

## Architecture review — decision 7 (library lifecycle and first screen)

On 2026-10-16 the owner selected a Procreate-like app-managed gallery/library and requested its
initial task before the canvas. New drawings persist as library items without naming/location
requirements; returning to the library or closing normally does not discard unnamed drawings.
The library is the normal entry screen; one window presents it or one editor. This supersedes
the proposed recents-only menu and optional-gallery scope. S02L is the first product UI milestone,
after foundations and reviewed contracts/design review, and blocks S04 canvas integration.

This adopts library-managed working documents; native file exchange is reviewed separately,
with import-as-copy/export-as-copy the proposed Procreate-like semantics, not silent external
file write-through. Exact import/export UI/identity and any edit-in-place exception require review.
No stacks/folders, bulk operations, sync or additional export formats are implied. Deletion/trash,
empty-item cleanup and exceptional startup restoration remain open. No concrete catalog/schema,
new database, code implementation or design review approval follows from this scope decision alone.

## Architecture review — decision 8 (library deletion)

On 2026-10-16 the owner selected B: explicit confirmation followed by permanent library-document
deletion. No Recently Deleted view, restore command or system Trash workflow in this preview.
Cancel preserves the drawing; successful deletion cannot be undone through drawing history.
This is a product policy, not approval of a concrete catalog schema or storage algorithm.
S02 must review pending-write coordination, stale worker rejection and interrupted/failed deletion.
Never report successful deletion before the reviewed durable boundary. No secure-erasure or
removal of independently exported/backed-up copies is promised. design review/implementation gates remain.

## Architecture review — decision 9 (external native files)

On 2026-10-16 the owner selected A: import an independent copy of an external Linefield document
into the app-managed library. Give the imported drawing a new library document identity; edits
autosave to the local library copy, never automatically back to the external source. Importing
is not attaching a synchronized document or granting future source-write access. Preserve the
source through import, edits and deletion of the imported copy. Validate before publishing a
usable library item; failed/cancelled imports preserve existing content and clean staged work.

A repeated import must not silently replace/merge an existing drawing on matching embedded ID.
Exact duplicate prompts, labels and native UI remain design work; concrete schema/ABI need S02
review. Applies to Linefield-native files only; legacy files and image/PDF imports stay out of scope.

Future cloud sync may preserve a logical document identity across replicas, unlike independent
imports. Keep identity separate from names, locations and provider references. This is portability
planning, not approval of accounts, providers, sync protocols, merge behavior or network code.
Native export details remain to be reviewed; independent snapshot export remains recommended.

## Architecture review — decision 10 (Undo/Redo lifetime)

On 2026-10-16 the owner selected A: Undo/Redo history exists only for the current editing session.
Successfully leaving the editor for the gallery, switching documents or closing the session clears
its history. Reopening/restarting begins with saved artwork and empty Undo/Redo history. Autosave
completion itself never clears history; Undo/Redo edits are changes that autosave normally.
Cancelled/failed navigation preserves the current session/history. Temporary focus loss, native
panels and app backgrounding do not themselves end a session; process termination loses history.
Persist drawing content, not Undo/Redo stacks. SQLite transaction rollback is not user Undo.
No persistent history/event sourcing is authorized; history memory bounds remain an S02 decision.

## Architecture review — decision 11 (autosave batching)

On 2026-10-16 the owner selected B: brief, bounded batching of completed edits into background
SQLite transactions. Enforce a maximum pending age so continuous input cannot indefinitely
postpone persistence; flush pending content before successfully leaving/closing the editor.
Do not commit predictions or an unfinished gesture, block input on disk, or equate a queued
write with durable success. Persistence batches do not combine separate editing undo operations.

S02 must propose exact timing, age measurement, queue/memory bounds, coalescing, write ordering,
overload/failure handling and durable acknowledgement policy for owner review. A deadline requires
attempting/progressing the flush; it cannot guarantee durable completion during storage failures.
Track overdue/failed writes honestly, preserve pending state and guard exit. Revision N completion
cannot mark N+1 saved. No numeric crash-loss guarantee or journal setting is selected by this choice.

## Architecture review — decision 12 (typed native entry points)

On 2026-10-16 the owner selected A: named typed native entry points, each a thin adapter into
shared Rust commands/queries. Native controls and system shortcuts retain the same command
behavior; wrappers cannot implement separate editing, Undo or persistence policy. Use bounded
sample-batch entry points for high-frequency input, not mandatory per-point boundary crossings.
This supersedes a single tagged foreign command-union entry point as the default native shape.

The reusable semantic contract is the Rust command/query model, not the C-compatible signatures.
Future TypeScript/Wasm and AI adapters may expose appropriate typed interfaces while dispatching
the same supported commands. Future AI requests use semantic operations, bounded queries,
reviewed transaction grouping, revision checks and separate authorization; no pointer emulation
requirement. No AI transport, network service, tool runtime, new editing feature or permission
model is implemented or authorized by selecting this boundary shape.

S02 still presents exact signatures/DTOs, generated declaration tooling, handle/buffer ownership,
thread/reentry rules, errors/panic behavior and negative conformance tests for owner review.
Named entry points do not remove validation, logging or single-owner editor constraints.
Current project authorization remains documentation only; no application code is added.

## Architecture review — decision 13 (canvas caching)

On 2026-10-16 the owner selected A: cache prepared vector geometry/paths first, with viewport
culling and bounded disposable caches. Keep durable drawing content independent of renderer
objects, spatial indexes and caches. Eviction changes performance, never content or appearance.
Do not introduce a persistent custom canvas raster-tile cache in the initial implementation.
This does not prohibit ordinary Skia render surfaces or the library's separately scoped thumbnails.

S02 reviews cache keys/invalidation, spatial bounds, resource budgets and coordinate conversion;
S04 establishes an early release-build dense-scene baseline and S07 extends acceptance. Include
stroke-width/transform-aware culling, invalidation after edits/Undo/Redo, cold/warm/evicted output
parity and memory bounds. Performance remains a measurement question, not guaranteed by this choice.
If evidence justifies raster tiles, present costs, visual/zoom correctness, lifecycle and tests
for renewed owner review. This direction does not authorize code or change the selected threading.

## Architecture review — decision 14 (drawing units)

On 2026-10-16 the owner selected logical canvas units for document geometry. Units are independent
of physical pixels, display density and physical millimeters. Hosts map shared world coordinates
to their native view coordinates using viewport zoom and display scale; moving between platforms
or displays must not rewrite drawing geometry or saved stroke widths.

The proposed finite f64 world representation, viewport-relative rendering conversion, exact
100%-zoom mapping, coordinate/zoom limits and rejection rules require concrete S02 review.
Logical units do not promise physically identical displayed size across devices. Measurement
and physical print scale can be separate later features; neither is authorized here. Keep schema,
input/selection/transform and renderer contracts consistent. Documentation only; no implementation.

## Architecture review — decision 15 (local autosave failure)

On 2026-10-16 the owner selected continued editing temporarily within limits after a local
save failure. Display persistent unsaved/failure status, retain accepted changes in memory and
retry with a bounded policy. Pause new document mutations before reviewed unsaved-work/memory
limits are exceeded. Preserve inspection/navigation controls and recovery actions, but changing
or releasing the session still obeys persistence/explicit-loss-consent guards. Never discard
accepted edits silently or claim pending work is durable. A process/device crash may lose it.

S02 defines byte/operation/age thresholds, headroom for an active gesture, safe rejection/cancel
boundaries, retry/backoff, error classification and the conditions for resuming edits. Do not
truncate a committed stroke or silently drop input at capacity. Exact UI states and exit-loss
acknowledgement require design review and revision-specific contracts before implementation.
Future cloud upload failure is distinct from local save failure; successful local saving should
not by itself pause edits due to remote unavailability. No cloud system is authorized here.

## Architecture review — decision 16 (initial drawing experience)

On 2026-10-16 the owner selected A: one solid round pressure-sensitive pen for the first
macOS preview. Pressure affects width, not opacity; mouse or unavailable-pressure input uses
constant width. Tilt has no effect initially. Retain width and color controls. Use a fixed
light artwork background independent of native chrome following the system appearance;
saved stroke colors do not change with the UI theme.

No brush library, adjustable stabilization or artwork background picker is approved. Shared
Rust geometry defines stroke appearance. S02 proposes the pressure curve, width meaning,
zero-pressure handling, algorithm version and any basic smoothing for review; evaluate tuning
with the Cintiq rather than inheriting defaults silently. Predictions remain temporary and
never become saved input. This records product behavior, not identified design approval or
implementation authorization. Next product decision: selection/navigation interactions (R05).

## Architecture review — decision 17 (selection and navigation)

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

## Architecture review — decision 18 (preview export scope)

On 2026-10-16 the owner corrected the initial C response to B: native document + PNG for the
first macOS developer preview. SVG and PDF are deferred; the withdrawn C choice does not
approve SVG implementation. Native export creates an independent consistent SQLite document
snapshot without moving the library document or establishing synchronization/source write-through.
PNG provides a flattened image for sharing; neither PNG nor SVG import is approved.

S07E is now a required PNG export slice after S06 reliable persistence, included in S08 acceptance.
Native snapshot exchange belongs to S06. Bounds, resolution, background/transparency, empty and
extreme drawings, cancellation, overwrite/failure behavior and memory budgets still need concrete
contracts and identified design. Export must not mark pending autosave revisions durable.
No export code, dependencies or UI implementation is authorized by this scope decision.

## Architecture review — decision 19 (launch destination)

On 2026-10-16 the owner selected A: always launch into the gallery for the first macOS preview,
including launch after a crash. Do not automatically restore the last open editor or add a
special Continue drawing action. Recover available durable SQLite content and report recovery
issues without falsely claiming unsaved memory edits survived. Unavailable/corrupt items must
not silently disappear or block access to unaffected library items.

Opening a drawing from the gallery creates a session with empty Undo/Redo history, consistent
with decision 10. This choice establishes the launch destination; an explicit external-file
request remains a separate reviewed import intent (decision 9), not permission for automatic
editor restoration or a new deep-link feature. Concrete recovery states/contracts and design review
approval remain pending. Documentation only; no implementation authorization.

## Architecture review — decision 20 (gallery ordering)

On 2026-10-16 the owner selected A: most recently edited drawings first for the macOS preview,
with no sorting controls or manual reordering initially. Accepted drawing-content changes
update editing recency; simply opening or exporting and autosave completion do not reorder
items. Do not use asynchronous write-completion time as the editing timestamp.

Concrete S02 library metadata contracts must define persisted ordering, stable tie-breaking,
new/imported-item placement and clock-change handling. These details must preserve the selected
content-edit semantics and revision-safe persistence. UX/UI specify stable focus and gallery
updates in the reviewed design. No implementation is authorized by this choice.

## Architecture review — decision 21 (preview verification baseline)

On 2026-10-16 the owner selected A: the current Apple Silicon Mac and installed macOS, with
mouse/keyboard and Wacom Cintiq/Pro Pen 3, are the first macOS preview verification baseline.
Record actual Mac model/chip/memory, OS/SDK/toolchain, tablet/driver and display scale/refresh
before verification. Mouse/keyboard and physical tablet evidence are separate lanes; absence
of a device or permission is a gap, not a pass.

Other Macs, Intel and older macOS versions remain unverified, not deliberately prohibited.
Minimum deployment version remains an engineering proposal based on the required APIs and
reviewed compatibility scope. This does not change multiplatform architecture or authorize
other platform implementations. Physical pen-to-screen latency awaits a suitable camera;
software timing must not be presented as that measurement. No desktop reservation, code or
design review approval is granted by selecting a test baseline.

## Architecture review — decision 22 (library storage layout)

On 2026-10-16 the owner selected a separate SQLite library catalog plus one SQLite file per
drawing. The catalog supports gallery identity, display-name/ordering metadata and local
availability; drawing files contain editable artwork. Thumbnail caches remain disposable and
separate from authoritative artwork. Do not duplicate drawing content in the catalog or combine
the whole library's artwork into one database. Identity stays independent of names/paths and
future provider locations; this layout does not implement cloud synchronization.

S02 must define catalog/document metadata authority, cross-file reconciliation, staged creation/
import and interrupted deletion. Never assume separate catalog and document updates succeed
atomically. Concrete tables, constraints, journal/durability, connections, naming/file locations,
export snapshots and catalog recovery still require a visualized schema source schema and owner review.
This selects the storage layout only; no schema or application implementation is authorized.

## Architecture review — decision 23 (metadata authority)

On 2026-10-16 the owner selected A: each drawing document owns portable metadata, including
identity, display name and content revision/editing metadata. The catalog holds queryable copies
of that metadata and owns local location/availability information. Artwork stays in the document;
thumbnail previews remain disposable. Indexed document metadata may be reconstructed from valid
managed documents; do not promise recovery of every catalog-only setting or missing location.

Rename updates the document before refreshing the catalog entry. Interrupted refresh leaves a
repairable stale index, not two competing authorities. S02 specifies operation ordering, pending/
failed status, revision checks and reconciliation without claiming cross-file atomicity. Metadata
rename must not count as a drawing-content edit for decision 20's gallery recency. Opening,
exporting and save completion also do not change content-edit recency.

Review schema fields and separate content/metadata version semantics in the visualized S02
packet. Import-as-independent-copy still assigns new identity; exporting a snapshot does not
establish synchronization. Tests must cover rename failures, crash between writes, stale index
completion and catalog reconstruction without resurrecting deliberately deleted documents.
Documentation only; concrete schema, design review and implementation authorization remain pending.

## Architecture review — decision 24 (stroke sample storage)

On 2026-10-16 the owner selected one database row per sample. Store stroke-level properties
separately from ordered sample rows linked to the stroke. Positions and pressure/presence use
explicit fields; no packed sample-block encoding or custom binary sample codec is approved.
Persist validated actual samples belonging to completed strokes, never temporary predictions.
Exact tables, columns, numeric representations, constraints and indexes remain the visualized
S02 schema review deliverable.

This is a storage representation, not a per-input-event disk-write policy. Rust handles input
in memory; completed edits persist asynchronously under the selected bounded batching policy.
SQLite transactions must preserve complete stroke/revision consistency, not expose partial
strokes as durable success. Review sample ordering/uniqueness, stroke association, pressure
absence, bounds and deletion behavior, with round-trip and malformed-data tests.

Measure representative document size, load/save time and memory once implementation is
approved. Do not require a competing binary-block prototype or silently replace the selected
layout for presumed speed; a material change needs evidence and renewed owner review.
Documentation only; no schema implementation, dependencies or application code authorized.

## Architecture review — decision 25 (stroke transformations)

On 2026-10-16 the owner selected keeping original stroke samples and storing the current
transformation separately. Move/scale must not rewrite original sample coordinates. Store
translation and positive uniform scale alongside base stroke properties; scale applies to
stroke width as well as geometry, consistent with decision 17. This is current state, not a
persisted transform-operation history. Undo/Redo remains session-only. Rotation, nonuniform
scaling and flipping remain outside preview scope.

S02 reviews exact transform representation, composition/coordinate order, anchor math, finite
bounds, numeric tolerances and validation. Rendering, hit testing, selection handles, culling,
persistence and PNG export must interpret the same shared Rust transform semantics. Cache
invalidation includes transform changes. Cancel restores committed state; one completed move/
scale adds one Undo operation. Accepted content changes autosave with revision-safe transactions.

Tests must verify original samples survive move/scale/save/reopen unchanged, current transform
and scaled width round-trip, opposite-corner anchoring, composed moves/scales, cancellation,
Undo/Redo and agreement between visible artwork, selection/culling and exported output.
No schema, design review or application implementation is authorized by this documentation choice.

## Architecture review — decision 26 (document schema upgrades)

On 2026-10-16 the owner selected automatic upgrades with a recovery copy for supported, lossless
migrations between Linefield document versions. Preserve a consistent pre-upgrade copy before
migration; if that copy cannot be safely created, do not proceed with mutation. Migration failure
must preserve recoverability of the original and report the problem, never expose a partial
upgrade as a usable/successfully saved document. A failed item must not block unaffected drawings.

Changes that discard or alter artwork require a separately reviewed conversion flow. Newer
unsupported required schemas/capabilities remain untouched and unavailable for editing; no silent
field stripping or downgrade. Native Sketch legacy documents remain unsupported. Imported files
are migrated only in the staged independent copy, never by modifying their external source.

S02 reviews exact supported version paths, SQLite-consistent backup, validation/publication,
transaction/rollback and interruption recovery, storage bounds/retention, concurrency and UI
status. Recovery copies are specific to format upgrades, not a second routine autosave journal
or persistent Undo history. Catalog schema migration/reconstruction policy remains separate.
Tests cover each supported migration fixture, semantic preservation, copy failure/disk-full,
interrupted upgrade, retry and newer-version rejection. Concrete schema/design review and implementation
approval remain pending; documentation only.

## Architecture review — decision 27 (saved acknowledgement durability)

On 2026-10-16 the owner selected A: report Saved only after the matching document revision
commits successfully with the reviewed durable disk-synchronization settings. Queue acceptance,
transaction submission or a weaker commit policy is not a saved acknowledgement. Revision N
completion cannot mark newer N+1 content saved. Pending edits remain visibly pending; failed
commit/synchronization retains pending/failure state and follows decision 15's bounded policy.

Storage/synchronization runs off the input path on the bounded storage worker; do not wait for
disk in pen callbacks or change one-operation Undo/batched autosave semantics. No numeric save
latency promise or guarantee against hardware failure/misreported storage flushes is implied.

S02 must propose exact SQLite journal/synchronous and macOS/VFS flush settings, verify effective
configuration and define failure handling rather than silently weakening durability. Journal
mode is not selected by this decision. Test revision correlation, transaction/sync errors,
stale acknowledgements and recovery of acknowledged content using appropriate fault fixtures.
Process termination alone is not evidence of physical power-loss durability; label evidence
limits explicitly. Concrete settings/schema and implementation authorization remain pending.

## Architecture review — decision 28 (macOS SQLite journal mode)

On 2026-10-16 the owner selected A: WAL for the app-managed local macOS SQLite catalog and
per-drawing databases. Retain decision 27's durable synchronized-commit requirement; selecting
WAL does not permit weaker acknowledgement or silently changing synchronization policy.
SQLite owns its journal/recovery mechanisms. WAL is not user Undo or a custom event log.

S02 reviews bounded checkpoint scheduling/log growth, busy/long-reader behavior, connection and
sidecar lifetimes, effective-setting checks and failure/close/reopen handling. Disk/checkpoint
work stays off input callbacks, within reviewed worker ownership. A properly synchronized WAL
commit may be durable before checkpoint; Saved must not confuse checkpoint state with current
versus acknowledged document revision. A failed WAL configuration needs explicit handling, not
silent substitution or a false claim that WAL is active.

Native exports and migration recovery copies use consistent standalone snapshots, never a raw
copy of an active main database without its required state. Test sidecar preservation on crash,
checkpoint interruption/failure, reader-induced growth, disk-full/locks and independent snapshot
reopen. Do not assume catalog and document writes become atomic together. No live WAL-file
cloud synchronization/network-filesystem use is approved; future web/other hosts separately
review storage feasibility. Performance benefits remain unmeasured. Documentation only.

## Architecture review — decision 29 (Rust SQLite access)

On 2026-10-16 the owner selected rusqlite and asked to preserve browser/Wasm feasibility.
Use rusqlite in the macOS editor-services storage backend on the bounded storage worker;
no connection/SQL access in the pure editor engine or UI. Do not introduce SQLx or an async
runtime incidentally. Exact pinned versions, feature/build configuration and connections
remain S02 review items; no dependency installation or code is authorized.

Current upstream rusqlite documents ffi-sqlite-wasm-rs for wasm32-unknown-unknown. Its backend
and browser VFS are feasibility candidates, not validated Linefield support or an approved
browser topology. Share commands, semantic validation, schema/migrations and typed persistence
requests/results; isolate filesystem/VFS initialization, execution and durability capabilities.
Prefer reuse of SQL/mapping logic where validated; do not force native filesystem/thread calls
or macOS WAL/flush settings into browser builds. A separate browser adapter must not duplicate
editing policy or silently weaken the Saved contract.

Before freezing a storage contract that excludes the browser, prepare a feasibility plan for
worker-hosted SQLite persistence, reload/crash recovery, quota/lock/unavailable-storage failure,
macOS/browser document round-trips and migrations. Run it only after implementation/probe
authorization. Browser VFS, journal mode, capability-specific Saved semantics and exact dependency
versions still need review; native pass evidence does not prove web persistence.

Decision 29 reaffirmed on 2026-10-16: after clarification that browser SQLite can persist to
disk via browser storage and that WAL is database journaling, the owner confirmed proceeding
with rusqlite. Native selection stands; browser VFS/topology/durability remains a separately
reviewed feasibility item. This confirmation does not authorize code or installation.

## Architecture review — decision 30 (native UI state delivery)

On 2026-10-16 the owner selected A: change-driven native reads of Rust UI state, not a polling
timer or Rust-pushed state callbacks. Commands return a change summary; the host queries affected
UI projections and updates native controls. Rust remains authoritative for tool/settings,
availability and save status; native presentation snapshots do not become a second editor.
Canvas invalidation is separate from control refresh; do not copy all strokes to Swift or
refresh every control on each pen sample.

Background completion schedules delivery on the main thread; Rust validates session/operation/
revision, applies the result and produces the same change-summary/query path. The wake-up
mechanism is not permission for callbacks to mutate/reenter the editor. Exact bounded result
queue, scheduling/coalescing, query versions and lifecycle rules remain S02 review items.

One-time native effects such as an export panel are separate from durable/queryable UI state.
Specify effect identity, consumption/acknowledgement and cancellation so a state refresh cannot
replay a panel and a lost/stale completion cannot affect another session. Do not silently drop
required effects or introduce unbounded queues. Tests cover command and async updates, stale
completion, teardown, repeated reads, panel delivery and no per-sample full-control refresh.
Concrete ABI, identified design and implementation authorization remain pending.

## Architecture review — decision 31 (hybrid UI projections)

On 2026-10-16 the owner selected the hybrid approach: complete small snapshots for affected
control groups (toolbar, save status, selection summary), and bounded initial queries plus
typed insert/update/remove changes for large collections such as the gallery. Never transfer
all drawing geometry into Swift for this purpose. Rust remains authoritative; native code
retains presentation state only. This refines decision 30's change-driven reads, not its
threading or notification direction: hosts read/drain after change summaries/main-thread wakes,
without periodic polling or direct Rust-pushed state callbacks.

Collection delivery needs session/query identity, versions, atomic related updates, explicit
remove/clear semantics and a fresh bounded query when versions disagree or changes are missing.
S02 reviews snapshot-to-delta handoff, duplicates/out-of-order/gaps, sort moves, page boundaries,
query replacement, retained-history limits and teardown. Do not assume insert/update/remove
alone maintains a paginated sorted list. On overflow/history expiry, explicitly invalidate and
resynchronize instead of silently presenting incomplete state; no unbounded delta history.

Native controls may compare small snapshots and update only changed widgets. One-time effects
remain separate with explicit consumption/cancellation; resynchronization must not replay panels.
Concrete DTOs/ABI/queue capacities and platform presenters require review; no universal binary
patch protocol, generic UI framework, new features or implementation authorization is implied.

## Architecture review — decision 32 (UI boundary data ownership)

On 2026-10-16 the owner selected A: borrow native input buffers only for the duration of the
call and copy anything Rust must retain. Native hosts receive their own copies of UI snapshots
and bounded collection results. No long-lived native references/leases into Rust-owned UI
result buffers by default. Rust must not retain pointers into temporary Swift memory after
return; synchronous validation and rejection do not weaken caller memory-safety preconditions.

Keep sample inputs batched and output queries bounded. This does not copy the full document
into native code: editor/renderer geometry remains Rust-owned. Hybrid projections (decision 31)
and separate one-time effects (decision 30) remain selected. Opaque session/renderer handles are
not forbidden by this choice; their lifetime contracts remain distinct from result-buffer access.

S02 reviews exact fixed-size outputs, variable-size result copy/capacity negotiation, ownership
of temporary allocations, error/allocation/oversize behavior and atomic result delivery. A
failed or insufficient-capacity copy must not silently consume an effect/update or replay a
mutating command on retry. Test buffer lifetime, repeated reads, bounds, teardown, failure and
retained-data independence without claiming arbitrary foreign pointers can be validated safely.
A later zero-copy result exception requires measurements and renewed ownership review. No
concrete ABI, implementation or new runtime is authorized by this documentation decision.

## Architecture review — decision 33 (coordinate precision)

On 2026-10-16 the owner selected A: finite 64-bit floating-point document/sample coordinates
and transformation calculations, using the already-selected logical canvas units. Keep world
precision through semantic editing and persistence; convert visible geometry relative to the
viewport before lower-precision rendering conversion. This does not change Rust's renderer
ownership or authorize passing the full drawing to native UI.

S02 must review finite coordinate/zoom/scale bounds, exact transform composition and tolerances,
viewport-relative conversion order and backend limits. f64 does not make the canvas mathematically
unlimited or recover precision absent from device input. Reject non-finite/overflow/out-of-range
values safely; do not silently clamp or rewrite accepted geometry to fit a rendering backend.
Pressure and other non-coordinate field representations remain separate review items.

Test original-sample/persistence round-trips, repeated move/scale/Undo, far-from-origin scenes,
high supported zoom, cross-display mapping, bounds rejection, and rendering/hit-test/export
agreement. Proposed tests are not evidence of measured precision or performance. Concrete
numeric contracts/schema/design review and implementation authorization remain pending.

## Architecture review — decision 34 (pressure response)

On 2026-10-16 the owner selected A: a linear pressure-to-width response between a defined
minimum and the selected brush width. The selected brush width means maximum untransformed
width; mouse/unavailable-pressure input uses that selected width consistently. Pressure affects
width only, not opacity, and tilt remains ignored. Stored stroke transforms scale the resulting
appearance including width, consistent with decisions 17/25. No pressure-curve UI is approved.

S02 still specifies normalization, numeric representation, minimum width, pressure absence
versus a reported zero, contact-start/end rules, malformed/out-of-range rejection and geometry
algorithm version. Real pen contact must be distinguished from hover; no implicit new zero-
pressure or smoothing rule is selected. Verify the baseline with the Cintiq before claiming
natural feel or precision. A nonlinear tuned curve requires evidence and renewed review.

Tests cover endpoints/intermediate values and monotonic linear response, maximum/base width,
constant-width fallback, pressure presence, unchanged opacity/ignored tilt, scaled appearance,
reopen/render consistency and transient predictions. Real-device input evidence is separate
from injected samples. Documentation only; no algorithm/schema/design review implementation authorized.

## Architecture review — decision 35 (initial movement filtering)

On 2026-10-16 the owner selected A: no movement filtering for the initial pen. Construct
continuous stroke geometry from actual samples with round joins/caps, without deliberately
averaging away hand movement or introducing a smoothing/stabilization filter. Preserve the
selected linear pressure response. Edge antialiasing remains distinct from movement filtering;
this choice does not require jagged raster edges or a new quality control.

S02 reviews the exact stroke construction/interpolation, accuracy and corner-preservation
rules, duplicate/degenerate samples and contact endpoints. Do not hide simplification or
trajectory alteration inside geometry generation. Transient predictions, if supported by the
reviewed input contract, must never alter saved actual samples. No adjustable stabilization
UI or brush library is introduced. Later fixed filtering needs device evidence and renewed review.

Test sampled-path/endpoint/corner fidelity, degenerate samples, constant/variable width,
linear pressure consistency, cancellation, persistence/render/PNG parity and temporary
prediction replacement. Record real Cintiq behavior separately from replay; no claim of
natural feel, jitter elimination or measured latency from choosing this baseline. Documentation
only; concrete algorithm/schema/design review and implementation approval remain pending.

## Architecture review — decision 36 (PNG export bounds)

On 2026-10-16 the owner selected A: PNG export includes all artwork, using bounds enclosing
every committed stroke's visible extent, including pressure-derived width, caps/joins and
stored transforms, plus a small documented margin. No current-viewport choice or custom crop
tool is approved. Pan/zoom, selection, handles and temporary predictions must not determine
export bounds or appear in the image. Export uses a consistent reviewed document revision;
unfinished interaction handling remains a concrete contract item.

S02/S07E must specify margin units/rounding, antialiasing extent, empty drawings, far-off marks,
resolution/background and pixel/byte/work limits before allocation. Distant strokes must not
be silently ignored, cropped or removed to satisfy budgets. Report an oversized export clearly;
image resolution remains separate from editor viewport zoom. Exact dimensions, background and
export UI remain for review. Test all-artwork inclusion, transformed variable widths, extreme/
empty bounds, viewport independence and no mutation/false autosave acknowledgement. No code
or identified design approval is implied by this scope decision.

## Architecture review — decision 37 (PNG background)

On 2026-10-16 the owner selected A: PNG exports include the same fixed light artwork background
as the canvas, independent of system light/dark appearance. Composite strokes and the export
margin over that background so the output is opaque; no transparent-background option or
background picker is approved. Preserve saved artwork colors and existing stroke appearance.

S00/S02/S07E still review the exact shared background color, output color-space/encoding and
rendering comparison tolerances; do not assume pure white merely from the word light. Test
background/margin color, opaque output, edge compositing and unchanged export across system
themes. Bounds remain all artwork (decision 36); resolution is a separate pending choice.
No identified design, code or implementation approval is implied.

## Architecture review — decision 38 (PNG resolution policy)

On 2026-10-16 the owner selected A: a fixed export scale in pixels per logical canvas unit.
Compute PNG dimensions from all-artwork bounds plus the reviewed margin (decision 36), with
the opaque fixed light background (decision 37). Editor pan/zoom and display density do not
change export scale. No editable pixel-width control, size presets, DPI/print-size controls,
viewport selector or crop tool is approved for the preview.

S02/S07E must propose the exact pixels-per-unit constant, margin/rounding/minimum dimensions,
empty-content behavior and pixel/byte/work limits for review. Fixed scale does not imply one
pixel per unit or unrestricted allocations. Preflight with overflow-safe arithmetic before
allocation; excessive dimensions or budgets cause clear failure without silent downscaling,
cropping, stroke omission or changing document state. Cancellation and input responsiveness
remain required. Test expected dimensions, fractional/extreme bounds, width/transform inclusion,
zoom/density independence, budget rejection and independently decoded PNG fidelity.

This selects the policy, not its numeric constant or identified design presentation. No code,
render worker topology or implementation authority is introduced.

## Architecture review — decision 39 (Undo budget policy)

On 2026-10-16 the owner selected A: retire the oldest whole Undo operations as needed to keep
session history within its reviewed memory budget, while continuing ordinary editing. History
eviction must not delete artwork, change current document content/revision, mark pending edits
saved or create a new undoable operation. Recent retained operations remain valid; never retain
only part of a stroke/transform transaction. Session-only lifetime (decision 10) remains selected.

S02 reviews exact budget/accounting, structural sharing, Undo/Redo cursor and branch behavior,
transaction admission/headroom and release of history-only resources. An oversized single edit
must not be silently accepted without the agreed Undo guarantee; review explicit rejection/
cancellation before committing beyond capacity. Coalescing persistence cannot merge Undo steps.
Define native availability updates through the selected projection contract without inventing
a clear-history tool or new settings UI.

Tests cover old-operation retirement, retained undo/redo validity, whole transactions, unchanged
artwork/revision/save status during eviction, delete-history resource lifetimes, shared-allocation
accounting and oversized admission failure. Numeric caps remain pending; no claim of measured
memory efficiency or application implementation is authorized.

## Architecture review — decision 40 (upgrade-copy retention)

On 2026-10-16 the owner selected A: retain the latest pre-upgrade recovery copy per drawing,
representing the state immediately before the latest successful supported format upgrade.
This is not routine autosave history, persistent Undo or a three-generation archive.

Do not remove an older recovery copy until the new consistent recovery copy and upgraded
document have been validated. A failed/interrupted upgrade must preserve the recovery material
needed to restore the original. One retained copy is the steady-state policy, not permission
to delete protection while an upgrade is in progress; temporary old/new/staging files need
explicit bounded accounting and interruption-safe cleanup in S02.

If space/capacity is insufficient to create the required copy, stop the upgrade without mutating
the source or sacrificing the prior recovery copy. S02/S06 review identity/version metadata,
validation criteria, publication/cleanup ordering, retry/failed-delete behavior and interaction
with explicit permanent library deletion. Numeric caps and UI still require review; no surprise
cleanup of active failed-upgrade recovery state or independently exported user files.

Tests cover repeated upgrades, validated replacement, disk-full/copy failure, interruption at
each publication/cleanup boundary, cleanup retries and recovery after failure. Documentation
only; no filesystem cleanup, implementation or identified design approval authorized.

## Architecture review — decision 41 (unexpected editor failure)

On 2026-10-16 the owner selected A: isolate an unexpectedly failed editor session where safe
containment is possible. Disable further edits in that session, report failure and permit
recovery from validated saved content. Keep unaffected application functions available only
when their safety is established. Never resume mutation merely because an error was caught,
or autosave potentially corrupted state over a valid document. Unsaved work may be lost;
report that honestly rather than promising recovery from arbitrary in-memory state.

This is distinct from ordinary storage/validation failures and decision 15's bounded retry
policy. S02 defines the failed-session state, safe queries/teardown, worker/effect invalidation,
in-flight write ownership and fresh-session recovery boundaries. Previously validated immutable
write inputs require explicit treatment; do not claim cancelling a job undoes a committed write.
Late results cannot revive a failed session or mutate its replacement. Recovery never makes a
partial/unknown state implicitly valid. No speculative salvage feature is authorized.

Some runtime faults/process termination cannot be safely contained and require relaunch. Do
not claim panic catching protects against arbitrary corruption, aborts or allocation failure.
Record bounded correlated redacted diagnostics without dumping document data; diagnostics
failure must not prevent safe handling. Exact ABI/build failure policy and identified recovery
UI require review. Test injected containable failures, blocked edits/tainted saves, stale work,
validated recovery and unaffected functions separately from crash/relaunch cases. Documentation
only; no implementation, fault injection run or native desktop reservation authorized.

## Architecture review — decision 42 (portable identity and local keys)

On 2026-10-16 the owner selected a hybrid: UUIDv4 for portable document/stroke identity,
local integer keys for SQLite relationships, and ordered sample indices. Do not add UUIDs to
every sample or duplicate identifiers in tables where they serve no purpose. Proposed stroke
rows have a local integer primary key plus a non-null unique UUID; sample rows reference the
local stroke key and have a unique ordered index within that stroke. Exact schema/storage
representation remains the visualized S02 review deliverable.

Shared commands and external references use stable document/stroke identity, not storage row
numbers. Local keys are scoped to their database, may be remapped during reconstruction/import,
and must not determine drawing order, sample order or gallery recency. Catalog document UUID
references are application-managed across files, not assumed cross-database foreign keys.
Object/session handles remain a distinct lifetime mechanism, not substitutes for portable IDs.

Rename/move/scale/save preserve identity. Independent document import still creates a new
document UUID (decision 9); exact stroke-identity copying/remapping policy remains for review.
UUID generation/validation, uniqueness scopes, binary/text storage, mapping cleanup, safe
native/Wasm representations and random-source failure need concrete S02 contracts. No gapless
or never-reused integer-key guarantee, custom ID generator, UUIDv7 or sync protocol is selected.

Test duplicate rejection, UUID/local-key mapping, sample associations/order, remapped local keys,
round-trips and stale/deleted-row handling without exposing local row IDs as durable identity.
Performance benefits require measurement. Documentation only; no schema implementation approved.

## Architecture review — decision 43 (independent import identities)

On 2026-10-16 the owner selected A: independent native-document import assigns a fresh UUIDv4
to the document and every imported stroke. Remap all affected internal references in the staged
copy before validation/publication; do not change the external source. Geometry, original sample
order/values, styles, transforms and drawing order remain semantically unchanged. Local integer
keys may be retained or remapped as storage details, but their associations must stay correct.

Repeated imports must create independent identities rather than merge or overwrite existing
items. Ordinary saves, reopen and supported schema upgrades preserve identities. Future transfer
of the same document through synchronization has different identity semantics and remains out
of scope; import is not an implicit replica or lineage/tracking feature.

S02/S06 define complete mapping, randomness/collision failure, validation, bounded staging,
transaction/publication ordering and cancellation/crash cleanup. Reject malformed source
associations before silently guessing repairs. No partially remapped or incomplete item may be
published as a successful import. Test source bytes unchanged, new document/stroke UUIDs,
repeated-import disjointness, reference integrity and identity-independent artwork equivalence.
No concrete schema, design review or implementation authorization is implied.

## Architecture review — decision 44 (duplicate display names)

On 2026-10-16 the owner selected A: different library drawings may have identical display names.
Names are presentation metadata, not identity or uniqueness keys. Document UUIDs distinguish
items; duplicate names cannot merge/overwrite documents or redirect commands to the wrong item.
Do not enforce UNIQUE on document display names or automatically rename imported items merely
to avoid a duplicate library label. App-managed storage locations use internal identity.

Create/rename/import/delete and gallery selection must target identity even when labels match.
design review must show usable disambiguation/accessibility within the approved thumbnail/metadata
presentation, without adding unapproved search or sorting features. Native export filename
collisions are a separate file-panel/overwrite policy, not permission for library overwrites.

S02 reviews display-name validation/length/empty/default/localization handling separately;
allowing duplicate labels does not disable input validation. Test same-name creation/import/
rename, Unicode/case variants, stable identity-specific selection/deletion, persistence/catalog
reconstruction and source preservation. Log no raw names. Documentation only; no exact name
validation rule, new UI, schema implementation or identified design approval is implied.

## Architecture review — decision 45 (numbered default drawing names)

On 2026-10-16 the owner selected B: newly created library drawings receive automatic numbered
display names, for example Untitled and Untitled 2 in the initial English locale (first-name
correction recorded below). Creation
requires no naming dialog; renaming remains available in the gallery. Numbering is a default
label policy, not portable identity, drawing order or a name-uniqueness constraint.

Decision 44 still allows duplicate labels after rename or import. Do not renumber existing
items or force suffixes on imported names. Persist the assigned display name as document
metadata and index it in the catalog under decision 23; ordinary reopen must preserve it.
Localize the complete default-name template through native resources without duplicating shared
creation behavior in hosts. The exact locale/number formatting contract remains S02/CT-09 work.

The number allocation policy (monotonic sequence versus gap reuse), counter scope/storage,
handling of failed creation/retry, catalog rebuild and existing matching names still need review.
No gapless numbering or unique-label guarantee is selected. Test numbered creation, persistence,
rename/import duplicate compatibility, restart and failure handling under that reviewed policy.
Documentation only; no schema, design review or implementation approval is implied.

## Architecture review — decision 46 (increasing default-name numbers)

On 2026-10-16 the owner selected A: automatic default-name numbers keep increasing rather
than reusing gaps. After creating Untitled, Untitled 2 and Untitled 3 and deleting Untitled 2, the next newly
created drawing is Untitled 4. Renaming or deleting an item does not free its number; existing
items are never renumbered. Preserve sequence progress across ordinary app restarts.

This is a default-label sequence, not document identity, content ordering, a gapless promise
or a name-uniqueness constraint. Decision 44 still permits duplicate names. Imported and
user-entered names do not become authoritative sequence records merely by matching the template.

S02 must propose the concrete sequence scope, durable allocation and retry semantics, catalog
rebuild/recovery behavior, overflow handling and cross-file publication ordering. Do not infer
historical allocation solely from currently visible names or silently reset after ordinary restart.
Loss of counter metadata needs an explicit recovery contract; no universal never-reuse guarantee
across lost/restored libraries or future independent devices is implied. These are review items,
not permission to add a second persistence mechanism or schema without review.

Extend LIBRARY-CREATE-001 with create 1-3/delete 2/create 4, rename/reopen and restart continuity;
cover failed creation, retries and catalog recovery under the reviewed concrete contract.
Documentation only; no implementation or design review approval is implied.

### Owner correction to decisions 45-46 (first default name)

On 2026-10-16 the owner clarified that the first drawing must be named Untitled, without a
numeric suffix. The sequence is Untitled, Untitled 2, Untitled 3, and so on. This changes only
the first label: increasing allocation, no gap reuse, duplicate-name permission and UUID identity
remain unchanged. Deleting or renaming the first drawing does not reset the sequence. Localize
the unsuffixed first label and complete numbered template; test first creation and subsequent
names across restart. The stroke-appearance storage question remains unanswered. Documentation only.

## Architecture review — decision 47 (per-stroke appearance properties)

On 2026-10-16 the owner selected A: each stroke stores its own appearance properties, including
color, base width and the parameters required by the approved solid round pen. There is no
shared style-record table or mutable style reference in the initial document design. Repeated
property values are acceptable. This does not add brush presets or new pen controls.

Changing current pen settings affects future strokes, not existing artwork. Shared Rust owns
validation and stroke semantics; native controls express settings through shared commands.
Keep actual samples, stroke appearance, the separately stored transform and disposable renderer
caches distinct. Width retains decision 34's maximum-untransformed-width meaning; decision 25's
uniform transform scales the rendered width without rewriting the base property or samples.
Skia/native paint objects never become stored document properties.

S02 must specify exact fields, types, color encoding, numeric bounds/defaults, schema/algorithm
versioning and the setting-capture rule at stroke start, including settings commands during an
active stroke. No mid-stroke settings behavior is implicitly selected by storage ownership.
Future resource-backed brushes require a separate reviewed extension, not premature style tables.

Test independent stroke properties, settings changes leaving existing strokes unchanged,
validation/rejection, Undo/Redo, save/reopen/import equivalence, transformed width, cache
invalidation and PNG appearance. Native control E2E and shared semantic tests remain separate.
Documentation only; concrete ABI/schema and identified design approval still precede implementation.

## Architecture review — decision 48 (sRGB initially; future color spaces)

On 2026-10-16 the owner selected sRGB for the initial release and requested documenting that
other color spaces may be considered later. Stored artwork colors and PNG output use explicitly
defined sRGB semantics. Record the document color space in the reviewed format contract; do not
infer it from the current display, native picker, platform or system theme. Each stroke still
owns its appearance properties under decision 47; this does not require a per-stroke space tag.

Native color selection, Skia surfaces and export must preserve those semantics through explicit
color management. Rendering to a display does not change stored artwork. S02 specifies channel
types/precision, transfer/compositing and alpha conventions, conversion of picker colors outside
sRGB, output metadata and comparison tolerances. Selecting sRGB does not by itself select an
8-bit storage representation or require all internal rendering math to use encoded sRGB values.
The fixed light canvas background still needs its exact approved color.

Future candidates may include Display P3 or other color spaces. This is a documented extension
point, not authorization for wide-gamut/HDR features, profile selectors, dependencies or a generic
profile framework now. A later proposal must review schema/version compatibility, old-document
appearance preservation, picker/display conversion, export metadata and cross-platform tests.
Never reinterpret existing sRGB channel values as another space without an explicit conversion.
Unsupported future color-space documents must not be silently treated as sRGB.

Plan save/reopen/import color round-trips, native picker conversion, canvas/PNG equivalence,
independent PNG metadata/decoder checks and system-theme invariance. Distinguish numerical/color
management checks from actual display validation; identical physical appearance across unverified
screens is not promised. Documentation only; no implementation or design review approval is implied.

## Architecture review — decision 49 (confirmed exit after save failure)

On 2026-10-16 the owner selected A: when local autosave fails and leaving would release unsaved
work, offer Retry, Stay and an explicitly confirmed Leave Without Unsaved Changes path. Stay is
the safe default. Apply the same shared policy to gallery return, document replacement, window
close and quit where they release the editing session. Exact native wording/layout and identified
design version still require design approval; no ordinary prompt is needed for a saved drawing.

Consent covers only the current session's not-yet-persisted edits at the reviewed revision.
Leaving does not revert committed SQLite changes, restore the document to its opening state,
delete the library drawing or clear the document's durable content. Stay/cancel preserves the
session, pending edits and Undo/Redo. Retry does not bypass revision-aware persistence rules.
History ends only when the session actually ends, consistent with decision 10.

S02 must specify the pending-exit state machine, consent revision binding/revalidation and
coordination with queued/in-flight writes. Cancellation cannot undo a committed write; settle
or explicitly account for commit outcomes and prevent stale work from reviving a released
session. New edits or changed save outcomes cannot be silently covered by obsolete consent.
Do not report successful abandonment, saving or navigation while its required state is unresolved.
Never block the input callback on disk work. Failed target opening retains the old session
under INV-07; confirmation alone is not authorization to destroy it before replacement succeeds.

Tests cover Retry, default Stay/cancel, explicit confirmed exit and independent reopen; saved
content remains, abandoned unsaved work is absent. Exercise newer revisions, in-flight commit
races, repeated exits, failed replacement and stale completions. Log bounded redacted outcomes
and correlation, never drawing content. Concrete state/ABI contracts and real native E2E remain
pending. Documentation only; no implementation or design review approval is implied.

## Architecture review — decision 50 (block style changes during active strokes)

On 2026-10-16 the owner specified that style changes must not be allowed during an active
stroke. This supersedes the proposed alternatives of accepting settings for the next stroke
or cancelling the unfinished stroke to apply them. Disable color/base-width and other approved
style controls/actions while a stroke is active. Shared Rust command validation enforces the
same rule regardless of origin; native disabled controls alone are insufficient.

Reject style-change commands during the active stroke with a typed unavailable/busy outcome.
Do not mutate current pen settings or stroke properties, queue the change for later, cancel the
stroke, split it or create an Undo entry. Availability returns after normal stroke completion
or cancellation, subject to other existing state restrictions. Pressure samples still vary width
under the fixed per-stroke pressure rule; that is not a style-settings change.

S02 specifies ordering at begin/end/cancel boundaries and authoritative availability updates.
Already-open native color panels, delayed callbacks and shortcuts must not bypass the guard;
rejected callbacks leave controls reflecting accepted shared state. Future agent-origin commands
must use the same guard when introduced; no agent transport is authorized now. Log bounded,
redacted command rejection/outcome events, not samples or color values.

Extend DRAW-001/core/bridge cases with rejected changes from all implemented origins, unchanged
pen and stroke state, no delayed replay/extra Undo, completion/cancellation re-enablement and
native disabled/focus behavior. Actual native E2E is separate from injected command tests.
Documentation only; concrete contracts/design review and implementation remain subject to review.

## Architecture review — decision 51 (export latest completed artwork)

On 2026-10-16 the owner selected A: native-document and PNG exports capture a consistent
snapshot of the latest completed artwork, including completed edits not yet durably autosaved.
Do not silently substitute the last saved library revision. Later edits cannot alter an export
snapshot already captured. Unfinished strokes/transforms, temporary predictions and selection
handles are not exported artwork. Availability during an active gesture remains a separate choice.

Export success acknowledges only the independent exported artifact. It does not advance the
library's durable revision, clear pending/failed autosave state, reset Undo history or relocate
its storage. Export may be attempted during a recoverable local save failure if the editor state
is valid and resource/destination constraints permit; it is not guaranteed to succeed when the
same storage fault affects the destination. Failed-session isolation under decision 41 still applies.

S02 defines the capture point relative to native destination panels, immutable snapshot ownership,
revision/metadata consistency, bounded resource admission, cancellation and publication. Keep the
approved thread topology; no implicit new executor or GPU ownership change. Native SQLite output
must independently represent the captured revision, including unsaved completed changes; backing
up an older library database alone is insufficient. Review that construction path without adding
a second autosave journal or forcing a successful library flush as an export prerequisite.

Test pending/failed autosave with newer completed artwork, concurrent later edits, independent
native reopen and PNG decoding, and unchanged library durability/history after success/failure.
Verify temporary interaction state is excluded under the separately reviewed gesture policy.
Documentation only; exact schema/ABI/export contracts, design review and implementation remain pending.

## Architecture review — decision 52 (block export during editing gestures)

On 2026-10-16 the owner selected A: disable both native-document and PNG export while a stroke
or move/scale gesture is active. Shared Rust validates this availability at the command boundary;
menus, controls and shortcuts reflect the same state. Reject attempts with a typed unavailable/
busy outcome, without opening a destination panel, queuing an export, committing/cancelling the
gesture or changing history. Completing/cancelling the gesture restores eligibility subject to
other existing restrictions; export still requires a new explicit request.

Decision 51 remains authoritative once export is accepted: capture the latest completed artwork,
including unsaved completed edits, with no later mutation of the captured snapshot and no library
Saved acknowledgement. A previously captured export need not be invalidated merely because a
later editing gesture begins. S02 must define ordering and revalidation if a destination panel
or pending request spans a gesture transition; no late callback may bypass current admission or
silently include transient state. This decision does not add a blanket pan/zoom export restriction.

Test each active interaction, all implemented command origins, disabled native actions, unchanged
gesture/history/save state on rejection, no deferred replay, and eligibility after end/cancel.
Exercise begin/end races and previously captured exports independently. Log bounded redacted
command outcomes without document data. Native UI acceptance is separate from injected tests.
Documentation only; exact contracts/design review and implementation approval remain required.

## Architecture review — decision 53 (blank PNG for empty drawings)

On 2026-10-16 the owner selected B: permit PNG export of an empty drawing as a blank image at
predefined dimensions. Do not disable export merely because the completed document contains no
artwork. Exact dimensions remain for owner review; neither a proposed size nor the current window
size is approved implicitly. This does not add export-size controls or a finite document page.

Use the approved fixed light background, opaque output and explicit sRGB semantics. Empty output
is independent of viewport pan/zoom, window size and display density. Nonempty drawings retain
all-artwork bounds plus margin and the selected fixed pixels-per-logical-unit scale. S02 must
define the empty fallback separately so dimension rounding/margins are not applied ambiguously.
A drawing containing a valid point-like mark is not empty merely because its geometric extent
is degenerate; use the reviewed stroke-geometry bounds rules.

The active stroke/move/scale export guard still applies. Capture completed state under decision
51; exporting neither creates artwork nor changes library save status/history. Empty library
items remain retained, and native-document export continues under its existing policy.

Extend EXPORT-001 with newly created empty drawings, deletion of the last stroke, Undo/Redo
across empty/nonempty states, independent PNG dimensions/opaque-background/color checks and
viewport/display independence. Resource, cancellation and destination failure handling still
apply. Documentation only; dimensions, concrete contracts/design review and implementation remain pending.

## Architecture review — decision 54 (empty PNG dimensions)

On 2026-10-16 the owner selected B: an empty drawing exports a blank PNG exactly 1920 pixels
wide by 1080 pixels high. This resolves decision 53's pending dimensions. The entire image uses
the approved opaque fixed light sRGB background; do not add margins beyond those dimensions or
multiply the output by display scale, zoom or the nonempty artwork export scale.

This is only the empty-drawing fallback, not a finite canvas/page, export-size control or change
to nonempty all-artwork bounds plus margin. Keep existing active-gesture guards, snapshot and
library-save-state rules. EXPORT-001 must independently decode and verify 1920-by-1080 output,
background/opacity/color metadata and invariance under viewport/window/display changes.
Documentation only; no implementation, executed app test or design review approval is implied.

## Architecture review — decision 55 (macOS declaration generation)

On 2026-10-16 the owner approved cbindgen-generated C headers plus a small handwritten Swift
wrapper for the macOS typed Rust interface. Rust C-compatible entry points and data declarations
are the generation source. The generated header describes the boundary; it is not handwritten C
application behavior or a custom serialized command transport. Shared Rust commands, validation,
state ownership and structured outcomes remain authoritative.

Swift owns the native presentation adapter and reviewed handle/buffer/result lifetime management.
cbindgen does not generate that safe Swift wrapper or prove pointer ownership, thread affinity,
error/panic safety or correct release. Keep those rules explicit and covered by boundary tests.
Do not put editing, saving or Undo policy in the wrapper. This choice does not adopt UniFFI,
change the thread topology or force Android/JNI and browser/Wasm through the macOS ABI shape.

S01 proposes and pins a verified compatible cbindgen version and reproducible generation command
when implementation is authorized. S02 presents actual signatures, DTOs, handles, ownership and
error/lifetime diagrams with rejection cases for owner review before implementation. Require
header drift checks, Rust/Swift compile/link conformance and tests for borrowed-input lifetime,
owned-result copies, stale/wrong-thread handles, capacity failures and cleanup. Generated files
have explicit quality exclusions; the handwritten Swift wrapper obeys the 200-line source limit.

Documentation only: no dependency installation, generator execution, compile probe or app code
is authorized by this approval. [Official cbindgen documentation](https://github.com/mozilla/cbindgen).

## Architecture review — decision 56 (manual save requests an immediate flush)

On 2026-10-16 the owner selected A: Command-S and the Save menu request persistence of completed
edits now, bypassing the ordinary autosave batching delay. They dispatch the same shared Rust save
command through the existing storage worker, without a filename dialog, storage relocation or a
second save implementation. Native-document export remains a separate action. After a recoverable
local save failure, manual Save requests a retry under the existing failure/safety rules.

Saving remains asynchronous: an immediate request is not an immediate disk-completion guarantee.
Respect ordered writes, valid editor state and resource limits; do not interrupt an in-flight
transaction or block input on disk. Coalesce repeated requests into bounded work. A fully saved
unchanged document needs no redundant write. Only a matching durable commit advances saved
revision; newer completed edits remain pending, and an older completion cannot mark them Saved.

A manual save does not finish, cancel or persist an unfinished stroke/transform, nor create an
Undo entry or clear history. Persist the latest completed state available to the save request;
later completed edits follow normal autosave scheduling unless included by the reviewed safe
coalescing rule. Preserve active input, native first-responder text editing and IME semantics.
No filename/export panel or forced field/gesture commit is introduced by the shortcut.

S02 specifies command/result mapping, completed-revision targeting, idle/in-flight/failed cases,
retry/coalescing and native availability. Log bounded correlated intent/outcome events centrally,
without document data. Test shortcut/menu equivalence, batching bypass, repeated requests,
write failures/retry, older completion/newer edits, active gestures and unchanged history; native
focus/shortcut E2E remains separate from injected command tests. Documentation only; concrete
contracts, identified design states and implementation authorization remain pending.

## Architecture review — decision 57 (restore device-local viewport)

On 2026-10-16 the owner selected A: reopening a library drawing restores its last valid canvas
position and zoom from device-local library metadata. Without valid saved view metadata, fit
the artwork; use a reviewed default view for an empty drawing. Normal launch still opens the
gallery under decision 19, not the last editor. Restoring the view does not restore selection,
unfinished interactions or Undo/Redo history.

Keep the view separate from portable artwork, document content revisions and exported native/
PNG data. Panning/zooming creates no Undo entry, does not change content-edit recency and does
not mark artwork dirty. Other devices may maintain independent views. Independent imports get
new library identity and no implicit source-device view. This selects local view persistence,
not cloud synchronization or a new preference screen.

S02 proposes local metadata fields keyed by document identity, finite coordinate/zoom validation,
viewport mapping across window/display changes and asynchronous bounded/coalesced persistence.
Do not write on every input sample/frame or wait for disk on the input path. Define update
ordering and stale-session rejection, cleanup on deletion and behavior after catalog rebuild or
view-write failure. Missing/lost/corrupt view metadata must not block otherwise valid artwork;
fall back safely without claiming every pre-crash pan/zoom was durable. A view-storage failure
must not falsely change artwork Saved status. Do not log raw view coordinates or document paths.

Test reopen and ordinary restart restoration, fallback for absent/invalid view, empty drawings,
resized windows/display changes and stale writes/deletion. Verify unchanged content revisions,
recency/history and exported artwork. Shared fixtures and real native navigation/pan/zoom E2E
are separate evidence. Exact schema/geometry/design review details remain review items; documentation only.

## Architecture review — decision 58 (per-drawing local pen settings)

On 2026-10-16 the owner selected B: remember current pen color and width separately for each
library drawing on this device. Reopening/switching to a drawing restores its last valid local
pen settings, including across ordinary application restarts. Settings apply to future strokes;
existing strokes retain their own properties under decision 47. This does not restore selection,
Undo history or unfinished gestures, or select a policy for remembering the active tool.

Store these settings as device-local library metadata keyed by document identity, separate from
portable artwork, exported files, content revisions and content-edit recency. A settings change
alone creates no artwork Undo entry or document-content save obligation. Restoration and native
controls reflect validated shared Rust settings. Decision 50 still blocks style changes during
an active stroke; switching documents must follow the existing interaction/navigation guards.

S02 proposes fields, finite width/color validation, reviewed fallback defaults for missing/invalid
metadata and bounded asynchronous/coalesced persistence. Define cleanup on deletion, stale-session
rejection, rebuild and preference-write failure without changing artwork Saved status or blocking
otherwise valid drawings. New/imported identities without local settings use reviewed defaults;
do not infer local pen preferences from imported stroke styles. Other devices may have independent
settings; no preference synchronization or settings screen is authorized. No raw preference values
or document paths in logs.

Test two drawings with distinct settings, switching/reopen/restart, defaults/invalid metadata,
active-stroke rejection and stale completions. Verify existing artwork, Undo, recency and exports
remain unchanged. Shared tests and native control/restoration E2E remain separate. Documentation
only; concrete schema/contracts/design review and implementation still require review.

## Architecture review — decision 59 (extensible per-tool local settings)

On 2026-10-16 the owner clarified decision 58: per-drawing, device-local settings must support
future tools and their settings, not be architecturally limited to pen color and width. Model
settings by stable tool identity with typed, validated settings definitions owned by shared Rust.
Native hosts present the controls appropriate to each approved tool through the shared command
boundary; no hardcoded universal two-property preference interface.

Initially only the approved pen settings are implemented when authorized. Adding a tool extends
its typed settings, defaults/validation, persistence/version handling, native presentation and
conformance tests; it does not require redesigning unrelated tool preferences. Do not overwrite
one tool's settings when changing another. Each tool defines interaction-time availability;
the existing active-stroke style guard remains mandatory. This does not approve future tools,
restore active tool selection, add presets, sync, plugins or an agent transport.

Keep editable tool preferences separate from artwork properties captured by operations and from
transient gesture/session state. Preference changes alone do not mutate existing artwork, Undo,
content revisions/recency or exported documents. Data required to reproduce artwork belongs in
its document model; local preferences must never become required for rendering saved content.

S02 proposes the concrete typed settings/command contract and database representation, including
schema/version migration, unknown/unsupported settings handling, bounded payloads, defaults and
failure/rebuild semantics. Do not silently choose a generic JSON/binary property bag, dynamic
schema system or key-value/entity-attribute-value database as a consequence of extensibility.
The concrete representation still requires review. Test tool isolation, per-drawing restoration,
validation, version/fallback behavior, active-interaction rejection and unchanged artwork using
only approved tools or clearly identified non-product contract fixtures.

Documentation only. The preceding import-navigation A/B question remains unanswered.

## Architecture review — decision 60 (open imported drawing immediately)

On 2026-10-16 the owner selected A: after successful native-document import, open the independent
library copy immediately. Resolve the current drawing's interaction/save/exit guards before
switching; no source-session release merely because an import request or confirmation occurred.
If import or target opening fails, preserve the current editing session, artwork, pending state
and history under INV-07. Accepted replacement ends the old session under decision 10.

Preserve existing import-as-copy semantics: fresh document/stroke identities, unchanged external
source and no source write-through. Opening the imported copy uses its new identity and the
reviewed defaults for missing local viewport/tool preferences. Normal launch without an explicit
import request still enters the gallery; this decision does not restore the last editor.

S02/S06 specify staging/validation/publication/open ordering, cancellation, stale completion
rejection and focus/route transitions. Distinguish import success from editor-open success: if
publication already succeeded but opening fails or navigation is cancelled, do not silently
remove a valid imported library item or report that the external source was changed. Present
accurate outcomes under reviewed UX; no rollback of another drawing's already committed writes.

Test import from gallery and editor, pending/failed-save guards including Stay, repeated requests,
failed validation/open, cancellation and late completions. Verify the correct imported UUID is
opened, source bytes remain unchanged and prior history is cleared only on actual replacement.
Native picker/navigation/focus E2E and shared state/storage tests remain separate. Documentation
only; exact contracts/design review and implementation remain pending.

## Architecture review — decision 61 (restore active tool per drawing)

On 2026-10-16 the owner selected A: reopening a drawing restores its last active tool from
per-drawing, device-local metadata. For the first editor this means Pen or Select. New drawings
and missing/invalid/unavailable saved tool identities fall back to Pen. This extends decisions
58-59, which preserve each tool's settings independently; switching tool must not overwrite the
other tool's settings. Restore the relevant validated settings for the selected tool.

Restore only tool mode, never selected strokes, unfinished gestures or Undo/Redo history.
Active-tool preferences are not portable document content, exports, content revisions or
content-edit recency. Gallery remains the launch destination; normal session/interaction guards
still apply. Native presentation follows authoritative shared tool state rather than enabling
unsupported commands from stored metadata.

S02 specifies stable tool identity, availability checks, initialization ordering, fallback,
bounded local writes and stale-session/rebuild/failure handling. Future host capability rules
must override local preferences; this preview's Pen fallback does not authorize editing on a
view-only host. Future tools still require explicit approval. Exact schema and treatment of
unavailable stored IDs are concrete contract items, not a generic plugin registry requirement.

Test separate drawings last using Pen and Select, switch/reopen/restart, missing/invalid tool
fallback, independent tool settings and native control state. Verify no selected stroke/gesture/
history restoration and unchanged artwork/save status/recency/exports. Shared tests and native
reopen/focus E2E remain separate. Documentation only; no implementation or design review approval implied.

## Architecture review — decision 62 (gallery thumbnails fit all artwork)

On 2026-10-16 the owner selected A: gallery thumbnails show all artwork fitted with a small
margin, independent of the last editor viewport. Include full transformed/pressure-derived
stroke extents; do not crop to the last viewed area or omit distant marks to enlarge details.
Panning/zooming alone must not change the thumbnail framing. Decision 57 still restores the
last local viewport when opening the drawing; thumbnail overview and editor view are distinct.

Keep thumbnails disposable and separate from document authority, local view preferences and
export dimensions. Use the approved fixed light artwork background and color semantics; exclude
selection handles, predictions and unfinished gestures. Empty drawings use a reviewed blank
thumbnail presentation, not an assumption that thumbnail pixels equal the empty PNG export size.
Exact thumbnail dimensions/margin, visual empty/loading/error states and accessibility text
belong in the identified design/S02 review.

S02 defines the content revision source, generation timing, bounded rendering/storage/work,
cache keys, stale completion rejection and eviction/regeneration. Do not introduce a new render
thread/GPU owner or on-ink-path disk/GPU wait. A missing/failed thumbnail cannot block valid
artwork opening, change Saved status or make the cached image authoritative. Do not claim a
specific current/saved revision policy is selected merely by choosing thumbnail framing.

Test complete extents, distant/transformed marks, empty drawings, view independence, content
update/Undo invalidation and stale results/deletion/cache eviction. Real gallery appearance/AX
review and native E2E remain separate from geometry/cache fixtures. Documentation only; no
implementation or identified design approval implied.

## Architecture review — decision 63 (confirm export replacement)

On 2026-10-16 the owner selected A: when native-document or PNG export targets an existing file,
require explicit replacement confirmation through the native save workflow. Allow choosing a
different name/location or cancelling; no silent overwrite or mandatory automatic suffix policy.
This concerns external destination files, not library display-name uniqueness or autosave paths.

Prepare and validate the complete exported artifact before replacing the destination. Generation,
validation or pre-publication failure/cancellation must leave the existing destination intact.
S02/S06 review bounded staging, same-filesystem replacement where supported, durability, cleanup,
interruption outcomes and changed-target races. Do not promise atomic replacement on every provider
or report success for an unresolved outcome. Consent is tied to the destination being replaced;
revalidate if it changes materially rather than treating an old confirmation as blanket consent.

Export cannot overwrite app-managed live document/catalog files or required sidecars as if they
were independent export destinations. An import never writes through to its source; any later
user-selected external replacement is a separate explicitly confirmed export operation, not an
automatic save association. Preserve library saved revision/history/status and snapshot semantics.

Test new destination, confirmed replace, cancel/rename, generation failure, publication failure,
interruption and target races for native/PNG output. Verify old bytes survive failure before
replacement and validate the published artifact independently. Native confirmation/focus tests
are separate from storage fault injection. No double confirmation dialog is required if native
confirmation fulfills the reviewed contract. Documentation only; implementation/design review remain pending.

## Architecture review — decision 64 (one-second autosave batching cap)

On 2026-10-16 the owner selected A: deliberately batch completed unsaved edits for at most one
second before requesting persistence. Measure the deadline from the oldest completed unsaved
edit in the pending batch with a monotonic clock. New edits must not reset that deadline or
starve continuous-drawing persistence. Earlier writes are permitted; Command-S/Save bypasses
batching under decision 56. Normal accepted exit still requests flushing under decision 11,
with decision 49's explicit save-failure abandonment exception.

This is the normal scheduling/batching limit, not a guarantee that writes start or durably finish
within one second. Ordered in-flight writes, runtime scheduling, storage faults and bounded retry
may delay completion; report pending/overdue/failure truthfully. Never mark content Saved from a
timer or spawn extra unbounded write jobs to meet it. Keep requests coalesced and preserve the
age of pending work when handling older completions and newer edits.

Only completed shared edits enter autosave; do not force unfinished strokes/transforms to commit.
Persistence remains asynchronous on the existing worker, with no disk wait in input callbacks.
S02 specifies exact batching/coalescing implementation, in-flight/pending revision accounting,
retry scheduling and deadline-overrun diagnostics within existing resource/privacy bounds.

Test deterministic clock boundaries, continuous edits, Command-S/exit bypass, old completions,
worker backlog, failure/retry and no timer-based false Saved state. Measure actual completion,
unsaved exposure and drawing responsiveness on the declared Mac/Cintiq later; do not conflate
these measurements with the scheduling cap or physical pen-to-screen latency. Documentation only;
implementation, concrete budgets/contracts and native execution remain pending.

## Architecture review — decision 65 (rotating JSON Lines diagnostics)

On 2026-10-16 the owner selected A: store structured application diagnostics in rotating local
JSON Lines files for the initial native preview. Use UTF-8, one bounded JSON event object per
line and a newline terminator. Keep logs separate from document/catalog databases and expose a
reviewed versioned event schema suitable for later TypeScript processing. No SQLite diagnostics
database or new app command transport is selected.

Preserve CT-07's correlated intent/command/state/worker outcomes and redaction allowlist: no
content, coordinates, names/paths, credentials or raw errors containing them. No per-sample
production logging, automatic upload or unbounded trace mode. Native and Rust events follow
shared correlation semantics; a bounded queue drains off input callbacks. Rotation, retention,
encoding and sink failures cannot block or fail successful editing. Count drops/failures through
bounded non-recursive diagnostics, without promising every event survives a crash.

S02 specifies exact event fields, sink/library/version, app-private location/permissions, queue
and record limits, rotation/age/total-byte budgets, process ownership, shutdown and truncated-tail
handling. Readers must distinguish a partial final record after interruption from valid events;
no silent parsing of malformed data as successful operations. Future browser/native hosts review
appropriate local storage adapters without assuming filesystem access or equivalent durability.
No log viewer, export UI, compression, extra native sink or service is authorized by this choice.

Test schema/framing, redaction, correlation, oversized/malformed events, truncated writes,
rotation/retention, queue overload, disk/permission failures, shutdown and late events. Measure
logging overhead separately from correctness. Build/test artifacts retain their own reviewed
payload/retention policy. Documentation only; concrete schema/budgets and implementation remain
pending. [JSON Lines format](https://jsonlines.org/).

## Architecture review — decision 66 (diagnostic retention limits)

On 2026-10-16 the owner selected A: retain application diagnostic logs for up to seven days,
with a total logical file-byte budget of 20 MiB (20,971,520 bytes) for the app's local diagnostic
store, including active and rotated logs. Both limits apply; retire oldest logs first when age
or size requires it. This is the initial native preview budget, not a quota per drawing/file.
No automatic upload. Drawing databases, migration recovery copies and build/test evidence are
outside this diagnostic retention policy and must never be deleted by its cleanup.

S02 specifies rotation size/count, event/queue limits, accounting, cleanup cadence, writer
coordination and failure handling so active/temporary files cannot silently evade the budget.
Avoid shared-prefix cleanup that could select unrelated files. If cleanup/write cannot stay
within limits, degrade/drop diagnostics with bounded failure accounting rather than unlimited
growth or blocked editing. Filesystem allocation overhead is separate from logical file bytes.

Apply age cleanup while running and on next launch; no background daemon or claim of deletion
while the app is closed. Review wall-clock jumps and file-age trust without confusing retention
age with monotonic operation durations. Rotated-file granularity may retain fewer than seven
days and does not guarantee every event survives. Exact implementation/sink contracts remain
pending; any revised budget requires an explicit recorded change, not silent gate weakening.

Test age/size boundaries, active plus rotated accounting, oldest-first removal, restart/clock
changes, cleanup/write failures and preservation of non-log files. Verify no input stalls or
edit failures and record measured overhead separately. Documentation only; no cleanup or app
implementation has been run.

## Architecture review — decision 67 (native document extension)

On 2026-10-16 the owner selected A: use .linefield for the native SQLite drawing document,
for example Sketch.linefield. This selects the user-visible native file suffix, not the exact
SQLite schema/application identifier, OS type registration or MIME value. PNG remains .png.

Import/open must validate internal format/application identity, schema/version, required content
and resource limits; the suffix alone never proves that a file is a valid Linefield drawing.
Keep native export/import-as-copy and source-preservation semantics. A SQLite database renamed
.linefield does not bypass validation. Internal catalog, temporary, sidecar and recovery naming
remain private lifecycle details rather than additional public formats.

S02/S06 review file-panel filtering/default filename handling, Unicode/case/extension behavior,
wrong/missing suffix handling and content validation. OS file associations/type declarations
require the concrete host integration review; this approval neither registers an app globally
nor selects a reverse-domain identifier. Test valid round-trips and rejection of unrelated,
malformed, oversized or unsupported files bearing the suffix. Documentation only.

## Architecture review — decision 68 (relational per-tool preference storage)

On 2026-10-16 the owner selected A: persist device-local tool settings with explicit named
columns in tool-specific relational tables. Initial pen preferences have reviewed color/width
fields; future approved tools receive appropriate fields/tables through migrations. Avoid one
wide table full of unrelated optional properties, generic EAV storage or a versioned JSON/BLOB
settings object as the selected preference representation.

Retain stable tool identity and per-drawing/device ownership from decisions 58-59, with typed
Rust settings/defaults/validation and shared commands. Native controls remain platform-specific.
Concrete keys and relationships must fit actual tables; do not introduce redundant identifiers
merely to enforce a conceptual pattern. Active-tool selection and viewport remain distinct local
metadata. Local preferences are not portable stroke properties, exports or rendering dependencies.

S02/database_designer proposes the schema source table/field/key/constraint/index design, SQL constraints
versus Rust validation and schema migrations for owner visual review. Record introduction/default
and incompatible-version handling; relational columns do not eliminate settings migrations.
Future tools still require separate product/design review approval. This decision does not select an ORM,
SQL generator, SQLite STRICT mode or concrete data types without the pending contract review.

Test per-tool/per-drawing isolation, defaults/validation, migration and rollback/rebuild/failure
behavior under reviewed catalog lifecycle rules. Verify native restoration and unchanged portable
artwork/save/recency/history/export semantics. Only initial approved tool tables are implemented
when authorized. Documentation only; no schema or implementation has been created.

## Architecture review — decision 69 (versioned tool metadata requirement; superseded by 71)

On 2026-10-16 the owner proposed a separate tool metadata table containing a tool name and
16-byte identity, referenced elsewhere and joined when needed, and required versioning. Record
versioned tool metadata/settings interpretation as a requirement. The concrete registry/table/key
proposal remains for visual schema review; this discussion does not answer the preceding choice
of TEXT versus binary storage for document/stroke UUIDs.

Proposed direction for that review: stable tool identity, a locale-independent tool key for native
localized names, and explicit versioned contracts referenced by typed per-tool preferences.
A built-in tool identity is fixed across releases/installations, not randomly regenerated when
opening a drawing or creating a preference. The proposed 16-byte key is a standard UUID byte
representation with validated length/encoding, not a bespoke packet format. No concrete UUID
constants, key layout or executable registry are approved here.

Distinguish tool contract/settings interpretation versions, SQLite schema version and artwork
geometry/rendering interpretation versions. A label translation or cosmetic UI update must not
require changing identity. Never replace an old version's meaning silently with new semantics.
Database metadata does not supply executable behavior or permissions; shared Rust owns supported
tools, typed commands, validation and capability checks. New tools still require owner approval.

S02/database_designer must propose normalized tools/version references and relationships to the
selected explicit per-tool settings tables, with constraints, defaults, migration and unsupported-
version behavior. Joins occur in storage/query work, not per input sample; editor uses validated
in-memory settings. SQLite foreign keys cannot enforce catalog-to-separate-document references;
portable artwork must contain its required interpretation metadata and remain independent of
local preferences. Do not introduce a mandatory external catalog dependency for exported files.

Review tests for stable seeded identities, localization-independent names, version uniqueness,
missing/unsupported references, safe migrations and per-tool/per-drawing isolation. Concrete
schema source and version compatibility policy remain review deliverables. Documentation only.

## Architecture review — decision 70 (versioned tool registry direction; superseded by 71)

On 2026-10-16 the owner approved the proposed stable tool ID plus explicit version-table
structure as the direction for the schema source proposal. A tools table holds a stable standard 16-byte
UUID identity and locale-independent readable tool key. A tool_versions table identifies explicit
supported contract versions for each tool. Tool-specific relational settings reference the
appropriate tool/version while retaining explicit typed property columns under decision 68.

Tool identity stays fixed across installations/releases; version changes do not generate a new
tool identity. Native resources localize display labels from the stable key. Version records
identify supported Rust contracts, not executable behaviors loaded from the database. Keep
settings-contract, database-schema and persisted-artwork interpretation versions distinct and
preserve existing artwork semantics. No plugins, new tools or sync are authorized.

Perform joins during storage/query work and use validated typed settings in the editor; do not
join per input sample. Portable drawing files must not depend on the local registry/preferences
to render, and foreign keys cannot enforce references across catalog/drawing database files.
Database designer must show the exact key/constraint/version-field design, seeded identities,
migrations/unsupported-version behavior and self-contained artwork interpretation in schema source with
owner visual review. Concrete constants/columns/DDL and implementation remain unapproved.

Test stable identity/version relationships, localized names without identity change, referential
integrity, per-tool settings isolation, safe migration and missing/unsupported version rejection
or reviewed fallback. The document/stroke UUID TEXT-versus-binary representation remains an
independent unanswered choice. Documentation only.

## Architecture review — decision 71 (unversioned tools and binary UUID storage)

On 2026-10-16 the owner reversed per-tool versioning: retain the tools lookup table with stable
identity/readable key, but remove tool_versions and per-tool settings/contract version references.
Top-level document format version governs persisted drawing interpretation and compatible
migrations. Do not introduce independent tool/brush/stroke version fields as a substitute. The
separate device-local catalog still needs its own top-level schema migration version; it is not
an exported drawing and is not governed by one particular drawing's version. No per-tool version
counter is required in that catalog. This supersedes decisions 69-70's version-table direction.

The owner also selected standard 16-byte binary SQLite UUID storage for tools, documents and
strokes. Keep UUIDv4 identity generation for document/stroke instances and fixed built-in tool
identities; representation does not change generation policy. Use reviewed BLOB length/type and
UUID validity constraints plus Rust validation, with one documented byte order/conversion across
hosts. Do not write platform GUID memory layouts directly. Readable formatting belongs in tooling
when needed; identifiers remain excluded from logs where privacy rules disallow them.

Local integer keys for database relationships and ordered sample indices remain selected; no
UUID per sample or universal ID-registry table is introduced. Typed tool-specific relational
preferences reference the appropriate stable tool without a version join. SQL stays off the ink
path. Portable drawing interpretation remains self-contained, not dependent on local preferences.

Future incompatible artwork meaning requires reviewed top-level format/migration handling that
preserves old appearance or rejects unsupported content; removing tool versions is not permission
to reinterpret old files silently. Concrete schema source keys/types, seeded values, version numbering,
compatibility and conversion fixtures still require visual owner review. Test 16-byte round-trips,
malformed lengths/UUIDs, canonical cross-host conversion, identity/FK mappings and existing import
regeneration semantics. Documentation only; no code, schema or migration has been implemented.

## Architecture review — decision 72 (STRICT SQLite tables)

On 2026-10-16 the owner selected A: use SQLite STRICT tables for owned drawing and catalog
schemas. Pin and verify a compatible SQLite runtime (3.37 or newer), including future browser
builds before claiming compatibility. Do not silently fall back to flexible tables or weaken
validation to accommodate an unsupported runtime. No dependency is installed by this decision.

STRICT enforces stored column types with lossless coercion allowed; it does not replace Rust
domain validation or SQL NOT NULL/CHECK/UNIQUE/foreign-key constraints. UUID columns still need
reviewed 16-byte BLOB validation and semantic UUID checks. Numeric bounds, finite coordinates,
referential integrity and supported document interpretation remain explicit contracts. Review
concrete supported type names and avoid using ANY to bypass the typed schema requirement.

S02/database_designer shows STRICT in the physical schema specification and records any schema source
visualization limitations without pretending the diagram enforces it. Review executable migration
DDL and effective table/runtime checks after implementation authorization. Top-level drawing and
catalog version policies remain selected; no per-tool versions are reintroduced.

Test invalid type writes, allowed lossless conversions, nullability/length/range/reference rules,
round-trips, migrations and incompatible-runtime handling. Rust validation failures and database
constraint failures need separate evidence. Native/browser compatibility and actual execution
remain unverified until tested. Documentation only; concrete schema still requires visual owner
review. [SQLite STRICT tables](https://www.sqlite.org/stricttables.html).

## Architecture review — decision 73 (shared focus-loss cancellation for every tool)

On 2026-10-16 the owner selected A for unfinished pen strokes on drawing-window focus loss and
explicitly extended the same rule to every tool. Cancel the active unfinished interaction and
restore its pre-interaction state; do not commit a partial result or create an Undo entry. Remove
transient previews/predictions. Previously completed actions, existing history and valid in-flight
autosaves of completed work remain intact. Focus loss alone does not close the document session.

Apply one shared interaction/cancellation contract to Pen, Select move/scale and future approved
tools. Each tool supplies the rollback/temporary-resource cleanup appropriate to its operation;
none may silently opt into committing on interruption. Do not revert unrelated completed changes,
worker acknowledgements or durable data by restoring an entire stale application snapshot.
Committed one-shot actions are not undone simply because the window later loses focus.

Native adapters translate actual window deactivation/input cancellation into the shared typed
cancel command. S02 defines platform event mapping, interaction identity, idempotent cancellation,
stale end/update rejection and fresh-begin requirements on resume. A late pen-up or regained focus
must not revive/commit a cancelled interaction. Preserve native text-field/IME behavior; this rule
is not an override of native widget editing. No unapproved tools/platforms are implemented now.

CT-02/INV interaction tests and DRAW-CANCEL-001/FOCUS-001 apply across all implemented tools;
future tool tasks inherit them. Verify pre-interaction state, no partial autosave/history entry,
preview cleanup, retained prior edits, repeated cancellation, stale events and successful next
interaction. Shared/injected cases are separate from real host deactivation E2E; reserve the
desktop before native tests. Documentation only; concrete contracts/design review and implementation remain
pending.

## Architecture review — decision 74 (block document history during active interactions)

On 2026-10-16 the owner selected A: document Undo and Redo are unavailable while any tool
interaction is active. Shared Rust checks the interaction state and returns a typed unavailable/
busy outcome; native menus/controls/shortcuts reflect that state. Do not queue the request,
finish/cancel the gesture or change previously completed work/history as a side effect.

After normal interaction completion or cancellation, recompute Undo/Redo availability from actual
history and remaining state guards. Do not replay a rejected request automatically. All current
and future tools inherit this rule. Native text fields and IME keep their own platform editing/
Undo behavior; a text Undo is not redirected to document history because the canvas is busy.

S02 defines command admission ordering, interaction identity and availability updates at begin/
end/cancel boundaries, including stale native callbacks and future semantic command consumers.
No agent transport or new UI is authorized. Record bounded redacted command outcomes centrally.
Tests cover all implemented active interactions, unchanged preview/content/history on rejection,
no delayed replay and correct availability after completion/cancellation, including an empty
history. Shared/injected cases and actual native menu/shortcut/text-focus E2E remain separate.
Documentation only; no implementation or design review approval implied.

## Architecture review — decision 75 (block tool switching during interactions)

On 2026-10-16 the owner selected A: switching tools is unavailable while any tool interaction
is unfinished. Shared Rust command admission enforces the guard; native tool controls/menu actions/
shortcuts reflect authoritative availability. Reject attempts with a typed unavailable/busy outcome,
without queuing a switch, committing/cancelling the current operation or changing active tool.

Keep current preview, accepted settings, prior content and history intact. A rejected switch must
not activate another tool's saved preferences or update the persisted last-active-tool value.
After completion or explicit cancellation, recompute availability under other state/capability
rules and require a new explicit switch request. Do not replay rejected shortcuts on pen-up or
focus return. Current and future approved tools inherit this interaction contract.

S02 specifies interaction-boundary ordering, stale native callbacks and shared availability with
the style/history/export guards, while preserving decision 56's completed-state manual Save.
Native text/IME shortcut handling remains first-responder-owned. This decision selects no new
cancellation shortcut or future tool; explicit cancel mapping is reviewed separately.

Test native controls/menu/keyboard and shared command attempts during each active interaction,
no state/history/persistence change, no deferred replay and valid explicit switching after end/
cancel. Include rejected preference activation and stale events. Shared conformance and actual
native UI E2E remain separate. Documentation only; implementation/design review still require approval.

## Architecture review — decision 76 (common Escape cancellation)

On 2026-10-16 the owner approved common Escape behavior across tools. When canvas interaction
owns the action and a tool interaction is active, route Escape into the shared Rust cancellation
command: restore the interaction's prior state, remove temporary preview/predictions, create no
Undo entry and preserve completed work/history. Keep the current tool selected. This extends
decision 17's transform cancellation and uses decision 73's shared all-tool rollback contract.

When no interaction is active but an object is selected, Escape clears selection. With neither
an active interaction nor selection, Escape performs no canvas action. Native dialogs, text
fields and IME retain platform Escape priority; do not intercept Escape globally or cancel a
native composition and a canvas operation from the same consumed event.

Cancellation is idempotent. Late update/end events from the cancelled gesture cannot revive or
commit it, and focus return or continuing held input cannot synthesize a new begin. Require a
fresh valid interaction before drawing again. S02 specifies interaction identity and native
contact/key-repeat ordering; this does not add a gesture, new tool or platform implementation.

Test active pen/move/scale and every future implemented tool, idle selected/unselected states,
repeat Escape, held input/late end, fresh next interaction and native dialog/field/IME priority.
Verify unchanged selected tool, prior content/history/save status and no deferred blocked command
replay. Shared cancellation tests and actual keyboard/focus native E2E remain separate. Documentation
only; concrete input contracts/design review and implementation still require review.

## Architecture review — decision 77 (block navigation during editing gestures)

On 2026-10-16 the owner selected A for the first macOS preview: block pan and zoom requests
while a stroke or artwork move/scale interaction is active. Shared Rust admission keeps the
viewport stationary for that editing gesture. Native scroll/pinch/Space-drag/menu/shortcut
adapters reflect this policy; a rejected navigation request is not queued or applied on release.
Do not commit/cancel the edit or reinterpret existing samples just to honor blocked navigation.

Normal pan/zoom remains available between editing gestures, including while an object is merely
selected. This guard must not block updates to the pan/zoom interaction itself. Simultaneous
navigation while editing is a separately reviewed future enhancement; no other-platform gesture
implementation is approved here. System window resize/display changes require a separate policy,
not a claim that the app can block all coordinate-system changes.

S02 specifies input/viewport ownership, ordering, native availability, blocked gesture/momentum
stream handling and stale-event rejection. Never replay ignored navigation deltas or treat the
continuation of a rejected gesture as a queued action. A fresh eligible request uses the accepted
viewport. Preserve native field scrolling/shortcuts and completed-state Save; only canvas
navigation admission is affected, with no artwork/history/local-view change on rejection.

Test every current navigation origin during pen/move/scale, unchanged viewport/content/history,
no delayed jump after end/cancel, normal idle navigation and selected-object navigation. Shared
admission/ordering tests and native trackpad/keyboard/mouse E2E remain separate. Documentation
only; concrete input contracts/design review and implementation remain pending.

## Architecture review — decision 78 (cancel before canvas mapping changes)

On 2026-10-16 the owner selected A: when window resizing or a display change alters the canvas
coordinate mapping during an unfinished interaction, cancel that interaction through the shared
Rust cancellation path before applying the new mapping. Resizing/display adaptation proceeds;
this is not permission to block system window changes. Preserve completed artwork/history and
independent valid save acknowledgements; remove unfinished preview/predictions without an Undo
entry or partial persisted edit. Keep the current tool selected.

Apply the common cancellation contract across implemented tools. Do not cancel merely because
a window moved if its canvas mapping did not change. S02 defines which content-size, backing-scale
and surface-mapping changes invalidate an interaction, ordering at the editor owner and mapping/
interaction identity checks. Native OS events may already have occurred: prevent input from being
interpreted against the new mapping until cancellation and mapping acceptance are ordered. Late
old-mapping input/results cannot revive the interaction; a fresh valid begin is required.

CT-02/CT-03/CT-06 and DRAW-CANCEL-001/NAV-001 cover pen/move/scale, repeated resize callbacks,
backing-scale/display transitions, stale update/end events, preserved completed work and successful
fresh input. Shared injected ordering tests are separate from real window/display E2E. Missing
second-display hardware is an explicit coverage gap. No native tests or implementation ran;
concrete contracts and design review still require review. Decision 77's resize-policy question is resolved.

## Architecture review — decision 79 (logical sizing at 100% zoom)

On 2026-10-16 the owner selected A: at 100% canvas zoom, one logical canvas unit maps to one
native UI point. For the first macOS host this means one AppKit point; the backing scale determines
physical raster pixels. At zoom z, an untransformed world-space length L occupies L * z view
points before conversion to device pixels. Stored stroke transforms apply before viewport mapping.

Display density does not change stored geometry, logical brush width, document revision or export
resolution. This is logical sizing, not a promise of identical physical millimeters across displays.
Future hosts map to their reviewed logical UI units rather than physical pixels; concrete host
conversions remain part of their contracts. Do not put AppKit types in Rust document semantics.

CT-02/CT-03/CT-06 and NAV-001 require input/render inverse consistency at reviewed tolerances,
100% and non-100% fixtures, backing-scale changes and preserved document geometry. Decision 78
still cancels active interactions before an invalidating mapping change. PNG uses its independent
fixed pixels-per-unit policy (decision 38); its numeric multiplier remains unresolved. The empty
PNG remains exactly 1920 by 1080 pixels (decision 54). No implementation or runtime checks ran.

## Architecture review — decision 80 (PNG export scale)

On 2026-10-16 the owner selected B: export nonempty drawings at exactly one PNG pixel per
logical canvas unit. This resolves decision 38's numeric multiplier. Compute raster dimensions
from all-artwork bounds including transformed stroke widths/caps/joins plus the reviewed margin;
integer rounding and margin remain S02/S07E review items. Do not infer an integer-only document
coordinate model or alter artwork to align it with the pixel grid.

Export scale is independent of viewport zoom, window size and display backing scale, including
Retina displays. The fixed opaque light sRGB background remains selected. Empty drawings retain
the exact 1920 by 1080 pixel fallback (decision 54), without extra margin or scale multiplication.
No resolution selector, DPI controls, silent downscaling or alternative export scope is authorized.

CT-06/SU-19/EXPORT-001 must verify dimensions with an independent decoder, fractional bounds,
transformed width inclusion and identical dimensions across viewport/display configurations.
Enforce reviewed overflow-safe pixel/byte/work budgets before allocation; reject oversized output
without cropping, changing document state or silently reducing scale. Concrete margin/rounding/
limits still need review. Documentation only; no implementation or runtime tests ran.

## Architecture review — decision 81 (fixed PNG margin)

On 2026-10-16 the owner selected A: nonempty PNG export adds a fixed margin of 16 logical canvas
units on each side of the full visible artwork bounds, including transformed stroke widths,
caps and joins. With decision 80's one pixel per unit, the nominal margin is 16 output pixels
per side; integer raster rounding remains a concrete S02 contract detail. Do not measure from
stroke centerlines, scale the margin with artwork size, or apply viewport/display scaling.

An artwork bounds rectangle of 1000 by 600 units therefore has padded continuous dimensions
of 1032 by 632 units before integer raster rounding. Preserve fractional geometry and include
all artwork. No margin control or proportional framing option is authorized. This choice does
not set the separate gallery thumbnail margin or alter stored drawing geometry.

The empty drawing fallback remains exactly 1920 by 1080 pixels with no added margin. Preserve
opaque fixed light sRGB background, snapshot consistency and reviewed pre-allocation budgets.
CT-06/SU-19/EXPORT-001 cover all four borders, transformed/pressure-derived extents, fractional
and negative coordinates, single-point strokes, viewport/display independence and the empty
exception. Independent decoding verifies output dimensions; visual checks verify framing.
Documentation only; rounding/resource limits and exact background color still require review.

## Architecture review — decision 82 (automatic library catalog recovery)

On 2026-10-16 the owner selected A: when the library catalog is missing or confirmed corrupt,
automatically rebuild it from validated drawings in the app-managed library directory. Notify the
user that recovery occurred; do not require advance confirmation for this approved recovery path.
Preserve the damaged catalog for diagnosis and leave files that cannot be validated untouched,
reporting them instead of silently deleting them. No scan of unrelated external directories.

Recover document-owned identity/name/content metadata from valid drawings. Catalog-only data,
including remembered viewports/tool preferences, may be unavailable and must fall back honestly
to approved defaults. Do not claim full restoration of local settings or numbering history.
This authorizes recovery policy, not a concrete schema, new recovery UI or an implementation.

S02 must distinguish confirmed corruption/missing data from permissions, temporary access/locking
failures and unsupported newer schemas. Those are not permission to replace a valid catalog.
Design staged rebuild, validation, publication and restart-safe retry; preserve recoverable source
artifacts, including relevant SQLite sidecars, without copying a live database inconsistently.
Define eligible published drawing locations so staging files, upgrade backups and deletion
remnants are not blindly revived as gallery documents. Resolve duplicate identities and interrupted
lifecycle operations explicitly; do not silently merge or rewrite drawings during catalog rebuild.

CT-05 and LIBRARY-FAILURE-001 require missing/corrupt catalog, mixed valid/invalid drawings,
preserved damaged artifacts, interrupted rebuild/retry, storage failure and stale-worker cases.
Native acceptance verifies recovered gallery items, notification and honest preferences fallback;
fault-injection tests remain distinct. Bounded background recovery and redacted operation logs
must preserve input responsiveness and omit paths/document names. Concrete protocol/retention/
reconciliation details and identified design recovery states still require review. Documentation only.

## Architecture review — decision 83 (retain unavailable gallery entries)

On 2026-10-16 the owner selected A: if a healthy catalog references a drawing that is missing
or cannot be opened, retain its gallery entry and mark it unavailable. Preserve its identity and
known metadata, explain the failure and allow explicit retry. Never create a blank replacement,
silently remove the entry or treat an unavailable drawing as successfully opened. This includes
temporary access failures; distinguish missing, inaccessible, invalid and unsupported-format
outcomes where known, without claiming corruption from an ordinary read failure.

Retry revalidates the intended drawing and follows the shared open contract. Valid recovery
restores availability; stale results cannot update a deleted/replaced entry or another session.
A failed open preserves the current accepted session/history under existing navigation rules.
Known metadata is last-known information, not evidence that the file remains valid or current;
a cached thumbnail may not imply the document is available or newly verified.

CT-03/CT-05 and LIBRARY-OPEN-001/LIBRARY-FAILURE-001 cover missing/inaccessible/invalid/newer-format
files, repeated retry, restoration, stale completions and identity mismatches. Verify no blank file,
no silent catalog removal and no changes to unrelated artwork. Native E2E covers retained entry,
accessible unavailable status, explanation and retry separately from injected storage failures.

S02/S02L must specify typed availability/reason outcomes and design review states before implementation.
This does not authorize a locate-file feature, external-directory search, automatic salvage or
new deletion behavior. Decision 82's missing/corrupt catalog rebuild remains separate. Documentation
only; no code, native tests or UI design approval implied.

## Architecture review — decision 84 (duplicate identities during recovery)

On 2026-10-16 the owner selected A: if catalog recovery discovers distinct drawing files with
the same document identity, preserve both files and report an unresolved identity conflict.
Continue recovery of unrelated valid drawings. Do not automatically select a winner, merge
artwork, regenerate identities or publish both files as ordinary independently editable entries
under one document ID. Matching names remain allowed and are not this conflict condition.

Timestamps, filename order or first scan result must not decide which drawing is authoritative.
Repeated scans/retries must preserve every conflicting candidate without mutating source bytes.
Normal import-as-copy remains a separate explicitly requested operation with its approved identity
rules; recovery must not silently invoke it. This decision does not approve a conflict-resolution
editor, merge feature or automatic salvage workflow.

S02 specifies collision detection across eligible published files, stable conflict reporting,
identity-safe references and behavior when a collision is found after provisional scan results.
Do not report a conflicted identity as recovered or open it ambiguously. S02L/design review must show an
honest unresolved state while allowing access to unrelated recovered drawings. Concrete resolution
commands, if proposed, require separate review before implementation.

CT-03/CT-05 and LIBRARY-FAILURE-001 require same-ID files with equal or divergent content,
reversed scan order/timestamps, repeated and interrupted recovery, and unrelated valid drawings.
Assert byte preservation, no silent identity changes/merge/winner selection and clear conflict
outcomes. Include same-name/different-ID controls that recover normally. Native presentation
acceptance remains separate from injected storage tests; logs omit source paths/names/content.
Documentation only; no code or runtime verification performed.

## Architecture review — decision 85 (resume confirmed deletion)

On 2026-10-16 the owner selected A: after interruption/restart, automatically finish a permanent
library deletion only when a valid durable record identifies the previously confirmed operation
and exact target. Record that intent before destructive work. Do not ask for the same confirmation
again merely because the process restarted. Missing files, catalog corruption, stale callbacks
or an ambiguous identity do not authorize deletion.

S02 must propose the concrete deletion intent representation and crash-consistent sequence for
owner review, including fencing in-flight writes, catalog/document/sidecar coordination, target
validation, idempotent retry and completion/cleanup boundaries. The policy alone does not approve
a new journal, custom protocol, table layout or filesystem implementation. Do not claim SQLite
makes separate files atomic. Handle unavailable/invalid intent without guessing; never resurrect
an intentionally deleted drawing during catalog recovery. Retain the existing no-Trash/no-Undo
scope and no secure-erasure guarantee. Recovery copies/exported files are not implicitly targets.

CT-05 and LIBRARY-DELETE-001/LIBRARY-FAILURE-001 test interruption before durable intent, after
intent and during each destructive/publication phase, repeated restart and storage failures.
Verify exact identity, no collateral deletion, no stale save resurrection and honest pending/
failure/completion outcomes. Native acceptance covers confirmation and resumed status separately
from injected crash tests. Concrete schema/sequence and design review remain for review; documentation only.

## Architecture review — decision 86 (incremental autosave SQL updates)

On 2026-10-16 the owner selected A for B01-Q1.

Update only affected rows in each revision-aware SQLite transaction rather than rewriting the full
drawing on ordinary autosave. Preserve atomic completed edits, ordered revisions and one-operation
Undo semantics. Initial creation/import/migration are separate reviewed lifecycles. S02 defines
change tracking, coalescing, dependency ordering, rollback and revision-gap handling; never skip a
needed change or advance durable revision after partial work. Test incremental results against a
reference document across draw/move/scale/delete/Undo/Redo, restart and injected transaction failure.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 87 (SQLite cascade for owned samples)

On 2026-10-16 the owner selected A for B01-Q2.

Use a reviewed same-database foreign-key cascade so deleting a stroke row removes its owned
sample rows. Rust still decides command admission, editing, Undo and save revision semantics;
SQLite does not implement application Undo. Enable and verify foreign-key enforcement on each
relevant connection. Concrete DDL remains for schema source/schema approval. Test orphan rejection,
transaction rollback and Undo restoring the complete stroke/sample set; no cross-file cascade
or deletion of unrelated shared tool definitions is implied.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 88 (disposable in-memory stroke bounds)

On 2026-10-16 the owner selected A for B01-Q3.

Initially calculate stroke bounds from authoritative samples/properties/transforms and retain
them only in bounded disposable memory caches. Do not persist derived stroke bounds in the
native document. Reopening may rebuild bounds; cold/warm/evicted results must agree for culling,
hit testing and full-artwork export. Test move/scale/history invalidation, distant/fractional
geometry and reload. S02 reviews computation and resource budgets; no startup performance claim
is established by this choice.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 89 (bounded automatic transient-save retries)

On 2026-10-16 the owner selected A for B01-Q4.

Retry classified temporary autosave failures automatically with increasing delays and bounded
work, alongside explicit Retry. Keep failure/pending status honest until durable acknowledgement;
retain the approved memory limits and mutation pause on exhaustion. Corruption/unsupported format
are not transient retries. S02 defines classification, delays/caps, manual Retry interaction,
coalescing and stale-session/deletion shutdown. Test backoff without busy loops, later success,
nonretryable failure, queue bounds and no loss/duplicate application of accepted changes.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 90 (durable-revision gallery thumbnails)

On 2026-10-16 the owner selected A for B01-Q5.

A cached gallery thumbnail represents a durably saved drawing revision, never a newer unsaved
in-memory edit. Generate the latest durable revision when admitted; an older valid thumbnail may
remain temporarily while replacement is pending, without being labelled current. Associate cache
results with document identity, revision and rendering inputs; reject stale/deleted results.
Do not generate unfinished gestures or change Saved status. Test delayed/failed saves, revisions
advancing during rendering, restart, deletion and stale completion; source capture must be coherent.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 91 (on-demand gallery without loading layout shifts)

On 2026-10-16 the owner selected A for B01-Q6, with explicit on-demand/no-layout-shift requirements.

Load the healthy gallery on demand as the user scrolls; do not eagerly materialize all entries
or thumbnails at launch. Use bounded pages/windowing and bounded near-visible prefetch, stable
item identities and explicit loading/error states. Loading or replacing placeholders must not
move existing items, change their reserved dimensions or unexpectedly change the scroll anchor.
Reserve preview and metadata layout space before asynchronous content arrives.

The owner explicitly requires no loading-induced layout shifts on every platform. Native layouts
may differ and legitimately adapt to window size, text scaling or locale changes; this is not a
single fixed pixel layout for all devices. Preserve focus/accessibility identity while recycling
views. Test delayed/out-of-order page/thumbnail results, errors/retry, rapid scrolling, memory bounds
and stable positions/anchors. Real data edits/reordering have separately reviewed behavior; do not
infer metadata sort order from thumbnail arrival. Native evidence is required on each implemented
host, never claimed from the macOS result alone. Recovery conflict safeguards remain unchanged.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 92 (demand-driven thumbnail scheduling)

On 2026-10-16 the owner selected A for B01-Q7.

Prioritize visible and near-visible gallery thumbnails and generate other previews when needed;
do not proactively refresh the entire library. Reuse valid cache entries, deduplicate pending
requests and drop/deprioritize obsolete disposable work under reviewed cancellation rules.
Bound queues/caches/prefetch and reject stale results after scrolling/deletion. Combine with
on-demand entries (decision 91) and durable-revision sources (decision 90). Test rapid scrolling,
large libraries, revisits, cache eviction and no document/save-state mutation.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 93 (actual input only in the first preview)

On 2026-10-16 the owner selected A for B01-Q8.

Render actual input samples only for the first preview; do not display native-provided predictions
or introduce a custom predictor. Keep the existing architectural separation/invariants for future
transient predictions, but future activation needs review. Actual sample ordering, batch validation,
coalesced actual samples and existing correction-contract review remain independent. Update required
first-preview evidence to actual-input behavior; do not claim prediction behavior implemented or
covered by planned tests. Measure actual responsiveness before proposing prediction support.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 94 (shared validity with host resource limits)

On 2026-10-16 the owner selected A for B01-Q10.

Keep shared portable format-validity rules, while reviewing memory/work/document capacity limits
for each host. A structurally/semantically valid drawing may exceed a device's supported capacity;
report that distinctly from corruption, leave it untouched and never truncate or silently simplify
it. Enforce bounded decoding/admission before excessive allocation. S02 reviews common safety
constraints, host budgets and typed outcomes. Test the same fixture with different configured caps,
unchanged file semantics and honest unavailable states; future host evidence is not a macOS pass.

Documentation only. Concrete schema/ABI/numeric budgets, identified design and implementation
authorization remain required; no runtime checks were performed by recording this decision.

## Architecture review — decision 95 (static Rust linkage for the macOS preview)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 1
selects A for global B02-Q11.

Statically link Rust into the first macOS app rather than shipping a separately loaded Rust
library. Keep the four-crate source organization and typed cbindgen boundary. This does not
select linkage for future hosts or remove upstream Skia/native dependencies. S01/S02 review the
actual supported build/link configuration, generated-header drift, symbols and clean-build
reproducibility; no separate hot-swap/plugin mechanism is approved.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 96 (host and Rust core built together)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 2
selects A for global B02-Q12.

Build, test and distribute the macOS host and Rust boundary together. Do not promise that older
native host binaries remain compatible with a newer core. Generated-declaration drift, compile/link
and ABI conformance checks must catch mismatches within the same build. This is not permission
for unsafe layouts or unchecked data. Document format versioning/migrations remain separate;
no public SDK, independent core updater or backward-compatibility negotiation layer is approved.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 97 (consistent grouped small UI reads)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 3
selects A for global B02-Q13.

Read all affected small UI projection groups together from one editor state, returning native-
owned copied results with a shared update identity. Do not collect unrelated full-document or
canvas geometry data. Keep large collections on their separate bounded query path. S02 reviews
the typed group selection, result structs, allocation/capacity failure and atomic publication;
no callbacks reenter mutation and no mixed-revision controls. Test coherent toolbar/selection/
save snapshots after commands and validated worker completions.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 98 (collection gap recovery by bounded resync)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 4
selects A for global B02-Q14.

On a detected gap in a large native collection projection, invalidate that projection and fetch
a fresh bounded snapshot/pages. Do not add a retained Rust change history just to replay missing
UI updates. Maintain query/session identity, stable ordering and an atomic snapshot-to-delta
handoff. Do not eagerly load the full gallery; preserve decision 91's viewport/anchor and demand
constraints. S02 defines honest loading/stale states and stale response rejection. State resync
must not replay native effects, erase document state or silently miss deletions.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 99 (explicit native-effect acceptance)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 5
selects A for global B02-Q15.

Keep bounded, identified one-time native requests pending until the host explicitly acknowledges
acceptance. Correlate eventual completion/cancellation/failure separately. Acceptance is not operation
success or proof a panel is still visible. Prevent duplicate presentation on repeated reads or
acknowledgements; insufficient output capacity must not consume an effect. Do not invoke native
presentation within a Rust mutation. S02 reviews delivery/acceptance/lifetime/shutdown states and
bounds; no durable exactly-once delivery across process crashes is promised.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 100 (priority for persistence and exit-critical work)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 6
selects A for global B02-Q16.

Within the approved bounded background work arrangement, prioritize saves and exit-critical
work over disposable thumbnail/cache work between bounded units. Include fairness so low-priority
jobs are not permanently starved. Never preempt an active SQLite transaction or silently add
workers/executors. S02 defines priority classes, admission, chunk boundaries and cancellation;
measure latency under preview backlog and sustained saves. The autosave batching deadline is
still not a disk-completion promise.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 101 (bounded main-thread completion delivery)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 7
selects A for global B02-Q17.

Process background completions in a bounded count/time slice per scheduled main-thread delivery,
then yield/reschedule when more remain. Preserve semantic order, atomic individual state updates,
identity/revision validation and eventual progress; never drop required completions to meet a
budget. This uses change-driven wakeups, not periodic polling. S02 reviews per-result cost and
slice budgets; a time budget alone cannot preempt an oversized single handler. Test bursts,
rescheduling, shutdown, stale results and input responsiveness.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 102 (bounded FIFO export queue)

On 2026-10-16 the owner answered batch 2 using local positions 1-8. Position 8
selects B for global B02-Q18.

Accept a small bounded FIFO of export requests rather than rejecting every request while another
export is outstanding. Normal editing may continue under existing guards. This authorizes queue
semantics, not parallel export workers. Review maximum job count, aggregate retained snapshot/
resource bytes, overload outcome, per-job identity/status/cancellation and destination ordering.
Never silently drop requests or allow one destination's writes to race.

S02 must propose exact request admission and immutable revision capture timing, native-panel/
overwrite-confirmation lifecycle, same-destination conflict handling and safe publication before
implementation. Do not silently choose that queued requests follow later edits or recapture a
newer revision. The quit-during-export policy (B01-Q9) remains open and must account for all queued
jobs, not only the active one. Queue cancellation does not waive unsaved-edit exit safeguards.

Documentation only. Concrete ABI/schema/scheduling/resource contracts and identified design
still require review; no code, build or runtime test was performed by recording this choice.

## Architecture review — decision 103 (finish exports by default when quitting)

On 2026-10-16 the owner selected A for B01-Q9.

A normal Quit waits for accepted active and queued exports to finish, with clear progress/status
and an explicit safe cancel-exports-and-continue-quitting path. Do not present the same advance
wait-or-cancel question on every quit. Failure/stalled-work handling must remain visible; this
is not a promise to wait indefinitely or to interrupt every OS call instantly.

Respect the existing unsaved-edit exit guards independently. Before publication, cooperative
cancellation preserves an existing destination; after successful publication do not remove the
finished output or claim cancellation rolled it back. Cancel queued unstarted jobs without
publishing them when cancellation is selected. S02 reviews closing-state admission, capture/
publication races, cleanup and acknowledged completion. design review must expose honest waiting/failure/
cancellation states. Force Quit/OS termination cannot guarantee completion. Test active and queued
jobs, completion during cancellation, failed export, unsaved edits and repeated Quit.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 104 (cancel after malformed actual-input batches)

On 2026-10-16 the owner selected A for B03-Q19.

When an active interaction receives a malformed actual-input batch, reject the whole batch and
cancel the unfinished interaction through shared rollback. Preserve prior completed artwork,
history and valid saves; never commit a gesture with a missing segment or add a partial Undo.
This is distinct from an ordinary unavailable command or invalid toolbar setting, which does
not acquire a new cancellation side effect. Stale/wrong-session deliveries remain rejected by
identity and must not cancel a different current interaction.

Require a fresh valid begin after cancellation; late updates/end cannot revive the gesture.
No retained resend/suspended-gesture mechanism is selected. Define malformed ordering/value/
range cases, atomic validation and bounded redacted diagnostics in S02. Test bad first/middle/
last samples, unchanged prior work, preview cleanup, stale identities and fresh subsequent input.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 105 (ten-percent minimum pressure width)

On 2026-10-16 the owner selected A for B03-Q20.

For a valid normalized contact pressure p in [0,1] and selected maximum untransformed width W,
use linear width W * (0.10 + 0.90 * p). Minimum width is 10% of W; maximum is W. Uniform stroke
transforms scale the result. Without pressure, use W consistently. This does not redefine hover
as contact, add opacity/tilt response, or authorize pressure-curve UI.

Pressure presence/normalization, contact endpoints and absolute style/geometry limits remain
in the concrete S02 contract. Reject invalid values under reviewed rules rather than silently
clamping malformed data. Verify endpoints, monotonic interpolation, absent/zero distinctions,
transform/reopen/export parity and actual Cintiq feel; this selection is not measured validation.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 106 (floating-point sRGB document channels)

On 2026-10-16 the owner selected B for B03-Q21.

Use normalized floating-point values for canonical saved sRGB color channels rather than
quantizing document channels to 8-bit integers. Keep sRGB as the initial color space. Exact float
width, finite/range constraints, alpha representation and transfer/renderer conversion rules
remain for concrete schema/geometry review. This does not add transparency controls, HDR, another
color space or per-tool versioning.

Do not quantize saved values merely because native controls, previews or exported pixels use
another representation. Preserve values through load/save and command/Undo round trips under
the reviewed numeric contract. PNG channel depth is a separate output decision, not automatically
floating point. Test endpoints, intermediate values, invalid/nonfinite input and conversion parity;
no claim of bit-identical rendering across GPUs is implied.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 107 (selection against visible stroke shape)

On 2026-10-16 the owner selected A for B03-Q22.

Measure selection proximity in screen space against the visible stroke shape, including its
pressure-derived width, caps/joins and stored transform. A point inside the shape has distance
zero. Apply the existing nearest-eligible-hit tolerance and topmost tie-break; do not measure
only to centerlines. Viewport mapping must agree with rendering; exact tolerance/numerical method
and handle precedence remain reviewed. Test thick/thin/transformed strokes, interior/edge/gap
hits, overlap ties, zoom and display scale. No new selection mode or multi-selection is introduced.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 108 (preserve stroke order during transforms)

On 2026-10-16 the owner selected A for B03-Q23.

Moving or uniformly scaling a stroke preserves its existing drawing/overlap order. Do not bring
it to front automatically. Commit the transformation as one Undo operation; no-op/cancel creates
neither an order change nor a history entry. Rendering, hit-test ties, save/reopen and export agree
on stroke order. Test moving across overlapping strokes, scale, cancellation and Undo/Redo. No
layer/reorder control or new ordering feature is authorized.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 109 (PNG dimensions rounded from padded local bounds)

On 2026-10-16 the owner selected A for B03-Q24.

For nonempty PNG export, use the padded artwork bounds as export origin and round padded width
and height upward to whole pixels at the selected one-pixel-per-unit scale. Do not snap outer
bounds to the world's pixel grid. Preserve fractional document geometry and the nominal 16-unit
margin; rounding may add less than one pixel of surplus along the right/bottom dimensions.

Pure translation does not intentionally change output dimensions. S02 defines robust finite-
precision computation, origin translation, antialiasing coverage and overflow-safe size admission
so fractional/extreme bounds neither clip visible content nor unexpectedly allocate huge output.
Test translated fixtures, fractional/negative positions and transformed stroke extents. Empty
output stays exactly 1920 by 1080 without extra margin. No size controls or silent resampling.

Documentation only. Concrete interfaces/schema/budgets and identified design still require review;
no implementation or runtime verification was performed by recording this choice.

## Architecture review — decision 110 (broad native visual baseline coverage)

On 2026-10-16 the owner selected B for B04-Q25.

Use screenshot baselines at every suitable E2E flow step rather than only selected key states.
Map each suitable checkpoint to scenario/state and exact host configuration; document why a step
cannot reliably use a baseline rather than silently excluding it. Retain functional, semantic
file and accessibility assertions plus designer review: screenshots do not replace them.

Use per-platform/OS/display-scale/font/locale baselines and reviewed tolerances. Stabilize captures
on observable state without hiding loading/layout defects; test actual motion separately. No
unreviewed masking, automatic golden acceptance or normalization of meaningful differences.
Record changes and reviewer approval for baseline updates, with no cross-platform pixel-identity
promise. This is a planned gate; no screenshot suite exists yet.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 111 (absolute and relative performance gates)

On 2026-10-16 the owner selected A for B04-Q26.

Acceptance checks both reviewed absolute budgets and same-host relative regression limits against
a measured baseline. Define workloads, metrics/statistics, repetitions, noise handling and numeric
thresholds in the S02/S07 review packet; do not invent a percentage or treat an unavailable baseline
as a pass. Use exact release builds and valid hardware/display/visibility/power/thermal conditions.

Retain raw evidence and justify material changes. Never rebaseline or loosen limits merely to
obtain green. Separate software timings from physical pen-to-screen latency; camera-dependent
claims remain pending. Comparisons across unlike hosts do not establish a same-host regression.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 112 (short generated checks and milestone campaigns)

On 2026-10-16 the owner selected A for B04-Q27.

Run short bounded seeded generated/fuzz exploration in relevant background commit checks, with
longer campaigns before milestones. Retain reproducible failing inputs/seeds and promote useful
failures into regression cases. Define runnable budgets/corpora and coverage at implementation;
a short campaign is not proof of absence of defects. Required property, fault and sanitizer checks
remain separate. Native foreground tests still require reservation. No scheduled job, CI service
or permanent worker is created by this policy.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 113 (targeted native E2E video capture)

On 2026-10-16 the owner selected A for B04-Q28.

Collect failure screenshots/logs and required broad visual acceptance captures normally; record
video only for targeted gesture/motion diagnosis rather than every native E2E run. Use disposable
project test content and approved host access/reservations. Avoid capturing unrelated windows or
private drawings. Keep exact-build/artifact provenance and failure retries visible.

Capture overhead must not invalidate performance measurements; any recording in a benchmark needs
an explicitly accounting measurement protocol. Video is not physical pen-latency evidence. Tests
requiring temporal evidence still need appropriate motion assertions or targeted recordings; a
static image cannot prove a transition was correct.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 114 (automatic pruning of eligible successful test artifacts)

On 2026-10-16 the owner selected A for B04-Q29.

Automatically prune eligible older successful-run test artifacts under reviewed age/space limits.
Preserve unresolved failures and review-pinned milestone evidence, plus required result/build/
scenario provenance. Do not silently discard pending-review evidence. If protected artifacts fill
the reviewed capacity, request cleanup and pause new large captures rather than exceeding bounds
or deleting protected files. Retention of application logs, drawings and recovery copies is separate.

S01/S07 must define dedicated artifact roots, eligibility/pin/resolution metadata, accounting,
clock/race handling and safe cleanup tests before implementation. Numeric quotas remain unselected.
Mark pruned payloads as unavailable in reports; an old summary is not inspectable raw evidence.
No existing files are deleted by this documentation choice.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 115 (separate unrelated dependency upgrades)

On 2026-10-16 the owner selected A for B04-Q30.

Keep dependency upgrades unrelated to a feature/fix in dedicated reviewable changes. A dependency
required by that feature/fix may accompany it with an explicit rationale and compatibility/license/
security evidence. Retain pinned verified versions and the same required tests; isolate urgent
security fixes without waiting for an unrelated feature bundle.

This does not authorize automatic latest-version adoption, an update bot, remote PR creation,
CI, merging or release publication. Review expected behavior/size/performance impact and rollback;
never hide an unrelated upgrade in generated lockfile churn. The existing one-feature-in-flight
and implementation-authority limits remain unchanged.

Documentation only. Concrete tools/budgets/evidence policies still need review and implementation
authorization; no checks were installed or executed by recording this decision.

## Architecture review — decision 116 (multiple processes with separate drawing ownership)

On 2026-10-16 the owner selected B for B05-Q31.

Allow multiple application processes to edit different drawings in the same managed library,
with explicit per-document ownership and shared catalog coordination. Keep one mutable editor
owner per drawing and the selected main-thread ownership within each macOS process. This changes
the single-library-process assumption, not the one-editor/window-per-process scope; tabs or several
editors within one process are not added. Simultaneous editing of the same drawing is not approved.

S02 must present actual ownership/locking, process identity, crash cleanup, revision validation,
shared catalog notifications, migration/rebuild/deletion arbitration and resource-budget behavior
before implementation. SQLite transaction locking is not a complete application coordination plan.
No custom IPC protocol, daemon, new worker topology or process-spawn UI is implicitly selected.
Test real independent processes, contested ownership, stale results and process death, plus native
focus/open states in a reserved session. Never merge this policy into a claim of implemented support.

Documentation only. Concrete schema/ABI/ownership/security/resource contracts and identified
design review remain for owner review; no runtime implementation or checks are claimed.

## Architecture review — decision 117 (proactive supported document upgrades)

On 2026-10-16 the owner selected B for B05-Q32.

After an app update, proactively upgrade eligible older drawings through bounded background work,
instead of waiting exclusively for first open. Preserve consistent validated pre-upgrade recovery
copies, lossless supported migrations, failure isolation and source-preserving staged imports.
Do not upgrade already-current or unsupported-newer drawings or bypass storage/recovery budgets.

Coordinate with all process/document owners before mutation; never replace files under a live
editor without the reviewed handoff. Exact scheduling, busy-document policy, global maintenance
ownership, interruption/retry and catalog-version interaction remain S02 review. Scanning candidates
in bounded batches does not authorize eager gallery/thumbnail materialization. Test multiple app
processes, backup/storage failure, update interruption/restart and no interference with active ink.

Documentation only. Concrete schema/ABI/ownership/security/resource contracts and identified
design review remain for owner review; no runtime implementation or checks are claimed.

## Architecture review — decision 118 (restore recovery copy as an independent drawing)

On 2026-10-16 the owner selected A for B05-Q33.

When a validated pre-upgrade recovery copy is available, offer explicit restoration as a new
independent drawing with fresh document and stroke identities, preserving the damaged original.
Require confirmation explaining that edits newer than the copy may be absent. Validate and stage
the recovered copy, use only safe supported migrations, then publish under the reviewed library
lifecycle; failure must not damage either source or create a falsely usable recovered item.

This approves the restore-as-copy policy for identified design/contract design, not automatic salvage,
a merge/repair editor or routine historical backups. A known-bad upgrade must not be blindly rerun.
Concrete naming/availability/UI placement and safe failure states remain reviewed. Test identity
remapping, semantic preservation, partial failures and coexistence with the unavailable original.

Documentation only. Concrete schema/ABI/ownership/security/resource contracts and identified
design review remain for owner review; no runtime implementation or checks are claimed.

## Architecture review — decision 119 (import a coherent captured source revision)

On 2026-10-16 the owner selected A for B05-Q34.

Complete import from one coherently captured source revision even if the external source changes
later. Do not chase a moving source with repeated freshness retries or mix its old/new contents.
Preserve external source bytes, stage/validate the independent copy and apply existing identity/
upgrade/publication rules. Failure to obtain a consistent bounded snapshot is an import failure,
not permission to raw-copy only the main file of a live SQLite database.

S02 reviews supported source/provider snapshot acquisition, access boundaries, busy/cancel/error
behavior and source-revision identity where available. No live synchronization, source write-through
or ability to identify an arbitrary provider's revision is promised. Test a changing source with
known coherent states, unchanged originals and no hybrid or partially published imported artwork.

Documentation only. Concrete schema/ABI/ownership/security/resource contracts and identified
design review remain for owner review; no runtime implementation or checks are claimed.

## Architecture review — decision 120 (eight-bit PNG channel output)

On 2026-10-16 the owner selected A for B05-Q35.

The owner initially listed both B and A, then explicitly clarified A: PNG export uses 8-bit color
channels. Canonical native sRGB colors remain normalized floating-point values under decision 106.
Export converts output pixels without quantizing stored document values or changing history/save
status. Preserve sRGB interpretation, opaque background, fixed pixel scale/margins/rounding and
empty dimensions; no bit-depth selector, HDR or wide-gamut feature is introduced.

Specify float-to-output conversion, color metadata, rounding and alpha/compositing in S02/S07E;
no undocumented dithering or alternative color pipeline is approved. Test independently decoded
channel depth, intermediate/edge colors, opaque output and unchanged native values after export.
Compressed file size and consumer compatibility still require implementation evidence.

Documentation only. Concrete schema/ABI/ownership/security/resource contracts and identified
design review remain for owner review; no runtime implementation or checks are claimed.

## Architecture review — decision 121 (capture exports at accepted command time)

On 2026-10-16 the owner selected A for B06-Q36.

Capture the latest completed artwork when Export is accepted, before its destination panel.
Subsequent edits do not change that job's source revision, including edits made before destination
confirmation or while it waits in the queue. Bind to the intended document/session; a later
navigation must not silently retarget it. Snapshot retention starts before panel completion and
must be included in admission/resource bounds; cancel releases the corresponding reservation.

S02 reviews atomic acceptance/resource reservation and immutable capture without disk/GPU waits
on the input owner. Durable snapshot timing relative to destination confirmation remains a separate
question under decision 124. Active-interaction guards and meaningful failure outcomes remain.
Test panel delays/cancel, later edits/navigation, stale callbacks and capacity rejection.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 122 (serialize queued exports to the same destination)

On 2026-10-16 the owner selected B for B06-Q37.

Allow multiple outstanding export jobs targeting the same destination, with serialized publication
and renewed replacement confirmation when necessary. A later job cannot silently overwrite an
earlier job's output or rely on stale permission for a different target state. Keep per-job source
snapshots and intended target distinct; do not collapse requests into only the latest job.

S02 must review destination identity/aliases/provider capabilities, cross-process coordination,
FIFO/order dependencies, target-change races, confirmation/permission lifetime and publication
outcomes. Do not claim path-string comparison or a pre-write check eliminates filesystem races.
Test consecutive snapshots, changed/replaced targets, canceled predecessor and concurrent processes.
Existing no-overwrite-without-confirmation and original-file preservation requirements remain.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 123 (continue unrelated exports after a job failure)

On 2026-10-16 the owner selected A for B06-Q38.

Report an individual export failure and continue unrelated queued jobs when safe. Do not pause
all work solely because one destination failed; do not silently retry, reorder, forget or drop
the failed job. Shared faults such as storage/resource exhaustion can pause affected work, and
unknown unsafe internal state still requires the existing isolation policy.

S02 distinguishes independent failures from common dependencies and same-destination chains;
job progress cannot bypass confirmation or predecessor ordering. Test bad destinations, shared
faults, later successful jobs, preserved failed outcomes and honest Quit/status behavior.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 124 (durable export queue and source snapshots)

On 2026-10-16 the owner selected B for B06-Q39.

Persist accepted export job intent and immutable source data for recovery/reconciliation after
crash or restart, rather than making the queue session-only. This is distinct from ordinary
SQLite document autosave and does not authorize a new custom command protocol. Exact storage
layout/schema, source snapshot encoding, durability boundary, destination access references,
privacy/retention, quotas and worker claims require an owner-reviewed S02/schema source proposal.

Recovery must distinguish unpublished work, known completed output and publication whose outcome
is uncertain. Never blindly replay a possibly completed overwrite or promise exactly-once external
publication without evidence. Validate source integrity, supported versions, original intent and
destination permissions; pause uncertain/changed-target work for a safe reviewed outcome. Resume
must use the captured source, not current drawing contents. Review multi-process fencing, recovery
copy migration, partial staging and cleanup. Native consent/UI rules are not automatically settled.

Test interruption at intent/snapshot/publication/completion boundaries, quota/disk failure,
corrupt job data, stale workers and unchanged originals. Published files survive; no reconstruction
claim for intent that never reached the defined durable boundary. Normal Quit still follows 103.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 125 (exports outlive editor navigation)

On 2026-10-16 the owner selected A for B06-Q40.

Allow normal gallery navigation/opening another drawing while accepted exports retain their
immutable source snapshots. Existing unsaved-edit guards still apply independently. Do not retain
an editor/native-view lifetime merely to keep an export running, retarget its source to the new
drawing, or apply its completion to a replacement editor's state.

Progress/status and cancellation must remain accessible outside the originating editor in an
identified approved design; no particular new window/page is selected. Account app/job-owned
snapshot resources and stale session results. Test navigation, completed/failed/queued export,
new editor lifetime and cancellation. Deleting the source drawing is a separate unresolved policy.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 126 (three accepted export jobs)

On 2026-10-16 the owner selected A for B06-Q41.

The initial export queue count cap is three accepted jobs total, including active and waiting/
reserved jobs; it is not three waiting plus active. Apply additional reviewed aggregate retained
snapshot/disk/working-memory/work bounds and explicit admission failure. Count pending destination
reservations so panels cannot create unbounded hidden snapshots. Completion/cancel releases slots
only at the reviewed safe boundary; never silently drop or replace an accepted job.

With multiple app processes now selected, the scope and coordinated enforcement of this count
(per managed library versus per process) must be explicitly reviewed, not silently multiplied.
Batch 8 asks this remaining scope question. Recovery must not bypass count/byte budgets or discard
existing durable jobs to fit a new cap. No parallel worker/render topology is selected. Test cap
edges, reservation races, queued/active cancellation and recovery admission before implementation.

Documentation only. Concrete schema/ABI/coordination/security/resource contracts and identified
design review remain for review; no code, durable queue or runtime verification has been implemented.

## Architecture review — decision 127 (activate the existing drawing window before reporting contention)

On 2026-10-16 the owner approved B07-Q42, with an explicit refinement.

On an explicit request to open an already-owned drawing, reuse/activate the window that already
owns that drawing where the host supports it and the owner/window identity can be verified.
If activation is unavailable, denied or fails, show the already-open/in-use explanation. Do not
create a second mutable editor, add read-only snapshot mode, steal ownership or activate an
unrelated window based on stale identity. No unsolicited focus changes from background events.
Concrete host activation/acknowledgement, race handling and trust mechanisms remain S02 review.

Documentation only. Concrete contracts/schema/host mechanisms and identified design remain for
review; no runtime, new protocol, database or native acceptance evidence is implemented.

## Architecture review — decision 128 (defer upgrades of actively owned drawings)

On 2026-10-16 the owner approved B07-Q43 A.

Proactive maintenance skips/defer drawings with an active owner and continues eligible unrelated
work. Upgrade after verified release and renewed validation; do not request closure, replace a
live file or infer release from a missed notification. Keep backup, bounded-work and crash recovery
requirements. Maintenance coordinator policy Q44 is still pending.

Documentation only. Concrete contracts/schema/host mechanisms and identified design remain for
review; no runtime, new protocol, database or native acceptance evidence is implemented.

## Architecture review — decision 129 (pause mutation and persistence after ownership loss)

On 2026-10-16 the owner approved B07-Q45 A.

Unexpected loss of verified write ownership immediately pauses new document mutations and
persistence. Retain accepted in-memory work where possible and report the loss. Cancel unfinished
interaction through the shared cancellation path; it is not committed to preserve it. Reject stale
worker writes/completions; do not silently reacquire and flush divergent work. Review fencing,
in-flight transaction boundaries, safe recovery and explicit continuation before implementation.
The runtime cannot promise to reverse a write already durably committed before loss was detected.

Documentation only. Concrete contracts/schema/host mechanisms and identified design remain for
review; no runtime, new protocol, database or native acceptance evidence is implemented.

## Architecture review — decision 130 (platform notifications with authoritative catalog validation)

On 2026-10-16 the owner approved B07-Q46 A.

Use platform-supported cross-process notifications as advisory wakeups, followed by reads and
validation of authoritative catalog state. Coalesce bounded work; tolerate duplicate, stale,
reordered and missing notifications and reconcile on lifecycle/focus return. Events do not grant
ownership or authorize mutations. Exact supported mechanisms and trust boundaries need S02 review;
no custom command IPC, raw document payload, daemon or polling UI is authorized by this choice.

Documentation only. Concrete contracts/schema/host mechanisms and identified design remain for
review; no runtime, new protocol, database or native acceptance evidence is implemented.

## Architecture review — decision 131 (refuse deletion while another process owns the drawing)

On 2026-10-16 the owner approved B07-Q47 A.

Reject deletion of a drawing owned by another process with an in-use explanation until verified
release. Do not force closure, discard edits, queue a later delete merely from this rejected request,
or infer consent from notifications. After release require valid explicit deletion intent under
the established confirmation/durable recovery policy. Close/delete/ownership races need tests.
Source deletion with outstanding exports remains the separate pending Q53 policy.

Documentation only. Concrete contracts/schema/host mechanisms and identified design remain for
review; no runtime, new protocol, database or native acceptance evidence is implemented.

## Architecture review — decision 132 (separate SQLite export-job database)

On 2026-10-16 the owner selected B08-Q48 A.

Store durable export metadata in a separate SQLite job database. Keep immutable drawing snapshots
in a dedicated managed area using the reviewed Linefield snapshot representation. Catalog rebuild
must not discard accepted job intent. Exact schema source/schema, source representation, cross-file staging,
reconciliation, cleanup, identity and privacy remain concrete S02 review; no custom codec implied.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 133 (persist export source after destination confirmation)

On 2026-10-16 the owner selected B08-Q49 A.

Capture completed artwork at accepted Export before the destination panel as already selected.
Retain this snapshot in bounded memory while the panel is open; persist it after destination
confirmation. Show preparation until intent/source reach the reviewed durable acceptance boundary.
Canceled panels release reservations. Crash before durable acceptance cannot promise job recovery;
never silently recapture later artwork. Define partial staging cleanup and admission failures.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 134 (automatically resume verified safe recovered export jobs)

On 2026-10-16 the owner selected B08-Q50 A.

After restart automatically resume jobs only when source, ownership, destination access and
publication/consent state have been validated as safe. Pause uncertain outcomes, unavailable
permissions and changed targets for explicit action. Resume the immutable captured source, never
the current drawing. Reconcile potentially completed publication before retrying; no exactly-once
external publication promise, consent bypass or new background service is selected.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 135 (pause exports when approved destinations change)

On 2026-10-16 the owner selected B08-Q51 A.

If the destination changes after replacement approval, pause the job and request fresh confirmation
or a different destination. Preserve the captured source while unresolved within reviewed bounds.
Unrelated safe jobs may continue; same-destination dependencies stay ordered. Native/provider race
handling must cover publication, not merely a check-then-write. Do not overwrite on stale consent.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 136 (release terminal export snapshots after safe reconciliation)

On 2026-10-16 the owner selected B08-Q52 A.

Release job-only source snapshots after durable terminal reconciliation, retaining required bounded
outcome metadata. Do not delete sources referenced by other jobs, uncertain publication or unresolved
cleanup. No completed/failed/canceled snapshot retry-retention period is selected. Once released,
retry may require a new export request and a newly captured source; do not promise exact old-content
retry. Cleanup uses validated managed identity, reviewed quotas and interruption-safe references.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 137 (cancel outstanding exports when deleting their source drawing)

On 2026-10-16 the owner selected B08-Q53 A.

Deleting a library drawing with outstanding exports explicitly confirms cancellation of those jobs
as part of deletion, then coordinates safe cancellation/ownership before completing deletion. Canceling
the confirmation leaves both drawing and jobs intact. Already published external outputs remain.
Reconcile publication/cancel races, including uncertain outcomes; do not claim cancellation of a
completed write or delete external output. Preserve durable deletion intent and busy-owner rejection.
Review recoverable cross-database ordering and blocked deletion states; no force-discard shortcut.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 138 (three accepted export jobs per process)

On 2026-10-16 the owner selected B08-Q54 B.

The three-job cap applies per process, counting active, waiting and reserved jobs. Multiple processes
can therefore accept more than three jobs in total. Additional shared byte/work/resource protection
remains mandatory; no exact global job count or byte budget is selected. Avoid double execution across
processes, bypassing caps by relaunch, or losing durable jobs to fit a cap. S02 must define process
identity, abandoned-job reassignment, recovered-job admission and accounting across transfer without
assuming a permanent process ID. Queue ownership and worker topology remain separate review items.

Documentation only. Exact contracts/schema/security/resource bounds and identified design require
review before implementation. No database, runtime queue or native verification is implemented.

## Architecture review — decision 139 (one logical maintenance coordinator)

On 2026-10-16 the owner selected B07-Q44 A.

Use one logical library-maintenance coordinator at a time, with durable progress and reviewed
ownership transfer after exit/interruption. This is not a permanently running daemon or an extra
thread topology. Map execution to each host's permitted lifecycle. Keep exclusive catalog
schema/rebuild authority and per-drawing ownership; defer actively owned drawings. A slow or
suspended participant is not automatically dead: require safe release/fencing before takeover.
Exact native/browser mechanisms remain S02 review; concurrent distributed migration workers are
not selected.

Documentation only. Concrete schema/interfaces/platform mechanisms and identified design still
require review before implementation; no code or runtime verification is included.

## Architecture review — decision 140 (library-wide automatic naming sequence)

On 2026-10-16 the owner selected B09-Q55 A.

Allocate automatic Untitled names from one coordinated persistent sequence per managed library
across processes. The first label is Untitled, then Untitled 2, Untitled 3, and so on. Do not reuse
numbers after rename/deletion or promise gap-free allocation. Explicit duplicate names remain
allowed; names are not identity keys. Review transactional allocation, failed creation, counter
recovery and catalog rebuild without inventing lost historical numbering from visible names.

Documentation only. Concrete schema/interfaces/platform mechanisms and identified design still
require review before implementation; no code or runtime verification is included.

## Architecture review — decision 141 (new imports appear first in the gallery)

On 2026-10-16 the owner selected B09-Q56 A.

Place a newly imported drawing at the top as a newly added library item; subsequent ordering follows
normal content-edit recency. Preserve actual source timestamps rather than fabricating a historical
edit. This is an explicit import-arrival ordering exception, not permission to reorder on ordinary
open/rename/save completion. Specify ordering keys/ties and paging reconciliation in S02; retain
stable item identity, scrolling/focus and the existing no-loading-layout-shift requirement.

Documentation only. Concrete schema/interfaces/platform mechanisms and identified design still
require review before implementation; no code or runtime verification is included.

## Architecture review — decision 142 (coordinate rename through the owning editor)

On 2026-10-16 the owner selected B09-Q57 B.

Allow a gallery rename request for a drawing owned by another process to be handled through that
owner's shared Rust command dispatcher. The requesting process must not write the drawing or only
change the catalog copy. Report success only after confirmed durable document metadata and reconcile
the catalog projection. Preserve applicable interaction/admission guards and native text priority.

This approves coordinated rename behavior, not an unseen custom IPC protocol or a second writer.
S02 must propose typed request/outcome, owner/document identity, authorization, correlation,
deduplication, stale-result and conflicting-rename policy, timeouts/unknown outcomes, owner-exit
races and durable confirmation for explicit review. Advisory catalog notifications (decision 130)
are not mutation authority or proof of success. Do not blindly retry after a lost acknowledgement.
Document fields and exact transport remain unimplemented and require owner review.

Documentation only. Concrete schema/interfaces/platform mechanisms and identified design still
require review before implementation; no code or runtime verification is included.

## Architecture review — decision 143 (trim outer whitespace in user-entered names)

On 2026-10-16 the owner selected B09-Q58 A.

Trim leading/trailing whitespace when committing a user-entered name; retain internal spaces and
valid Unicode text. Reject empty/whitespace-only results, honor native IME completion and apply
reviewed single-line/length rules. Do not strip legitimate directional marks or normalize text as
an incidental shortcut. Define a shared deterministic trimming/validation policy for host parity.
Names remain metadata, not managed paths. This does not silently rewrite imported source names.

Documentation only. Concrete schema/interfaces/platform mechanisms and identified design still
require review before implementation; no code or runtime verification is included.

## Architecture review — decision 144 (fixed local library, future cloud boundary)

On 2026-10-16 the owner selected B10-Q59 A with an explicit requirement to plan future cloud integration.

The first preview uses one app-managed local library location, without relocation UI. External
folders remain import/export destinations. Keep local persistence separate from a future cloud
adapter: drawing identity must not depend on a filesystem path or provider account. Maintain offline
editing and keep network latency out of the input/autosave path. Local durable Saved status must not
be conflated with a future remote upload/sync status. No cloud SDK or network implementation now.

Do not implement cloud integration by sharing a live SQLite/WAL database among devices or blindly
mirroring its changing files. A future reviewed design must choose coherent versioned snapshots or
change replication, remote identity/version mapping, retry/idempotency, concurrent-edit conflicts,
deletion propagation, authentication, device enrollment and encryption/key recovery. Current local
revision counters and process locks are not distributed conflict resolution. Independent import
creates a new identity; future sync replicas cannot be treated as ordinary imports.

This approves a portability boundary and future planning, not a provider, sync protocol, CRDT,
server-trust model, encrypted format or cross-device editing implementation. Exact interfaces and
schema remain reviewed before code. Q60 encryption is still unanswered.

## Architecture review — decision 145 (sandbox from first runnable macOS preview)

On 2026-10-16 the owner selected B10-Q61 A.

Enable macOS App Sandbox from the first runnable preview, using narrowly necessary entitlements
and user-selected import/export access. Verify container storage, multiple instances, coordinated
rename/activation, persistent export destination access and restart permission handling in early
foundation probes. Review exact entitlements/signing/resources before implementation; report any
blocker rather than silently disabling sandboxing, broadening access or buying services.

App Sandbox is not database encryption or a guarantee against a compromised authorized process.
Test-runner Accessibility/focus permissions remain separate and require the existing authorization
workflow. This decision does not change system settings, approve distribution or select encryption.
Documentation only; no runnable app, entitlement file or sandbox verification exists yet.

## Architecture review — decision 146 (no application-level encryption for preview)

On 2026-10-16 the owner answered Q60: go without encryption. In the context of Q60 this selects A:
no Linefield-managed database encryption, app password or key-recovery workflow for the first local
preview. Retain standard SQLite/rusqlite direction, approved App Sandbox, OS access controls and
existing privacy/logging safeguards. Do not disable OS encryption or imply that files are encrypted
by Linefield; OS/device encryption depends on the user's configuration.

SQLCipher, per-drawing keys, master-key wrapping, recovery secrets and Keychain encryption-unlock
flows discussed as options are not selected or authorized. Future cloud transport/trust/encryption
policy remains a separate review before cloud implementation; this choice is not a perpetual ban
on encryption or permission for insecure networking. No system setting or dependency is changed.

All issued numbered questions Q1-61 are now answered. Remaining schema/ABI/resource/design review and
requested security/input/store review packets still require concrete owner review; answering the
question batches does not authorize implementation. Documentation only.

## Architecture review — decision 147 (OS-selected language at launch)

On 2026-10-16 the owner explicitly selected OS-selected app language at launch. Use supported
platform locale negotiation, honoring per-app OS preferences where applicable, with English as
initial/source/fallback language. Region, keyboard and canonical document semantics stay independent.
No custom language picker or live switching is selected. A required relaunch follows normal save/
recovery guards; future hosts must respect required native lifecycle behavior without losing work.
No additional translation is approved by this policy. Resources and native behavior remain unbuilt.

## Product direction clarification — decision 148 (Concepts-inspired open-source vector sketcher)

On 2026-10-16 the owner described the intended product as much like Concepts.app, open source,
cross-platform, MacBook first and prepared for possible future touch MacBooks. Record this as
product direction: an infinite-canvas editable vector sketcher, not a promise of feature parity,
competitor assets/UI copying, a specific open-source license or unverified hardware availability.

Preserve the currently approved first-preview tools and native Rust-command architecture. Prepare
capability-based input adapters for future touch/pen support; do not assume touch equals mouse,
change AppKit/UIKit ownership speculatively or claim future Apple APIs/devices are available.
Open-source license/contribution/distribution choices require a concrete owner proposal; do not
publish or add a license implicitly. Competitor sources inform UX research, not implementation
permission. The owner requested explanation of responsive/freehand/correction and alternatives;
these terms clarify direction rather than expanding tools/layers/precision/painting scope.

## Product wording and security workflow — decisions 149 and 150

On 2026-10-16 the owner explicitly approved describing Linefield as an editable vector sketching
app (149), and keeping security implementation with existing engineers while requiring focused
independent security reviews at sensitive milestones (150). No permanent additional implementation
agent is selected. A dedicated security-review role may be proposed later if workload warrants,
particularly before cloud integration; do not create it automatically.

The approved workflow is specified in security/development-workflow.md: explicit task impact,
preimplementation review of sensitive boundaries, independent design/change assessment, feature-owned
negative tests, evidence and unresolved-risk gates. Material choices retain owner approval. Existing
roles receive scoped instructions; automated enforcement remains uninstalled until implementation
is authorized. This approves workflow, not every mechanism proposed in the S00E packet or new code.

## Decision 151 — input behavior designed and approved per feature

On 2026-10-16 the owner requested an inventory of keyboard, stylus (including Wacom/Apple Pencil),
native OS/menu inputs and other applicable inputs, rather than deciding their mappings now. UX must
consider them when designing each feature/platform, propose interactions and submit them to the owner
with the design before implementation. The screenshot illustrates native app-menu/Services actions;
it is not approval to add the pictured app's features. P/V and other new defaults remain unapproved.
Preserve existing approved semantics and separate concrete architecture/design review gates. See docs/input/.

## Decision 152 — TV and watch hosts are view-only

The owner explicitly selected watchOS, tvOS, Wear OS and Android TV (including Google TV) as view-only.
This resolves Wear's previously proposed viewer scope. Plan viewing/browsing/navigation and applicable
native system actions, with shared Rust rejection of drawing/content mutation regardless of device.
It does not select toolkit, standalone/acquisition/network design, XR capability or authorize code.

## Decision 153 — responsibility ownership and requested milestone reviews

On 2026-10-16 the owner requested explicit distribution/architecture responsibilities in existing
agent instructions, an on-demand milestone review command and a single owner-responsibility index.
These are now documented in docs/owner-responsibilities.md and docs/workflow/milestone-review.md,
with the project-local linefield-review instruction skill. Engineers own recommendations and
evidence; material choices and release approval remain with the owner. No public channel selection,
application implementation, recurring automation or permission expansion is implied.

## Decision 154 — bilingual launch, OS-selected language

On 2026-10-16 the owner replaced English-only launch scope with English (en) and Ukrainian
(uk; not ua). English remains source/fallback. Every implemented platform follows OS/per-app
preferences at launch, with browser preferences as the web equivalent. No in-app switch.
This supersedes earlier English-only/additional-Ukrainian-pending statements; decision 147's
launch selection remains. Both languages require real catalogs, linguistic review, adaptive
design review and host E2E. No implementation is authorized by this documentation update.
Recommendation: retain existing engineering/design/review roles with explicit locale ownership,
rather than add a permanent i18n agent; the owner has not requested a new role.

## Color and timestamp clarifications — recommendations, not new schema approval

The owner requested preparation for future HSB pickers and asked about P3/OKLCH. See
design/color-representations.md: canonical float sRGB remains selected; picker state/conversions
are separate. P3 preservation requires reviewed versioned color-space/render/export changes.
The owner asked about updated_at: content_edited_utc_us already records artwork edits;
a metadata timestamp is a separately documented recommendation, not a silently added field.


## Decision 155 — S02 table structure approved; hosted diagram review

On 2026-10-16 the owner approved the identified table structure, not the remaining interfaces/ownership/recovery contract or application implementation. Subsequent concrete approvals are scoped in decisions 181, 209 and 237.


## Decision 156 — DB1-A: conservative catalog-loss recovery

Owner selected A on 2026-10-16: keep the three-database baseline, restore trustworthy authority when available, otherwise preserve uncertain files and block dependent operations. No fourth control database. Catalog loss cannot reconstruct historical naming/deletion authority from surviving drawings.

## Decision 157 — DB2-A: persistent gallery activity counter

Owner selected A: use a transactional cross-process persistent activity ordinal instead of timestamp ordering; keep actual timestamps separately and preserve already selected activity triggers. Catalog draft replaces effective_sort_time_utc_us with activity_order and adds library.activity_highwater. Exact allocation/retry/recovery transitions remain pre-code review items.

## Decision 158 — DB3-A: multiple bounded rename receipts

Owner selected A: retain multiple durable results under explicit bounds and ownership-generation/expiration rules. Unknown/expired receipts do not authorize blind execution. Exact numeric caps and retention details remain pending; receipt table shape is unchanged.

## Decision 159 — DB4-B: Rust localized default names

Owner selected B: Rust owns localized default-name creation in en/uk using host-resolved launch language. Remove native FormatDefaultName/reply. Keep native UI localization, first name Untitled (then Untitled 2), monotonic allocation, allowed gaps and unchanged stored names after language changes. Complete language DTO/resources/wording/tests remain pending. See reviews/S02-db-batch-1.md; these choices do not authorize app implementation.


## Decision 160 — Root Node/TypeScript/pnpm tooling

Owner authorized root Node.js/TypeScript/pnpm tooling and a .ts check runner. Keep one pnpm lockfile, strict type/lint/format/size checks and disabled lifecycle scripts. See tooling.md for the current commands and verification boundaries.


## Decision 161 — DB7-A: caller-owned query buffers

Owner selected A: bounded caller-owned UI DTO/text outputs filled by Rust, with capacity and revision checks; no Rust snapshot release obligation in the host. Rendering remains Rust-owned. Exact declarations, handles and full interface freeze remain separate review gates. No application implementation authorized.

## Decision 162 — DB8-A: macOS readiness pipe

Owner selected A: coalesced nonblocking readiness pipe observed on the main queue, with actual results in bounded owned queues. No state callbacks or command serialization through the pipe. Other hosts use reviewed equivalent scheduling adapters. Descriptor lifetime, race/shutdown proof and exact signatures remain pre-code gates. DB5 ownership and DB6 cross-process transport are still open; ETag/force-overwrite questions are not approvals.


## Decision 163 — DB5: simultaneous incremental local editing

Owner requested simultaneous editing with increments across editor platforms. Plan multiple local clients feeding one authoritative Rust document coordinator and one local database writer, with client-scoped interaction/presentation state. Supersedes exclusive-one-editable-client interpretations. Exact executor/hosting, operations, same-object/Undo/failover policies and implementation remain pending. See architecture/incremental-collaboration.md and task S02M. Viewers remain view-only; no automatic cloud merge approval.

## Decision 164 — DB6: platform-adapted communication

Owner accepts IPC if platform support works. Direction: direct calls in one process, native IPC between local native processes, browser messaging between browser contexts. NSXPC is only a macOS candidate. Exact mechanisms and capability/worker/storage/lifecycle proof remain pending. No universal custom wire format, daemon or network service selected. Typed Rust in-process bindings remain.

## Decision 165 — Initial cloud conflict warnings and replacement

Owner prefers initially warning about sync conflicts and suggesting explicit document override instead of automatic cross-device merging. Future sync planning only; no cloud implementation approval. Use exact-version conditional replacement so an old confirmation never authorizes overwriting subsequent changes. Recovery copy of the displaced version is recommended, with retention/failure policy pending. Incoming replacement coordinates all local clients. Provider/auth/schema/design review and implementation remain separate gates.


## Decision 165 follow-up — conflict policy reopened for merge review

Owner subsequently requested proper planning for different file versions, including human/agent and agent/agent edits. The initial warning/override approach is now under comparison with semantic/three-way/CRDT alternatives in architecture/merge-options.md. No final merge algorithm, new dependency/schema, agent priority or implementation was chosen. Preserve decisions 163–164 and do not treat a question as approval of automatic merging.


## Decision 166 — Preserve conflicting work before automatic reconciliation

Decision 166 (2026-10-16): prioritize preventing data loss over automatically reconciling every edit. Preserve conflicting work and resolve explicitly. Local incremental coordination (163) and platform adapters (164) remain selected. Initial future cloud sync preserves both whole-document versions; automatic semantic merging and object-level conflict review are deferred. Concrete preservation/retention/failure contracts and identified design approval remain required; no application implementation authorized.

The first local milestone rejects incompatible stale operations without silently discarding pending client work. Accepting independent commands through one coordinator is distinct from merging divergent offline histories. Future cloud resolution can keep both versions as separate drawings or explicitly select the active version while preserving the displaced version. Revalidate both reviewed versions before replacement; newer edits invalidate stale consent. If required preservation fails, block destructive resolution and report the failure. Exact snapshot storage, bounded retention/quota, cleanup consent, recovery and acknowledgement semantics require review. In-memory pending work is not crash-durable by assertion. CRDT adoption, durable collaboration history, agent integration and visual per-object merge tools remain separately scoped. This resolves the decision-165 follow-up; retain earlier records as history.


## Decision 167 — DB9-A: database incarnation and scoped revisions

Owner selected A on 2026-10-16. Identify the persisted drawing version using its stable document ID, a database incarnation identity and the existing content/metadata revision counters. Ordinary edits advance the relevant counters; controlled replacement/restoration creates a fresh incarnation. Check expected incarnation and relevant durable base revisions inside the same transaction that applies changes and advances revisions. Whole-document replacement covers all overwritten domains.

The incarnation is distinct from the document ID, schema version, coordinator ownership generation and future provider token. A coordinator restart alone does not change the database incarnation. Preserve the existing restore-as-independent-import policy (fresh document identity); incarnation checks also fence controlled replacements that retain document identity. No file hash or new per-commit random token selected.

This guards revision reuse through controlled lifecycle paths; arbitrary external replacement/writes outside the contract are not covered. Exact field encoding, export/import treatment, replacement fencing, schema amendment and typed signatures must be included in the next concrete review. No application or migration implementation authorized.

Required planned tests: matching scoped write; mismatch changes nothing; old acknowledgement rejected after replacement even when counters repeat; unrelated content/metadata work respects scoped preconditions; restart versus restore identity; crash boundaries and native/Wasm contract parity. These tests have not run.


## Decision 168 — DB10-A: coordinator hosted by the opening app process

Owner selected A on 2026-10-16. Initially, the app process that first opens a drawing and successfully obtains exclusive coordination authority hosts its authoritative Rust coordinator. Other clients connect through reviewed platform adapters. No standalone service selected. Process hosting does not select a new worker/thread topology.

Window closure may leave coordination alive while the process remains alive; explicit quit, crashes and suspension need reviewed lifecycle behavior. On coordinator loss, clients pause shared mutations, preserve pending work under defined bounds, and reconnect only after safe takeover. Timeout alone cannot confer authority. A successor must obtain exclusive authority, reload durable state, use a fresh ownership generation and reject stale work; database incarnation is distinct and does not change merely on coordinator restart.

Keep coordinator semantics independent of hosting. Native mobile and browser adaptations remain subject to their lifecycle/worker/storage probes; this selection does not promise an always-running process across platforms. Concrete locks, authenticated endpoint discovery, orderly shutdown, pending-operation reconciliation and exact IPC/ABI remain pending. No application implementation authorized.

Planned tests: competing first open; second client connection; owner window closure versus process quit; crash and stale peer; no takeover while old authority remains held; durable reload; unknown commit outcome; mobile suspension/browser worker loss when those hosts are implemented. No runtime evidence yet.


## Decision 169 — DB11-A: bounded client memory until durable acknowledgement

Owner selected A on 2026-10-16. Each submitting client retains bounded completed operations in memory until their durable save is confirmed. Coordinator acceptance is not Saved. A surviving client can participate in outcome reconciliation after coordinator loss; uncertain operations must not be blindly replayed. If all holders terminate or power fails before persistence, unsaved work can be lost. No additional client recovery journal selected. Existing bounded-editing and save-batching policies remain.

Documentation choice only; concrete contracts/schema/ABI and implementation still require their review gates. Relevant failure/race/native E2E tests are planned, not executed.


## Decision 170 — DB12-A: orderly save, disconnect and takeover

Owner selected A on 2026-10-16. On orderly coordinator-process quit, stop new admission, settle pending persistence or follow reviewed failure/quit-consent behavior, disconnect clients and release authority. Surviving clients reconnect through exclusive takeover and durable reload. No live in-memory coordinator-state transfer selected. Do not silently discard pending work or treat a timeout as ownership. Closing one window is distinct from process quit; forced termination uses crash recovery.

Documentation choice only; concrete contracts/schema/ABI and implementation still require their review gates. Relevant failure/race/native E2E tests are planned, not executed.


## Decision 171 — DB13-A: client-scoped conditional Undo

Owner selected A on 2026-10-16. Each client undoes its own accepted operations, with validation against current object state and dependencies. Reject/explain unsafe reversal rather than overwrite intervening work by another client or restore an obsolete whole-document snapshot. Existing session-only Undo lifetime remains; no persistent Undo history, actor priority or AI permissions selected. Concrete inverse-operation, redo and reconnect semantics require review.

Documentation choice only; concrete contracts/schema/ABI and implementation still require their review gates. Relevant failure/race/native E2E tests are planned, not executed.


## Decision 172 — DB14-A: command preconditions rather than object reservations

Owner selected A on 2026-10-16. Validate relevant object/property preconditions at authoritative command acceptance. The first valid incompatible change succeeds; later stale incompatible work rejects and remains available under the reviewed pending-work lifecycle. Independent work need not conflict solely because the global revision advanced. No object reservation protocol, wall-clock winner or automatic geometric merge selected. Exact per-operation preconditions, atomicity and design review conflict presentation remain review items.

Documentation choice only; concrete contracts/schema/ABI and implementation still require their review gates. Relevant failure/race/native E2E tests are planned, not executed.

## Decision 173 — DB15-A: bounded durable editing-command receipts

Owner selected A on 2026-10-16. Extend the existing rename-receipt concept to relevant completed mutating editing-command outcomes. Commit the bounded private receipt atomically with its drawing changes, so a reconnecting client can query a retained outcome instead of applying an operation twice. Validate operation identity, arguments, document/incarnation and authority. A missing/pruned receipt means Unknown, not proof of nonexecution. Ownership-generation transitions must allow authenticated outcome reconciliation without accepting stale mutation authority.

Receipts are outcome records, not full command history, persistent Undo, a client recovery journal or CRDT. DB11-A remains in-memory pending work until durable acknowledgement. Exact receipt scope/encoding, retention/admission, generation handling, schema amendments and export scrubbing remain concrete review items. No application implementation or hosted-schema update authorized by this record. Planned tests include commit-before-reply crash, duplicate request, mismatched arguments, changed incarnation, old owner, expired receipt and atomic rollback; none executed.

## Decision 174 — DB16-C: defer cloud conflict-copy retention

Owner selected C on 2026-10-16. Finalize resolved cloud conflict-copy retention during the cloud milestone alongside its preservation/recovery UI and storage contract. Decision 166 still requires preserving conflicting versions and blocking destructive resolution when preservation cannot be completed. No automatic cleanup period or indefinite-capacity guarantee selected. Existing latest pre-upgrade-copy retention, export snapshot cleanup and logging retention are unchanged. Cloud implementation remains separately authorized.

## Decision 175 — DB18-A: prioritize editing under reader-induced WAL pressure

Owner selected A on 2026-10-16. Yield/restart eligible disposable background readers before allowing reader-induced WAL growth to interrupt editing. Preserve exact source identity for existing jobs, accepted edits, completed snapshots and protected recovery material. If readers cannot safely yield or pressure persists, pause new write admission within reviewed limits and follow bounded pending-work policy. No live WAL deletion or unlimited growth. Concrete thresholds, fairness, checkpoint scheduling and platform feasibility remain review items; no implementation or executed tests.

## Decision 176 — DB19-A: reuse free pages and compact during controlled maintenance

Owner selected A on 2026-10-16. Initially use auto_vacuum=NONE for drawing databases, reuse freed pages and compact only as controlled maintenance when the drawing is not actively owned and storage/authority/validation conditions permit. File size may remain large after deletions until maintenance. Preserve semantic identities/revisions; coordinate maintenance ownership and file-handle validity. No after-stroke compaction or secure-erasure guarantee. Concrete admission/temporary-space/crash/cleanup rules remain review items; no implementation or executed tests.


## Decision 177 — DB17-B: normal platform synchronization, no macOS F_FULLFSYNC

Owner selected this policy on 2026-10-16. Owner explicitly chose not to use F_FULLFSYNC to keep platform behavior as similar as practical. For the initial macOS WAL baseline use synchronous=FULL, fullfsync=OFF and checkpoint_fullfsync=OFF; the latter prevents requesting F_FULLFSYNC only at checkpoints. Retain synchronized-commit Saved acknowledgement, effective-configuration verification and off-input storage work. Do not weaken synchronous to NORMAL/OFF or claim this creates identical physical durability across native OSes and browsers. Other native VFS and browser storage mechanisms require their own reviewed persistence guarantees; no web VFS/WAL compatibility selected. This supersedes the earlier fullfsync ON proposal.

Documentation only. Concrete contracts, identified design approval where applicable and implementation authorization remain required. Relevant negative/conformance/native E2E tests are planned, not executed.


## Decision 178 — DB20-A: whole-stroke mutation preconditions

Owner selected this policy on 2026-10-16. For initial existing-stroke commands, reject stale work when that stroke has changed since the expected state, even if different properties changed. Independent strokes need not conflict solely on a global revision change. Detect intervening mutations rather than merely equal current values. Concrete stroke-token lifetime/encoding, deletion/Undo ABA cases and document-level dependencies remain contract/schema review items. No property-level merge or new table implicitly approved.

Documentation only. Concrete contracts, identified design approval where applicable and implementation authorization remain required. Relevant negative/conformance/native E2E tests are planned, not executed.


## Decision 179 — DB21-A: fresh Undo session after coordinator recovery

Owner selected this policy on 2026-10-16. After coordinator failure and successful reconnection, reconcile pending outcomes and preserve unresolved work separately, then start a fresh editing session with empty Undo/Redo. Make the history reset explicit in the approved UI. Clearing history cannot discard pending artwork. Do not restore stale coordinator history or introduce persistent Undo; replay of uncertain operations still requires outcome/precondition validation.

Documentation only. Concrete contracts, identified design approval where applicable and implementation authorization remain required. Relevant negative/conformance/native E2E tests are planned, not executed.


## Decision 180 — DB22-A: continue proven-independent queued commands

Owner selected this policy on 2026-10-16. When a command conflicts, pause dependent commands and permit demonstrably independent commands to proceed under their own preconditions. If independence is unproven, pause conservatively. Preserve pending work, client sequence dependencies, paint-order invariants and all-or-none operation groups. This does not authorize arbitrary queue reordering or automatic reconciliation of conflicting edits. Concrete dependency representation, admission bounds and conflict UI remain review items.

Documentation only. Concrete contracts, identified design approval where applicable and implementation authorization remain required. Relevant negative/conformance/native E2E tests are planned, not executed.


## Decision 181 — consolidated S02 v2 proposal approved

On 2026-10-16 the owner replied “I approve” to the consolidated schema, typed interfaces, recovery transitions, resource limits and test plan. Approval covers the identified schema, typed interface, recovery and capacity proposal. Resource caps are approved provisional starting values, not measured guarantees. See reviews/contracts.md for scope and remaining feasibility, design and runtime gates. This is design approval, not application implementation authorization. No material design deviation is implicitly approved.

## Decision 182 — delegated platform IPC defaults
On 2026-10-16 the owner explicitly asked the lead to choose and document safe defaults, then asked that store compatibility be checked. Under that delegated authority select docs/architecture/platform-ipc-defaults.md: direct typed Rust calls within processes; macOS NSXPC with discovery-only sandboxed SMAppService LaunchAgent; Windows local named pipes/standard JSON-RPC; Linux typed session D-Bus; in-process Apple-mobile scenes and Android JNI with private AIDL only for required secondary processes; browser postMessage/BroadcastChannel and coordinator-worker-owned Web Locks; no editable IPC on viewer hosts. This narrowly supersedes the no-extra-service macOS assumption and resolves IPC1 as A with store constraints. It is not registration, app implementation, new platform features or store approval. Concrete implementation/security/probe evidence and identified design where relevant remain gates; do not re-ask the user to choose these transport defaults. See docs/distribution/ipc-compatibility.md for packaging/consent restrictions. New budget options EB1–EB5 are not selected by this decision.

### Decision 182 follow-up — file-event alternative declined
On 2026-10-16 the owner declined the proposed SQLite-inbox/file-event replacement comparison and asked to proceed to remaining decisions. Keep selected IPC defaults. File-system notifications may remain advisory invalidation signals under existing catalog/reconciliation policy; they are not a new command transport. Do not schedule the declined comparison or reinterpret this as approval of EB1–EB5.

## Decision 183 — EB1-B: bounded viewport zoom

On 2026-10-17 the owner selected revised EB1-B: 10%–800% (0.10–8×) viewport zoom.
This replaces the rejected 1.5625%–6400% proposal, not stored geometry or document size.
At 100%, retain one logical unit per native UI point. Coordinate bounds, stroke widths
and uniform transformation limits remain separate pending proposals. Preserve active-tool
navigation guards. Boundary/precision/performance tests remain required; no app implementation.

## Decision 184 — EB2-A: derived geometry tolerance

On 2026-10-17 the owner selected at most 0.25 native-point visible geometry approximation
error throughout supported zoom. Preserve original samples exactly; the bound applies to
derived geometry, not input filtering or saved-sample simplification. UX proposes hit slop,
control sizes, gesture thresholds and device mappings with each identified design feature.
Conformance tests remain required; selection is not measured accuracy evidence.

## Decision 185 — EB3-A: provisional software timing targets

On 2026-10-17 the owner selected provisional input callback p99 ≤1 ms; frame CPU work
p95 ≤half and p99 ≤three-quarters of a refresh interval; event delivery to submission
p95 ≤one and p99 ≤two refresh intervals. Retain approved ≤2 ms completion drain.
Define exact reference hardware, release build and reproducible workloads before acceptance.
Report stage timings separately; these are targets, not achieved measurements or physical
pen-to-screen latency guarantees. No foreground benchmark reservation is implied.

## Decision 186 — EB4: Apple Silicon and latest stable macOS

On 2026-10-17 the owner selected Apple Silicon Macs only, excluding Intel, then requested
targeting the latest macOS. Interpret latest as the latest stable public release, not a beta.
For the first preview, pin the exact stable OS release, deployment target and compatible
verified Xcode/Swift/SDK/Skia tools when implementation begins. Do not promise older-macOS
compatibility or add Intel/universal-binary build/test lanes. Newly released OS/tool updates
require deliberate validation and repinning; do not silently move a release's baseline.
Installed local versions are inventory, not proof of the latest stable public release.
Other platform architectures remain governed by their own plans.

## Decision 187 — EB5-A: broad browser storage feasibility

On 2026-10-17 the owner selected Chromium, Firefox and Safari/WebKit feasibility coverage:
check storage capabilities, pin/compile the Rust/Wasm SQLite backend, then prove actual
VFS, worker, recovery and shared conformance behavior. Retain decision 182's messaging/lock
architecture. Primitive API success does not establish working SQLite or browser support.
Existing WebKit failure and missing Firefox evidence remain open; do not call them passed.
This records scope and test requirements, not application implementation authorization.

## Decision 188 — EB7-A: cumulative stroke scale

On 2026-10-17 the owner selected cumulative positive uniform scale 1/64–64 relative to
original stroke geometry. Preserve original samples; do not normalize/rewrite them to evade
the limit. Apply scale to geometry and width; validate resulting painted bounds when the
coordinate contract is finalized. This does not change viewport zoom. Tests remain pending.

## Decision 189 — EB8: base pen width 1–512

On 2026-10-17 the owner selected 1–512 logical units for base pen width, superseding the
unapproved 0.1–256/0.1–1024 suggestions. Apply the selected pressure curve and stored
transformation afterward; resulting width can fall outside the base-setting range.
This is engine admission, not approval of a specific native slider. Future tools have
their own validated settings under existing shared-tool contracts.

## Decision 190 — EB9-A: nested caches and platform-specific budgets

On 2026-10-17 the owner selected nesting the 64 MiB macOS disposable CPU rendering cache
inside 128 MiB geometry/projection, all within the 512 MiB owned-memory aggregate.
Count shared physical allocations once and charge all retained references/lifetimes.
The owner requested platform-specific budgets. Keep semantic contracts shared while varying
resource-admission profiles by host/device capability. Non-macOS numeric profile candidates
in the engineering review are proposals awaiting review and real-device validation, not
approved safe guarantees or OS memory entitlements. Memory pressure reduces disposable work;
never silently discard accepted edits or protected recovery data.

## Decision 191 — EB10-A: initial macOS PNG raster limits

On 2026-10-17 the owner selected at most 16,777,216 pixels and 8,192 pixels on either axis,
with up to 128 MiB aggregate temporary raster/encoder memory inside the existing 512 MiB
owned-memory ceiling, separately charged from retained source. Verify bounded full-surface
feasibility. Three accepted jobs do not imply three simultaneous rasters; reserve before work.
Preserve fixed export pixel scale, opaque 8-bit sRGB output, destination safety and existing
native export behavior. No silent downscale, new resolution setting or tiled renderer adoption.
Actual scratch/encoder allocations and tests may expose a capacity failure below pixel limits.

## Decision 192 — EB11-A: bounded lazy gallery thumbnails

On 2026-10-17 the owner selected up to 32 MiB decoded CPU thumbnail cache within the existing
64 MiB macOS disposable cache. Request visible items first, then at most one viewport before
and after. Stable placeholders prevent layout shifts; prefetch is cancellable and lower
priority than visible/ink work. Count decode buffers and GPU copies in their relevant budgets.
Other host numeric limits follow separately reviewed profiles. No new thread topology or
eager whole-gallery materialization is implied. Implementation and native tests remain pending.

## Decision 193 — EB6-B: region-addressed document coordinates

On 2026-10-17 the owner selected region/chunk addresses plus local coordinates instead of
the previously proposed global-coordinate envelope. This selects a redesign direction,
not a concrete representation. Prepare region size, address types/ranges, local precision,
canonical normalization, cross-region strokes/transforms, viewport conversion, indexing,
typed ABI and schema source changes for explicit owner review before implementation.
The old global-f64 contract is a historical approved snapshot, not implementation authority
for the affected fields after this choice. Preserve its unrelated approved behavior.
Do not equate coordinate regions with raster tiles or introduce a tiled renderer implicitly.
Preserve original stroke samples, typed shared commands, positive cumulative scale 1/64–64,
base width 1–512, 10%–800% zoom and the ≤0.25 native-point approximation requirement.
Finite address capacity, overflow, precision and content/resource admission remain necessary;
this does not promise mathematical infinity or unlimited memory.
Require cross-region geometry/hit/transform/Undo, serialization/reopen, negative coordinates,
boundary carry/borrow, renderer precision and invalid/overflow input tests. Document migration/
version consequences without inventing legacy-data compatibility or rewriting approval hashes.
No application implementation, new schema or exact ABI is approved by this direction alone.

## Decision 194 — EB12-A: provisional per-platform resource profiles

On 2026-10-17 the owner approved the candidate table in the engineering review as provisional
starting caps: CPU aggregate/cache MiB: macOS/Windows/Linux 512/64; iPadOS/Android tablet
384/48; iOS/Android phone 256/32; web 128/16; visionOS/Android XR 384/48; tvOS/Android TV
256/32; watch image viewers 32/8. Undo per-client/aggregate MiB respectively: desktop64/128,
tablet48/96, phone32/64, web16/32, XR48/96 only if editing approved, viewers0/0.
All caches are nested, not extra pools. Retain macOS approved geometry/PNG/history details.
ChromeOS uses the relevant Android or browser profile; actual supported device class matters.
These are owned-memory accounting caps, not RSS guarantees, GPU allowances, OS entitlements
or evidence that all devices/documents fit. Complete subordinate reservation accounting and
GPU/framework headroom must be reviewed/tested for each port. Memory pressure may reduce
disposable work/admission, never silently discard accepted edits or protected recovery data.
Changing a material cap requires evidence and review. No platform implementation authorization.
Wear OS image-viewer numbers do not themselves choose its acquisition/renderer architecture.

## Decision 195 — WV1-A: advance offline image downloads for watchOS

On 2026-10-17 the owner selected explicit Keep on Watch downloads prepared by the iPhone:
bounded overview/detail images rendered from an identified drawing revision, transferred
ahead of use through WatchConnectivity and displayed with native watch UI. No bundled
watchOS Skia renderer or native vector renderer is required for this initial viewer.
Open complete downloaded revisions locally without a nearby phone. Background updates are
opportunistic; optional on-open refresh cannot block the last complete downloaded view.
Only mark available offline after validation and durable installation. Keep the previous
complete revision until a replacement is safely installed, reserving staging space first.
Explicit offline downloads are managed persistent data and survive ordinary cache eviction.
Exact package/region-detail guarantees, disk limits, removal/revocation/security, transfer
scheduling and typed metadata remain a concrete contract/design review before implementation.
No continuous video streaming, guaranteed background deadline or always-running phone process.
Uncached detail/new drawings/new revisions require a source; future server acquisition stays
separately scoped. Native drawing files are not independently rendered by this watch viewer.
Wear OS remains separately reviewed; do not infer the same architecture for it.
Required cases include phone-absent open, interrupted/reordered update, old/new revision
isolation, oversized/malformed media, low storage, explicit removal/revocation, locale/accessibility
and real paired-device battery/memory evidence. No device tests or implementation performed.

## Decision 196 — RC1-A: signed 64-bit region addresses

On 2026-10-17 the owner selected two signed 64-bit integers for region X/Y. Preserve
exact integer values through SQLite, typed native bindings and future web adapters;
ordinary JavaScript Number must not carry arbitrary i64 region values. No arbitrary-
precision address format selected. Concrete serialization/ABI and checked address
arithmetic belong in the revised contract packet. Region indices are coordinates,
not the existing 16-byte document/tool identities.

## Decision 197 — RC2-A: 65,536-unit coordinate regions

On 2026-10-17 the owner selected square coordinate regions of 65,536 logical units
per axis. A region is a reference for positions, not a page, allocated bitmap, DB per
region or selected raster-cache tile size. Region size is shared across platform
profiles and cannot vary with device memory. Exact canonical local range, boundary
normalization and overflow behavior must be specified/tested in the revised packet.

## Decision 198 — RC3-A: each sample stores its region and local position

On 2026-10-17 the owner selected region address plus local position on every sample.
Retain one SQLite row per actual sample and shared sample ordering. A stroke crossing
regions remains one stroke/selection/Undo operation; region boundaries must not introduce
visible seams or logical stroke splits. Preserve canonical accepted original samples
through subsequent move/scale/save/reopen. Do not add region-run grouping/compression
or new tables incidentally. Account the additional fields in memory, IPC batches,
file size and conformance fixtures without silently increasing approved budgets.

## Decision 199 — RC4-A: authoritative Rust coordinate normalization

On 2026-10-17 the owner selected central Rust normalization and validation. Platform
adapters translate native input intent; they must not duplicate canonical boundary
semantics. Define checked carry/borrow, negative positions, local precision, malformed
input and address overflow in the concrete contract. Only canonical validated positions
may be committed/persisted; preserve existing atomic batch/cancellation semantics.
Normalization of incoming positions must not rewrite stored originals during transforms.
This selects responsibility, not permission to implement unreviewed schema/ABI or rely
on unchecked conversion to a single global floating-point coordinate.

## Decision 200 — RC5-A: tested individual-stroke precision envelope

On 2026-10-17 the owner selected a tested local precision envelope for each individual
stroke's original span in the first preview. Different strokes can be placed across the
supported region address space; this does not introduce fixed pages, restrict all content
to one region or split cross-region strokes. Region size is not the stroke-span limit.
The exact numerical span is not selected: present it with precision evidence and the
concrete coordinate contract. Validate transformed painted bounds, pressure/width, scaling
1/64–64, zoom10%–800%, selection/clipping and the approved visible-error requirement.
Over-limit interactions follow existing atomic rejection/cancellation rules; no silent
truncation, automatic stroke splitting, original-sample rewrite or partial history/save.
This is a selected policy, not a tested implementation or unlimited-address accuracy claim.

## Decision 201 — RC6-A: shared Rust maps canvas-local native input

On 2026-10-17 the owner selected native pointer samples in canvas-local logical coordinates,
with the captured mapping generation, converted by shared Rust through the accepted viewport
into canonical region/local document positions. Native adapters own event-to-view conversion,
native point/backing-scale conventions and input metadata; they do not duplicate world mapping.
Validate session/client/mapping identity and reject stale events. Preserve existing mapping-
change cancellation, ordered actual samples, atomic batch validation and one-operation Undo.
Persist original accepted samples as per-sample region/local positions, not screen coordinates.
Future non-pointer typed commands may use canonical document positions; do not force agents
to emulate native pointer input. Exact revised DTOs/signatures and lifetimes require owner
review in the coordinated schema/interface packet. No new runtime code is authorized here.

## Decision 202 — RC7-A: canonical nonnegative local coordinates

On 2026-10-17 the owner selected finite f64 local coordinates in [0,65536) per axis,
with exact signed i64 region addresses. Rust carries/borrows whole regions with checked
arithmetic; local65536 becomes next-region local0, and world-1 can be region-1/local65535.
Canonicalize negative zero to positive zero; reject nonfinite values and address overflow.
These are invisible coordinate boundaries, not pages, raster tiles or stroke splits.
Exact normalization algorithms, SQL constraints, fingerprints and boundary tests belong
in the revised concrete contract. No application implementation authorized.

## Decision 203 — RC8-A: first-sample anchored stroke transforms

On 2026-10-17 the owner selected:
displayed = placement_anchor + uniform_scale * (original_point - source_anchor).
The immutable source anchor is the first actual sample, derived from the ordered original
samples without redundant stored source-anchor columns. Both anchors use region/local
positions. Persist current placement anchor and positive cumulative scale; initial placement
equals the first sample and initial scale is 1. Original samples remain unchanged.
The source anchor is not the user's scale pivot. Preserve opposite-corner scaling behavior:
compute new placement around the gesture pivot and new scale from the captured base state,
not accumulated event deltas. Preserve one-operation Undo and existing interaction guards.
Use checked relative arithmetic before narrowing; never collapse huge absolute addresses
to a global f64 merely to subtract them afterward. Reject unsupported precision/overflow
atomically under the selected stroke-span contract. Exact schema source/typed declarations and
numerical evidence remain for consolidated review; no schema publication or runtime code.

## Decision 204 — explicit feature edge-case responsibility and review

On 2026-10-17 the owner requested agent instructions to consider edge cases during feature
design/implementation. Establish docs/quality.md#edge-case-design-review and task-template
section6, implemented through existing specialist roles and independent reviewer. Implementers
own expected outcomes/tests; UX/UI own user-facing states; lead coordinates accountability;
build reliability supports evidence and later authorized validation. No extra permanent role,
model/concurrency change, runtime scanner or guarantee of exhaustive coverage. Existing
material architecture/design review approval, native foreground and implementation gates remain.

## Decision 205 — RC9-A: flat region/local database columns

On 2026-10-17 the owner selected RC9-A in engineering-budgets-v1.md. For the revised
schema source review packet, replace samples.x/y with region_x/region_y (signed i64 INTEGER)
and local_x/local_y (finite REAL in [0,65536)); replace strokes.translation_x/y with
placement_region_x/placement_region_y and placement_local_x/placement_local_y.
Retain uniform_scale and existing identity/order/revision/transaction semantics.
Derive the source anchor from the first original sample; no redundant anchor/region table.
Exact constraints, visualized schema source and measured storage costs remain review/evidence items.
This records the column-layout direction, not unseen schema approval or implementation.

## Decision 206 — RC10-A: distinct canvas/world types and Rust-owned mapping

On 2026-10-17 the owner selected RC10-A in engineering-budgets-v1.md. Use distinct
canvas-local pointer and canonical world/storage types. Native hosts report canvas metrics
and tag input with the accepted/displayed mapping generation; Rust owns viewport mapping,
canonicalization, stale-input rejection and transform calculations.
Move/scale intents carry start/current canvas points, interaction identity, ordering and
mapping generation; scale begin also identifies the corner. Rust captures base state and
derives updates; hosts do not compute authoritative world transforms or scale factors.
Preserve existing bounds, cancellation, atomic validation, target-token validation and Undo.
Exact generated declarations/layout/ownership, coordinate conventions, transform UX and
conformance evidence still belong in the consolidated review packet before implementation.
The user's RC11 entry is blank; no new choice is inferred and no RC11 is defined in the packet.

## Decision 207 — RC11-A: shared right/down coordinate orientation

On 2026-10-17 the owner selected RC11-A. X increases right and Y increases down in
both document and normalized canvas coordinates. Canvas-local (0,0) is the canvas
top-left; the document origin remains fixed while panning. Rust maps through its
independently stored canonical viewport center. Region Y and local Y share direction.
Native hosts convert event/view coordinates into this convention; do not assume native
AppKit view orientation. RTL presentation never mirrors artwork.
Preserve selected logical units, regional addressing, positive scale and normalization.
Require known-point round trips, positive/negative region crossings, pan/zoom,
selection/render/export parity and applicable flipped/unflipped native adapter checks.
RC1–RC11 directions are now selected; exact schema source/ABI/ownership and numerical stroke-span
evidence remain for consolidated review. This records a convention, not runtime implementation.

## Decision 208 — delegated conservative defaults and schema source handoff

On 2026-10-17 the owner requested automatic selection of recommended defaults and a schema source
review handoff rather than further preference questions. Prepare the minimal v3 amendment
consistent with RC1–RC11: include regional saved viewport centers, explicit validated field
initialization, existing indexes and bounds, and no redundant/persistent derived geometry.
These are lead-selected proposals for owner review, not approval of unseen schema source, runtime
implementation or measured optimality. Do not invent a supported stroke span without evidence.
Preserve prior approval snapshots. Scope here is the schema handoff; exact generated ABI and
feature UX remain separate review artifacts.

## Decision 209 — approval of S02 v3 regional schema

On 2026-10-17 the owner approved the regional-coordinate schema handoff and accompanying defaults/constraints. See docs/database/regional-coordinates.md.
This settles the regional schema amendment; it does not approve unseen revised generated
ABI, unmeasured stroke-span guarantees, application implementation or designs.
Preserve exact reviewed source bytes and historical approvals. Do not reopen RC1–RC11.

## Decision 210 — gallery visual exploration across requested platforms

On 2026-10-17 the owner requested competitor/UX/UI collaboration and many visual alternatives,
then directed design to start with the documents/gallery screen. Authorized design exploration
covers macOS, web, Android, iPadOS, iOS, watchOS, Wear OS, tvOS and Windows, with native traits
and transferable shared theme. PNG examples are allowed before later design review reconstruction.
Prepare three distinct gallery families using identical scope/content; viewer hosts stay read-only.
This is design-artifact authorization, not app implementation, extra features, exact design approval
or a bypass of identified editable/adaptive design before implementation.

## Decision 211 — Native Gallery revision and Compose Material 3

On 2026-10-17 the owner authorized the recommended Native Gallery redesign: connected interactive
transitions, neutral light/night palettes, native platform-specific controls and responsive tablet
windows/orientations. Native Showcase is no longer active. The owner explicitly selected Kotlin
+ Jetpack Compose Material 3 for Android phone/tablet and its adaptive desktop route, replacing
the prior Views direction. Shared Rust command authority, typed boundary and Skia remain unchanged.
Compose state presents shared projections; do not create a second editing model or adopt a new
executor/transport. Android application implementation still follows macOS and approved feature scope.
Wear/TV/XR component and capability feasibility remain separate. Read native-gallery-v4-plan.md.

## Decision 212 — Gallery removal with persistent in-screen Undo

Owner requested no ordinary delete confirmation; replace each removed item with a same-size
Deleted NAME / Undo placeholder until leaving the gallery. This supersedes ordinary confirmation
UX in decision 8. Approved redesign direction: preserve independent Undo per item, no countdown,
no gallery reflow, and no finalization after failed/cancelled navigation or mere backgrounding.
The prototype simulates staged removal in memory only. Before production, review durable staged
removal, crash/restart and quit handling, ownership fencing, exports, restoration failure and
finalization retries. Old decision 85 confirmed-delete recovery intent must not be reused for the
initial recoverable tap. Busy-owner rejection and export cancellation consent are not waived.
Preserve historical schema/approval snapshots; any concrete schema/ABI amendment needs review.


## Decision 213 — restore one combined UI/UX designer

On 2026-10-17 the owner requested undoing the designer-role split. Configure ui_ux_designer
as the single accountable owner of interaction flows, native visual foundations, adaptive
design review, motion, accessibility/locale design and running-interface design review. Retire the
separate ux_designer and ui_designer configurations; earlier split records remain historical.
Use behavior and visual checklists within one feature packet. Lead coordinates feasibility;
platform engineers retain implementation/tests and fresh reviewer retains independent review.
Identified design review owner approval, architecture gates, scope and concurrency limits are unchanged.
See docs/design/roles.md. This configuration update does not rename already running agents.

## Decision 214 — selected gallery and live Vite prototype

On 2026-10-17 the owner selected mobile artwork cards (A), Monochrome with a distinct New tile, whole-card edge-to-edge drawing transitions and reference-style menu morph. Owner explicitly authorized a production-quality Vite/TypeScript live prototype in apps/web, browser-controlled resize/theme and a platform selector, replacing and deleting gallery-v1–v4 experiments. Preserve original watch references. This authorizes prototype code/manifests/tests, not Rust/native implementation, persistent deletion or a new storage/FFI architecture. Read docs/design/live-web-prototype.md; identified native design review approval remains required.

## Decision 215 — live web refinement and typed styling/locales

Owner requested separate JSON locale files with stable IDs, Vanilla Extract styling, smaller adaptive minmax tiles, no scrollbar layout shifts, web overflow-only actions (native gestures remain native-platform work), continuity from menu to Rename/Delete, coherent Android shapes and a quieter dashed New tile. Implemented within the authorized live prototype. This supersedes the fixed three-column preference and web context-menu interception in decision 214. It changes no Rust, storage or native framework boundary. Current behavior and verification: docs/design/live-web-prototype.md.

## Decision 216 — attached Apple creation control and overlay scrolling

Owner rejected the iPhone floating action button, reserved scrollbar gutter, dark hover outline and Delete collapsing back into its removed trigger. Within the authorized prototype, use an edge-attached Apple bottom toolbar, zero-width custom overlay scrollbar with native scroll behavior, soft pointer-hover shadow and preserved keyboard focus ring. Committed Delete fades the menu in place while artwork crossfades into same-slot Undo; cancellation retains the ordinary anchor-collapse animation. Android keeps its FAB. This supersedes decision 215’s gutter implementation only, without changing native/engine/storage scope.

## Decision 217 — nearby Rename and artwork continuity

Owner explicitly approved all three refinements: compact iPhone document-plus/New toolbar; Rename anchored near its action menu; smooth artwork sizing throughout whole-tile expansion/collapse. The prototype keeps menu-corner placement after morph cleanup and clamps to keyboard-visible bounds. Shell and artwork animate independent geometry on a shared clock; the underlying source stays hidden until the handoff. This corrects a mismatch between full-surface artwork and the padded gallery image, while preserving an edge-to-edge drawing view. Native controls, persistence and engine scope are unchanged.

## Decision 218 — reversible Rename and creation appearance

Owner requested outside-press dismissal and a Rename-to-ellipsis return for Cancel and successful Save, plus gradual New drawing background/text transitions in both directions. All Rename exits now share the same current-bounds morph, including Escape; Save commits once immediately and resolves the replacement live trigger. Outside dismissal cancels without click-through. New tile plus/name/dashed border fade while its neutral surface blends to white, reversing on return. Interrupted motion starts from current presentation; reduced motion settles immediately. This is a routine refinement within the authorized prototype, with no new native, storage or engine scope.

## Decision 219 — centered gallery and platform action paths

Owner requested three moderately larger centered desktop tiles, Delete menu-to-Undo continuity, swipe-only mobile actions, pointer-positioned desktop context menus, Web-only ellipsis and removal of animated menu blur. Desktop now uses three minmax columns capped at420px within1372px, then two/one as width narrows. Native mobile previews reveal explicit Rename/Delete actions on horizontal swipe; no long press or full-swipe deletion. Native desktop previews use pointer context menus, with keyboard fallback. Web retains ellipsis and browser context gestures. Delete commits immediately, then its menu morphs to the live same-slot Undo button; one opaque surface owns the visual handoff. This supersedes decisions214–218 only where these presentation choices differ. No native framework, persistence or drawing-engine scope was added.

## Decision 220 — disposable blank preview and Undo return

Owner requested that opening/closing New drawing without changes never adds gallery tiles, and that Web Undo morphs back to the ellipsis. New now opens one transient preview outside the sample collection; repeated entry, history traversal and reload create no gallery record. This prototype cannot edit yet. This does not change future durable draft policy. Undo restores immediately, then the current Undo/Delete presentation morphs to the restored Web ellipsis with a single visual handoff. Interruption, focus and reduced motion remain safe.

Mobile Delete/Rename changes are proposals only: continue the artwork card left out of its slot after explicit Delete, reveal same-slot Undo, and slide the card back on Undo; Rename closes the swipe rail and reveals a compact form with a short fade rather than stretching the action. Owner review is pending.

## Decision 221 — clean drawing paths and mobile action motion

Owner authorized ordinary drawing paths, platform selection without URL changes, and the mobile proposals from decision 220. Drawings use /drawing/<id>; the blank preview uses /drawing/preview-new. Known direct links and reloads reopen their sample/preview, with a gallery Back destination. Unknown initial paths return to the gallery. Platform selection remains in memory and does not rewrite the address/history; an initial platform query remains supported for review links.

Native mobile previews continue the artwork left out of the clipped card slot on explicit Delete, revealing same-slot Undo. Undo slides artwork back, taking over an unfinished outgoing slide. Rename retracts swipe actions and fades a compact keyboard-safe form in/out without a geometry morph. Web retains its menu/ellipsis morphs. Mutations remain immediate and memory-only; reduced motion settles immediately. No native framework, persistence, actual drawing edits or additional screens were introduced.

## Decision 222 — complete mobile Delete, direct swipe and shared catalogs

Owner approved repairing the entire Delete presentation (shifted artwork plus visible action rail), finger-following swipe, and shared locale authoring with generated platform resources and validation. iPad is an explicit exception to prior Web-only ellipsis: it always uses ellipsis. iPhone/Android swipe actions apply only when one tile fits across the gallery; wider grids use ellipsis. The owner's phrase “one row fits” is interpreted as one tile across, stated before implementation. Desktop pointer menus and Web browser gestures remain unchanged.

Delete preserves the complete current visible surface before moving it left as one clipped layer with gentler timing. Undo stays immediately available and reverses/settles current presentation safely. Direct swipe tracks horizontal displacement, preserves native vertical pan, and never deletes on full swipe. Layout changes cancel transient gesture state and update action availability.

The shared authoring catalog owns semantic message IDs, translator context, typed arguments, en/uk translations and explicit platform overrides. Deterministic generators emit web JSON, Apple String Catalogs, Android string/plural XML, Windows resources and gettext sources. Hosts retain native locale selection/formatting; Rust domain semantics and stored user names remain unchanged. Generated resources are preparation for native hosts, not proof of native integration. Validate source completeness, argument/plural compatibility, escaping, ID collisions and stale outputs. Existing native app implementation/FFI/storage gates are unchanged.

## Decision 223 — Undo restoration continuity and generated artifact retention

Owner requested a desktop artwork fade on Undo, consistent rail travel on settled mobile Undo, and review of generated/local visual artifacts in Git. Non-swipe restoration fades artwork/name while retaining the existing overflow-control morph where applicable. Mobile return includes artwork and action rail even after Delete has completed or the gallery has rerendered; rail closure follows the visible return. Restored data/focus remains immediate; reduced motion and interruptions settle safely. No new product behavior is added.

shared/localization/generated is reproducible and Git-ignored. Web dev/build/typecheck/test and root typecheck prepare resources; check bootstraps only when the generated folder is absent, retaining stale-output rejection otherwise. Unchanged generation does not rewrite timestamps. apps/web/quality/web-* screenshots/videos are ignored and kept locally; generated reports and captures remain local; authored task summaries identify verified results. Source artwork and retained design references stay included. Historical binary links require retained/uploaded run artifacts; this change does not create artifact hosting.

## Decision 224 — iPhone creation placement, button feedback and shared colors

Owner approved the recommended top-right + New action for iPhone, replacing its bottom action strip. The product title/action row remains distinct from wrapping prototype controls. Keep a minimum44px target, localizable label/accessibility name, reliable creation origin/return focus, portrait/landscape behavior and no duplicate creation action in the empty state. iPad retains its previously selected controls. Cancel/Rename receive neutral hover and stronger pressed feedback with stable geometry and visible keyboard focus.

Owner requested shared color schemes across packages. A framework-neutral semantic color catalog under shared/theme becomes the single authoring source consumed by the web theme adapter and available to future hosts. Preserve existing light/dark colors; proposed lighter night palettes are not selected. Native controls/materials and platform mapping remain host responsibilities. This data extraction adds no native application, renderer, transport or cross-language runtime. Validate mode/key parity, color syntax and critical foreground/state contrast.

## Decision 225 — softer night appearance and Apple compose material

Owner explicitly approved the softer night scheme and an Apple Notes-like glass treatment. After rejecting retention of the top + New action, the owner selected a bottom-right glass compose button. This supersedes decision224's iPhone placement and palette-preservation restriction. iPhone uses a 56px icon-only circle with the localized accessible name New drawing, safe-area offsets and sufficient final-row clearance. No full-width bottom strip or duplicate top creation action; empty galleries retain the centered creation tile. Existing iPad placement remains.

Use restrained translucent backing, a fine rim, subtle local shadow and opaque foreground for Apple creation/Back controls. Existing card ellipses stay quiet. Dialog actions retain readable fill-only hover/pressed feedback. No animated blur or content blur is added; opaque fallbacks support reduced transparency, increased contrast and forced colors. The browser treatment illustrates the reference and is not native Liquid Glass.

The shared dark palette shifts from near-black to charcoal; display paper softens to #eeeeec across gallery, preview and motion endpoints. White-backed sample images use isolated darken compositing without editing assets or inverting colors. Darker strokes retain their values; very pale highlights can be capped by the display paper. This is prototype presentation, not a document/export transformation or an accepted color-critical editor policy. Light appearance remains unchanged apart from the explicitly requested control refinements.

## Decision 226 — Undo paper continuity and shared-resource follow-up

Owner requested gradual dark deletion-surface to restored-paper transition on Undo. Keep restored semantics/focus immediate and the tile opaque; blend its paper and artwork-area backing on the same300ms timeline as content/Undo-control presentation. Reduced motion restores immediately; interrupted/appearance-changing presentation settles cleanly. Mobile keeps its already-selected slide treatment.

Owner requested documentation of reduced transparency on other platforms. docs/design/accessibility-materials.md records implemented browser scope and separately planned native signals, fallbacks and acceptance. No native implementation is claimed.

Owner relaxed mandatory JSON catalog authoring and requested a TypeScript recommendation. docs/design/shared-resources-plan.md proposes trusted data-only typed modules, validated deterministic platform generation and byte-identical locale migration. Current JSON sources remain; this is a plan, not an implemented format change. Shared theme authoring/web consumption exists; native color resource generation/consumption remains pending. No new universal runtime or domain-model ownership is introduced.

## Decision 227 — typed catalogs and compose transition separation

Owner approved the shared-resource plan following decision226. Migrate theme and locale authoring to trusted data-only TypeScript, preserving semantic IDs, wording, palette and generated resource bytes. Retain runtime validation and deterministic/stale-output checks; include shared source in type/lint/format/size gates. Remove superseded authored JSON; generated resources remain ignored. This is build-time authoring, not a new host runtime or native theme rollout. Other shared behavior remains subject to existing Rust contracts and implementation scope.

Owner reported the iPhone blank canvas visually merging with gallery cards during collapse. Add a fine decorative perimeter during the compose-to-canvas transition; preserve independent artwork geometry, exact return target and clean borderless steady canvas. Reversal samples the current visual edge; resize/reduced motion settle cleanly. Scope to the iPhone compose origin, without changing other card hover or canvas framing.

## Decision 228 — browser feedback and application-owned evidence

Owner requested removal of WebKit touch tap highlights; set transparent tap-highlight color on prototype elements, including native selects whose user-agent styles override inheritance while preserving explicit pressed and keyboard-focus feedback. New drawing uses the same restrained hover shadow as drawing cards on fine pointers that support hover, preserving its dashed border and geometry; touch interaction does not acquire a sticky hover treatment.

Generated browser and repository verification artifacts remain local and untracked. Authored task records link test source and state exact results, limitations and unresolved failures. Preserve required failure fixtures and private recovery data.

## Decision 229 — layered themes and continuous action elevation

Owner approved separating primitive colors, semantic light/dark roles and platform adapters while preserving current colors. Shared palette data and semantic references resolve through a validated one-hop mapping; web retains existing CSS names and values. Numbered shades describe available values, not a uniform scale or contrast guarantee. Components use semantic roles. Native theme generation and host consumption remain pending; no new native runtime or universal control system is introduced.

Owner requested dimming as soon as Rename/Delete opens, continuous through Rename. One shared backdrop owns that dimming, using the previous dialog scrim color; the native browser dialog backdrop is transparent to prevent double dimming. Dismissal and Delete fade the shared layer, and outside presses dismiss without activating content underneath. Mobile Rename still supports its existing compact fade. No animated blur is added.

Owner requested persistent tile elevation during expansion. Capture the current source shadow before hiding the card or New tile, retain elevation during detached travel, and fade it only near the full-screen destination. Reverse motion samples current presentation and returns to the live source appearance. Steady drawing surfaces remain borderless/shadowless, existing iPhone compose perimeter remains, and reduced motion/interruption cleanup applies.

## Decision 230 — native theme resource generation and opt-in web previews

Owner authorized native theme resource generation from the shared semantic scheme, following the locale generation workflow. Emit Apple named-color assets with appearance variants, Android light/night XML, WinUI Light/Dark dictionaries and GTK light/dark named colors. Preserve every existing resolved channel and alpha value, validate resource names/collisions, and generate deterministically. Generated resources are ignored by Git; the root check bootstraps only when the entire output directory is absent and otherwise rejects stale or unexpected files. Native app inclusion, system accessibility mappings and actual-host rendering remain separate from resource generation. This adds no native application or TypeScript runtime to native hosts.

Owner requested removing or hiding the web platform picker. Normal web entry omits the picker and its label; explicit review links using ?preview=1 or an existing valid ?platform=<id> retain it for design review/testing. Selecting a platform still changes neither URL nor history. Invalid/unrelated query values do not expose the picker. Reset samples and the prototype notice remain unchanged.

## Decision 231 — web-first implementation, macOS primary target, clean normal header

Owner clarified that macOS remains the primary product target, but web will be developed first because it is the platform they know best and can review most effectively. Implementation order is web, then macOS, followed by the native platform backlog with iPhone/iPad retaining the next native priority. This supersedes prior macOS-first sequencing and the P05 dependency on macOS S08 acceptance. It does not replace shared Rust editing/document/persistence semantics, Skia/CanvasKit or platform-native controls. Browser storage, Wasm bindings and execution need their own concrete reviewed contracts where not already approved; a development-order change does not itself implement those systems or launch a new feature slice in this turn.

Owner clarified that the entire review-controls section is unnecessary in normal web use. Omit the platform picker, Reset samples and Browser simulation together from normal entry, without leaving an empty controls row or keyboard stop. Existing explicit preview links retain the section for review/testing; product title and gallery remain. This supersedes decision230's retention of Reset samples and simulation text on normal entry.

## Decision 232 — one Linefield visual system; retire the tool wheel

On 2026-10-18 the owner rejected the tool wheel and removed the requirement to follow each platform's native visual language, including Liquid Glass and Material styling. App-owned UI must use a consistent Linefield visual system across platforms. The desktop drawing direction is the left tools rail with contextual settings across the top. Wheel/preset-wheel/color-face explorations are historical, not a backlog requirement. The reference does not approve extra tools, smoothing/opacity behavior, exact controls or implementation.

This supersedes mandatory platform-specific appearance in earlier foundations, gallery/material directions and platform mappings, including the visual obligations of decisions 211 and 225. Historical approval records and existing gallery code/evidence remain intact; a redesign is not implemented by this documentation change. Shared component appearance, icons, typography, shapes, colors, states and motion should be designed consistently, with adaptive layouts for window size, input and accessibility. Consistency is not a requirement for identical pixel dimensions on phones, desktop, watches and TVs.

Native text/IME, keyboard/focus, accessibility, safe areas, window/lifecycle integration, OS-owned file and permission panels and system preference handling remain host responsibilities. AppKit/UIKit, Compose, WinUI, GTK and semantic HTML remain the selected host direction; their default visual themes are no longer mandatory. This does not choose a replacement framework, an all-Skia UI or a custom universal widget engine. Existing macOS color-control behavior remains until a concrete replacement is reviewed; native appearance is no longer a requirement for that app-owned control.

The owner's question about Rust is not authorization to migrate styles. Retain existing trusted data-only TypeScript theme authoring and deterministic platform-resource generation. Designer/lead recommendation: extend shared visual resources and component specifications as reviewed features need them; Rust continues to own editing/document/tool semantics and validation. A renderer may consume generated values if required, without becoming the design authoring source. Detailed tokens, component implementations and host adaptation remain scoped design/engineering work. Feature, design review, contract and implementation gates are unchanged.

## Decision 233 — one Web gallery; remove hidden platform simulation

On 2026-10-18 the owner requested dropping the gallery's platform-dependent pattern and hidden switch: “Drop it. Use web everywhere.” Implement the existing Web gallery pattern at all responsive widths in apps/web. Remove URL-selected platform presentation/capabilities, hidden platform/reset/simulation controls, native-style overrides, custom native-preview context menus, phone swipe actions and Apple-only creation controls. Former ?platform and ?preview links load the same Web interface without selecting another mode.

Preserve the existing Web ellipsis actions, browser context/long-press behavior, responsive three/two/one-column grid, dashed New tile and narrow populated-gallery New button, shared themes/locales, anchored Rename, same-slot Delete/Undo, browser routes and whole-card/artwork transitions. This is a scoped authorized gallery-prototype implementation under decision214, superseding previous platform-simulation requirements. Current task/evidence: P05-G01. Historical evidence is retained; obsolete native-preview assertions are retired explicitly.

“Web everywhere” here selects this gallery UI pattern. It does not authorize replacing future native application frameworks with web views, moving styles into Rust, or adding an engine/persistence layer. Planned view-only watch/TV hosts still need trusted capability enforcement and VIEWER-001 tests; query-selected browser simulation was never native enforcement evidence.

## Decision 234 — selected drawing screen v2 and recoverable design cleanup

On 2026-10-18 the owner requested handoff to another chat, whose first task is to implement the attached slim left rail + top settings bar screen. Record the exact attachment at docs/design/drawing-screen/reference.png and update P05-D01 to that UI slice. This selects and authorizes the web UI prototype screen, superseding circular v1's pending approval. It is not authorization for real drawing/eraser/shapes/smoothing engines, persistence, native applications or a framework/ABI migration. Detailed unspecified panels should stay minimal and within UI-only scope; current native/design review/engine gates remain. No screen implementation occurs in the handoff turn.

The owner selected the drawing reference and authorized removing unused explorations from the repository. Keep the authored [drawing reference](design/drawing-screen/reference.png) and current specification. This is not permission to delete private recovery data, merge or release.

## Decision 235 — repository-owned design workflow and autonomous task continuation

On 2026-10-18 the owner removed the external design-service requirement and requested removal of its mentions from the project. Use versioned repository design specifications, semantic resources, reviewed reference images and running web prototypes. Designer/engineer feasibility and identified design approval still distinguish reviewed scope from unseen product changes; no third-party design account, connector, subscription or editable service file is a prerequisite.

Current work follows scoped task authorization, specialist/independent review and owner merge authority. No material ABI, schema, security mechanism or unseen product design is approved by general autonomous-work permission.

## Decision 236 — durable-library sequence and recoverable removal lifecycle

On 2026-10-19 the owner approved the following sequencing and removal-lifecycle policies and requested concrete storage, deletion-schema and engine contracts for review. Deliver the durable web library before real
pen drawing. Preserve staged Deleted/Undo placeholders across crash/reload/close before an
accepted in-app departure. Finalize the exact staged set only at a durable logical departure
commit after destination readiness. Failure/cancel before that boundary retains Undo; lost
reply/crash after commit reconciles accepted finalization, without promising restored Undo.
Gallery removal recovery is separate from session-only document edit Undo.

This approves product sequencing/lifecycle, not unseen schema fields, browser VFS/topology,
regional ABI, normalization or span limits. Prepare identified artifacts and evidence for review.
The owner permits requesting Computer Use and other necessary permissions; no blanket desktop
focus reservation or arbitrary privileged/system change follows. The expired heartbeat stays
paused; ordinary continuation proceeds in this chat.

## Decision 237 — browser storage experiment and removal-scope review direction

On 2026-10-19 the owner approved these three recommendations: run the bounded synthetic SQLite/OPFS
storage experiment with its pinned candidate and isolated-origin/SharedArrayBuffer requirement;
accept browser-local storage with honest site-data-clearing/eviction limitations; and accept
the per-gallery removal-scope behavior and schema amendment. Another live gallery cannot
Undo or finalize a scope it does not own; verified owner loss permits explicit fenced recovery,
with multiple orphan scopes kept separate. Persistent-storage refusal is reported honestly.

The owner requested finishing the remaining contracts and design review, then returning with
a concrete durable-library implementation scope for approval. This authorizes the disposable
synthetic experiment, not production persistence, application Rust/Wasm integration, tested
DDL/migrations, all proposed numerical capacities, or an unreviewed bridge/deployment mechanism.
Schema review approval is distinct from runtime conformance and executable migration evidence.

## Decision 238 — diagram style and task/PR/chat workflow

On2026-10-19 the owner explicitly approved the shared diagram style and the proposed task/PR/fresh-chat
workflow, authorized repository/workflow bootstrap with preservation of all existing work, and
requested conversion of existing diagrams plus workflow SVG documentation. The approval covers the selected diagram appearance and task/PR workflow; it does not approve example architecture or production implementation.
Explanatory diagrams use generated native SVG from shared definitions and tokens.

One executable task owns one branch and PR. The harness prepares design, implementation, tests
and independent review within approved scope; the owner reviews/merges or requests changes.
After completion notification the harness verifies integration and provides a concise next-task
prompt for a fresh chat. Milestones contain child tasks; they are not single implementation PRs.
Routine conforming documentation needs no new approval. Material architecture gates remain.

The owner configured origin as https://github.com/AlexandrLesiv/Linefield.git and explicitly
authorized public publication of reviewed source and documentation. Exclude private research
captures, credentials, local recovery snapshots and regenerable downloads. This permits bootstrap
publication/PR preparation, not merging its changes to main or approving durable engine code.
Preserve the approved proposal snapshots and record probe limitations and any required changes.

## Decision 239 — parallel task review and shared generated documentation

On2026-10-19 the owner requested independent tasks progressing while PRs await review, retirement
of the hosted database diagram toolchain in favor of native SVG, shared reusable definitions and
W3C-community design-token format where appropriate, plus obsolete documentation cleanup.
Use explicit hard/contract/independent dependencies, isolated worktrees, one branch/PR per leaf,
shared-path ownership and parent-first integration for stacked PRs. Owner merge authority remains.

DTCG2025.10 JSON is selected for diagram style tokens. It is a Community Group specification,
not a W3C Recommendation. Diagram structure/schema data is separate from style tokens. Current
app theme migration is a distinct parity-preserving task; no recolor or native rollout is implied.
Generate schema SVGs/dictionary from unchanged reference SQL, reviewed notes and documentation-only
job definitions. Shared sources are authoritative; generated exports remain local and untracked. No schema/ABI/runtime authority is broadened by changing review format.

## Decision 240 — local component styles and evidence cleanup

On2026-10-19 the owner requested full retirement of old schema-tool names, an explanation of the
quality folder and local Vanilla Extract styles wherever possible. Component rules use exported
local classes with explicit DOM bindings; globals are limited to resets and genuine document-wide
preferences/integration. This is a behavior/appearance-preserving refactor, not a redesign.

Generated reports remain local; authored task documentation records test linkage and verification limits. Schema fixture changes are editorial metadata only and must prove all semantic fields unchanged before updating their pinned hash.
Keep unresolved failure fixtures, current source/test evidence and approval scope. No history
rewrite, account deletion, schema behavior change or production implementation is authorized.

## Decision 241 — task documentation and test scope

The owner selects plain Markdown task files under tasks/, with PR and relevant design/test links.
Use one task, one branch and one PR. The owner reviews and merges; verify integration before
starting dependent work. Automated tests are E2E only. Static type checking, lint, formatting,
builds and source validation remain development checks; do not add unit or developer-tool suites.
Task documentation grants no new product, persistence, native or architecture approval.

## Decision242 — autonomous complete web vector migration

On2026-10-21 the owner explicitly authorized M01–M09 and remaining scoped approvals/permissions
for ten hours, ending2026-10-22 06:21:48UTC. The lead may settle material contracts/design
within that scope using configured specialists, implement/check/review and open separate PRs.
MIG-C1/MIG-D1 record those delegated engineering decisions; they are not personally reviewed
owner versions. Direct WebGL2, Rust-owned semantics, pure geometry worker,384MiB graphics soft
target, complete streaming fallback and full retained5207 features supersede conflicting older
web first-slice restrictions. Preserve320MiB CPU soft target and performance profile v1.
One task/branch/PR and owner-only merging remain. Frozen stacked parents allow continued work
while the owner is absent; verify integration before parent-first merge. Preserve current
previews and unrelated work. M10–M14 worker experiments and native/storage work are excluded.

## Decision243 — renewed autonomous M03–M09 and developer diagnostics

On 2026-10-22 the owner explicitly renewed autonomous M03–M09 implementation and delegated
all necessary technical/design decisions for the next 10–12 hours. The continuation ends on
the owner's return or 2026-10-23 07:13:55 UTC (10:13:55 Europe/Kyiv), whichever is first.
The owner also approved retaining logging and adding development mode according to the
proposed WEB-DIAG-D1 direction in docs/logging.md. The lead records concrete contracts and
design refinements with configured specialists without further owner approval in this window.

Complete the active M03 repairs and verification, then bounded diagnostic task P05-DIAG01
and M04–M09 in dependency order. Each leaf still has one writer, branch and PR; frozen stacked
parents permit continued work while awaiting owner merges. E2E-only behavioral tests, static
and build checks, designer and fresh independent review, performance/correctness thresholds,
source privacy and preservation rules remain. No merge, release or automatic evidence acceptance.
The live reference application at http://127.0.0.1:5207/ may be compared read-only; it is not
permission to change the reference repository or inherit its test/performance claims.

Reuse the existing thread continuation every 20 minutes, report meaningful outcomes only and
pause it with a completed/remaining handoff at return, completion or deadline. Preserve65177
and existing previews; show new reviewed builds separately. M10–M14 experiments, native hosts,
persistence and unrelated features remain outside this authorization.

## Decision244 — resume M04 after owner return

On2026-10-23 the owner returned, ending the decision243 absence window and pausing its scheduled
continuation. The owner subsequently explicitly resumed M04: fix its three fixture findings,
finish panning/rendering optimizations, run checks and reviews, update PR20 and open a separate
preview for manual testing. Preserve current65220 and all other existing previews. This resumes
the approved M04 scope and its verification gates, not M05–M09 or the overnight schedule.
Continue one writer/branch/PR and the reviewed shared Rust/host boundaries; no merge is authorized.

Within that repair scope, the lead refined the existing rendering boundary after the reported
held-pan regression and specialist/independent review. The named view-display capture validates
the current Rust-owned gesture and completed prefix, allowing the host to preserve the displayed
union in existing scratch storage and free its reconstruction target before mouse-up. It grants
only disposable presentation authority, without editing/history changes or additional targets.
See [the current live-coverage contract](interfaces/web-live-coverage.md). This technical refinement
and agent review do not imply owner acceptance or completion of M04's remaining optimization gates.

After that repair was pushed at8773c12, the owner explicitly renewed the remaining M04 work:
finish rendering/panning optimizations and checks, update PR20 and open a new preview, preserving
the reviewed port65222 build unchanged. The same task, branch, writer and quality gates continue;
this does not resume M05–M09, restart the schedule or authorize a merge.
