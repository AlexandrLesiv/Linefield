# P05-DIAG01 — Bounded developer diagnostics and local export

Status: authorized by decision243. Independent storage/presentation work may start against a
frozen committed M03 checkpoint; final runtime hooks and acceptance wait for the coordinated
M03 integration handoff. No overlapping memory/renderer/engine implementation ownership.
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
English/Ukrainian catalogue entries only. It defines a narrow typed host adapter for supplied
safe metadata and availability; it cannot query/mutate the editor independently. Existing
memory/input/render/Rust sources, drawing-shell integration and shared tests remain with M03
until the lead explicitly transfers those hooks on a frozen checkpoint. Static validation may
run independently; browser/GPU runs are serialized. This partial work is not a usable preview
or accepted diagnostics implementation by itself.

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
