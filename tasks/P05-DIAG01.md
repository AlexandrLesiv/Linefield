# P05-DIAG01 — Bounded developer diagnostics and local export

Status: active under decision243. The R8 diagnostics checkpoint integrates frozen M03
00cb641f702f40cc4682d4bd116ca07b3529101c and passes174 production,54 observation and86 fixture
browser cases on its exact combined build, each once with no retries, skips or flaky results. Resource generation,
static/build and scoped source review pass. Current hooks report copied source coverage,
validated Prefix publication separately from readiness, cache retention and typed cleanup
outcomes. Corrected localization IDs retain the existing semantic-ID validation rule.
Branch codex/p05-diag01-developer-diagnostics; one implementation writer owns the cohesive leaf.
The normal dependency merge of reviewed M03 commit00cb641 had no conflicts; its runtime is
fbaede9fc86bb7f7cd44bedaa4c76d6d76e16e65. Fresh R8 browser evidence covers this exact dependency
delta. Source and all71 generated artifacts stayed unchanged through the three browser lanes.
The lead may freeze an exact independently reviewed and functionally verified M03 dependency
with clearly recorded open performance findings so DIAG01/M04 can address them. This is not
M03 completion, a passing performance profile or relaxed acceptance. Final M09 adoption still
requires the unresolved absolute/relative gates.
The panel, pinned metrics and bounded local capture/export are implemented. Same-host overhead,
current combined-build designer/fresh review and final acceptance remain open. Generated reports
stay ignored. Preserve the existing older preview65185 and all drawing previews unchanged.

The bounded older-base overhead comparison completed six modes without timed hard-stop errors,
LongTasks or drops. Closed-panel warm Redo rendering reached10.9ms versus6.5/8.0ms baseline
brackets, exceeding the existing relative investigation rule while remaining below16ms absolute.
Cold pan missed250ms in every mode, including both baselines. DIAG-05 remains open. The current
implementation removes redundant Wasm scalar reads and inactive opt-in submission bookkeeping;
functional checks do not establish their timing effect. Recheck the final combined build against
the same reviewed M03 control and unchanged thresholds before adopting the diagnostics overhead.
Position: integrate after P05-M03, before M04 integration. One branch/PR stacked on the verified
frozen M03 source; owner alone merges. The lead settles remaining decisions within the renewed
autonomous window, ending on return or 2026-10-23 07:13:55 UTC.

## Outcome and boundary

Implement [WEB-DIAG-D1.1](../docs/design/developer-diagnostics.md) and docs/logging.md: correlated bounded command/stroke/history/render/worker
summaries; opt-in detailed 30-second capture; settings panel, optional noninteractive metrics
overlay and explicit JSON download. Preserve drawing latency, input, focus, navigation, themes
and English/Ukrainian. No artwork or raw input/content in logs, network telemetry, durable
diagnostic storage, native UI, external logging service or generic developer-tool framework.

## Ownership and dependencies

Rust owns authoritative command outcomes, source/revision validity and checked diagnostic
metadata. Host adapters attach input origin and ephemeral correlation, instrument worker and
render boundaries, retain bounded metadata and present/export it. No duplicate editing policy.
One implementation writer owns runtime, generated boundary, UI/locales and feature E2E; the
lead owns contract/task/security prose. Designer reviews panel/overlay behavior, rendering
specialist checks capture overhead, and fresh reviewer audits source, privacy and evidence.
Implementation must coordinate the frozen M03 fields before changing shared paths.

Initial parallel scope owns new apps/web/src/developer-diagnostics modules and additive
English/Ukrainian catalogue entries and their additive typed catalogue declarations only. It defines a narrow typed host adapter for supplied
safe metadata and availability; it cannot query/mutate the editor independently. Existing
memory/input/render/Rust sources, drawing-shell integration and shared tests remain with M03
until the lead explicitly transfers those hooks on a frozen checkpoint. Static validation may
run independently; browser/GPU runs are serialized. This partial work is not a usable preview
or accepted diagnostics implementation by itself.

The coordinated integration reservation extends DIAG01 ownership to drawing-shell.ts,
memory/document.ts, view.ts, diagnostics.ts, bridge.ts, edit-bridge.ts, input-state.ts,
input.ts, input-batch.ts, input-keyboard.ts, editor-controls.ts, command-timing.ts and
the small gpu-display.ts observation adapter; its actual-app diagnostics E2E and bounded fixture hook; and Vite build-identity
integration. M03 cold work owns frame commands/building, readiness, scheduling observations and
its tests. The gpu-display adapter is now frozen and that module returned to M03 capacity
ownership. The second serialized handoff reserves preparation-executor.ts and prepared-cache.ts
for DIAG01's additive named job start/finish/reject/stale-adoption observations, without changing
their APIs, worker protocol, source ownership or cache policy. M03 coordinates any later edit.
DIAG01 does not edit live/progressive-scene, GPU allocation, resource accounting or the new
current-coverage query until another explicit handoff. Reconcile these hooks on the final
M03 base before adoption. No extra Wasm reads, worker protocol, mutable editor or universal bus.

