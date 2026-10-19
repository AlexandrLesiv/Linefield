# Objectives and first preview

Deliver an editable vector sketching app: responsive, offline-first and cross-platform, with a consistent Linefield visual system and shared Rust behavior. Host implementations retain platform input, text editing, accessibility and OS integration; platform-native visual themes are not mandatory (decision 232). macOS remains the primary product target; implement web first, then macOS, with iPhone/iPad the next native priority. Responsiveness claims require measurements.

The tool/preset wheel is retired. Desktop drawing design proceeds from a left tool rail and top contextual settings. Decision234 authorizes the selected screen as a UI-only web prototype under P05-D01; real behavior for additional tools/properties still needs its existing scope and contract approvals. Shared style definitions do not need to move to Rust: keep existing shared theme authoring and generated host resources; component-system expansion remains future work.

Selected macOS preview scope (delivered after the first web implementation): local developer preview; pen, pan/zoom, single-stroke selection/move/uniform scaling/deletion, undo/redo, an app-managed gallery/library, autosave and native file exchange/recovery. New document format, no legacy compatibility. Skia renderer, Swift/AppKit host, typed Rust FFI with generated declarations. Working name Linefield; root /Users/oleksandr/projects/linefield.

Selected preview window model: one document in one window, with independent session ownership; tabs and multiwindow deferred.

Selected Rust structure: four focused crates—engine, services, renderer and native integration—with the engine independent of native UI, filesystem access and Skia.

Selected macOS compatibility (decision 186): Apple Silicon only; latest stable macOS for the first preview. Pin exact OS/toolchain at implementation; Intel and older macOS support are outside this target.

Selected macOS starting topology: main-thread editor/Skia ownership with bounded background storage/logging and an early performance checkpoint.

Selected native document container: SQLite; no legacy document compatibility. Autosave to the document is selected, with background revision-aware persistence; new untitled drawings use app-managed SQLite drafts, retained as library documents without requiring names or destinations. Gallery is the normal entry point; S02L precedes the canvas. Gallery deletion now uses an immediate recoverable removal with an in-place Undo until successful navigation away (decision 212); concrete durable recovery/finalization contracts must be reviewed before implementation. Naming, deletion failure handling and file-exchange details require policy/design review.

Proposed details still under review: concrete scheduling/queue budgets, ABI, SQLite schema/save/recovery lifecycle and concrete native/PNG export behavior. Native snapshot + PNG export is selected for the preview (decision 18); SVG/PDF are deferred. Review docs/decisions.md before implementing.

P05-E02 separately approves buttons-only viewport rotation for the in-memory web editor;
this does not approve artwork rotation editing or rotation on unimplemented native hosts.
Defer multi-selection, layers, eraser, imported images, text, document clipboard, accounts/sync, agent transport, plugins, workbench, later platform applications and distribution. Web now leads implementation through P05; concrete Rust/Wasm, storage and execution contracts still require review. A clean architecture is not permission to add those features.

Preview success means an actual running app, complete required acceptance matrix, native E2E, designer assessment, independent review, reproducible build instructions and explicit limitations. Software timing is not a physical pen-to-screen measurement.

Planned platform hosts already have documentation placeholders under apps/: macOS, iPhone/iPad, Android, Windows, Linux, web, visionOS, tvOS, watchOS and ChromeOS integration. See [platform plan](platforms.md). Deferring platform application features does not defer their architectural requirements.

Additional planned hosts: Android TV/Google TV (view-only) and Android XR (initially reviewed 2D scope). Their placeholders do not change the web → macOS → later native platforms development sequence.

Wear OS is also a planned host under apps/wearos (P12); view-only capability is owner-selected (decision 152), with watch-specific toolkit and acquisition policy reviewed before implementation.

External native files are imported as independent library copies (decision 9), with new identity
and no source write-through. Future cloud integration must not conflate imports with replicas;
providers/protocols and network implementation remain deferred.

Undo/Redo lifetime is session-only (decision 10): saved content survives gallery return/restart,
history does not. Autosave does not clear history; cancelled/failed navigation preserves it.

Drawing coordinates use platform-independent logical canvas units (decision 14). Zoom/display
scale maps them to screen pixels without changing stored geometry. Exact mapping and limits
remain contract work; physical measurement/print-scale features are not implied.

Initial drawing experience is selected (decision 16): one solid round pen, pressure affecting
width only, constant width without pressure, tilt ignored, width/color controls retained. Fixed
light artwork background; Linefield chrome follows the system light/dark preference without altering saved colors.
No brush library or adjustable stabilization. Linear pressure response is selected (decision 34);
no movement filtering initially (decision 35). Minimum/contact and exact geometry rules await S02 review.

Library storage layout is selected (decision 22): a separate SQLite catalog plus one SQLite
file per drawing. Artwork is not duplicated in the catalog. Concrete schemas, metadata authority
and interruption-safe cross-file lifecycle remain S02 review work.

Decision 79 defines 100% zoom as one logical canvas unit per native UI point (AppKit point on
macOS). Backing scale determines raster pixels; physical millimeter size is not guaranteed.
Document geometry and PNG export scaling remain independent of display density.

## Owner's product direction (decision 148)

Concepts-inspired, open-source, cross-platform infinite-canvas vector sketching, with MacBook as the primary product target. Development now starts on web (decision 231), then macOS.
Natural freehand input and later editable strokes are complementary: vector geometry does not
require CAD-style construction. Responsiveness means predictable low-latency interaction under
real workloads, not an unmeasured millisecond guarantee. Correction initially means the selected
move/uniform-scale/delete/undo tools, not a new eraser, automatic beautification or full Concepts
parity. Prepare capability-based touch/pen inputs for future hardware without assuming its existence.
Exact open-source license remains for owner review; no publishing or copied competitor assets.

Launch languages: English (en) and Ukrainian (uk), with English source/fallback. Every implemented platform follows OS/per-app preferences at launch (browser preferences on web); no in-app language switch. This is selected scope, not implemented localization.