Use narrow named copied-metadata callbacks for command outcomes, existing accepted state,
submission/publication and cached resource samples. Availability comes from normal state and
host lifecycle updates; terminal inspection is host-only. Existing replies supply lossless
canonical decimal u64 correlations. Unknown metadata is discarded; invalid allowed values are
rejected. The pending sample metric is Unavailable without compatible authoritative watermarks.
No detail tracing is inferred from queue/page counts. Browser/GPU verification is serialized
with M03; isolated output directories preserve its frozen previews and comparison builds.
Worker detail uses existing immutable ticket metadata and the main host clock; never retain
sample arrays or raw error objects. Per-job/page events are capture-only, with bounded baseline
summaries/failures. Editing commands already correlate session/interaction/request/content;
source IDs appear only when a normal authoritative read supplies them, never from stroke counts
or an extra query. Missing source/sample watermarks remain explicitly unavailable.

## Concrete edge cases and evidence ownership

The sole DIAG01 writer owns these actual-app browser E2E cases and their production-hook
exclusion checks; the independent reviewer audits negative controls and the designer reviews
panel/overlay/focus variants. The rendering specialist reviews serialized capture-off/on timing.
No phase-A static check substitutes for these integrated outcomes.

| Scenario / priority | Initial state and event order | Required outcome |
| --- | --- | --- |
| DIAG-01 / high | Begin/Append/End → pending preparation → Undo/rebranch → late result | Stable ephemeral correlation distinguishes accepted, cancelled, stale and published work; no false current-frame event or retained editor object. |
| DIAG-02 / high | Active input callback reaches capture count/byte limit or rejects malformed metadata | Store freezes synchronously, but notification/layout/export waits for a host task; artwork/input remains unaffected and drops are visible. |
| DIAG-02/06 / high | Narrow canvas/free-space area; pin metrics; draw/pan beneath overlay; change text scale | Overlay fits the supplied free region or hides with a panel explanation; no hit interception, chrome overlap, canvas remap or focus theft. |
| DIAG-03 / high | Idle Download starts yielded preparation → a gesture begins and ends, or departure/hidden→Resume without a gesture → preparation completes | Changed interaction epoch or lifecycle generation prevents delayed download; retain the report and require a fresh explicit idle action. Clear/replacement invalidates old callbacks. |
| DIAG-02/03 / high | Capturing → tab hidden or accepted departure; also attempt rejected navigation | Accepted lifecycle departure freezes a truthful partial report; rejected navigation does not invent departure or corrupt capture; Resume never starts capture or steals focus. |
| DIAG-05 / high | Idle canvas → rebuild without input → completed publication → hidden/idle | Activity-fed rates distinguish submissions from validated output; stale/unavailable values are labeled; no idle animation loop or Wasm access after terminal failure. |
| DIAG-02/03 / high | Active capture → terminal editor failure → idle diagnostics inspection/export | Freeze partial with safe reason; retain host-only report and enable explicit export/clear, but no new capture, editor getter or implied drawing readiness. |
| DIAG-04 / high | Content/path/error canaries, extra fields, invalid numerics and oversized metadata reach the diagnostic adapter | Only fixed allowlisted values survive; rejected metadata cannot enter rings/export or fail an edit. No network or persistent identifier appears. |
| DIAG-03/05 / high | Exact duration/count/byte boundary, event overload, serialization/Blob/URL/download failure | Bounded partial/drop/failure state, one retained report, bounded export lifetime and safe explicit retry; no retry loop, source loss or allocation claim exceeding measured evidence. |
| DIAG-06 / medium | English/Ukrainian compact and enlarged text, field/IME Escape/Undo, panel Close/Back | Native field priority and identity-based focus remain; all app-owned messages are localized; automatic completion never opens or focuses UI. |

Threat delta: [bounded developer diagnostics](../docs/security/web-gpu-editor.md#bounded-developer-diagnostics).

Baseline maximum: 1024 events and 1 MiB logical payload. Detailed capture ends at the first of
30 seconds, 4096 events or 2 MiB, including its baseline prelude. One retained capture per tab;
account actual allocations/export buffers separately. Measure and refine within these bounds
under delegated authority; never weaken drawing correctness or performance targets.

## Acceptance

CT-02/03/04/06/07/08/09; INV-01/04/05/08/09/11; SU-03/04/13/14/15/16/20; SEC-03/09/13.

| ID | Required observable result |
| --- | --- |
| DIAG-01 | Actual input, command acceptance, stroke completion, Undo/Redo and visible publication correlate through ephemeral IDs; rejected/stale/cancelled work is distinguishable. |
| DIAG-02 | Drawing cannot be interrupted or intercepted by panel/overlay. Idle opening, capture focus return, automatic stop, field/IME handling and Back/Resume remain correct. |
| DIAG-03 | Count, byte and duration limits stop capture predictably; overload and sink/export failures expose dropped/partial state without failing edits. |
| DIAG-04 | Content-redaction canaries do not appear in metadata or exported JSON. Capture contains exact build/schema/clock identity and no persistent identifiers. |
| DIAG-05 | Actual workload with diagnostics off/on stays within current input/render thresholds; fixed-rate metrics do not create an idle render loop or unbounded memory. Software timing is labeled honestly. |
| DIAG-06 | English/Ukrainian, compact width, 200% text, themes, keyboard/focus and reduced motion preserve layout and drawing area. Download is explicit and reports request/failure honestly. |

Use E2E-only behavioral tests with exact build/evidence identity, strict generated types,
lint/format/source-size and build checks. No developer-tool/unit suite. Private recordings,
captures and generated reports stay ignored. Open an isolated actual-app preview after source,
designer and independent review. This task's UI is not current merely because its plan is approved.
