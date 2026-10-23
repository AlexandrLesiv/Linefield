# Structured diagnostics plan

Status: P05-DIAG01 implements bounded web capture/export and a developer panel on its isolated
review branch, integrated with the latest frozen M03 runtime and source/publication hooks.
Current-build browser and scoped design/evidence checks pass; detailed-capture overhead acceptance remains.
Native sinks and their concrete schemas remain subject to S02. This expands CT-07 and INV-09.

## Web coverage and developer diagnostics

The web host correlates allowlisted command/gesture, preparation and publication summaries in
a bounded ring. Explicit capture adds bounded worker/render events and local export. Current
hooks include copied source coverage, validated Prefix publication separately from readiness,
cache retention and typed cleanup outcomes. Aggregate resource counters represent accounted
allocations or estimates, not measured process memory or physical GPU residency. The separate
2048-event compile-time performance-test ring remains absent from ordinary production; it is
not the user-facing capture. Unavailable authoritative sample watermarks stay explicitly
unavailable. Older M03-only previews keep their existing instrumentation unchanged.

The owner approved WEB-DIAG-D1 on 2026-10-22 under decision243, with remaining concrete
technical/design decisions delegated to the lead. P05-DIAG01 implements this direction after
the M03 runtime contract freezes. WEB-DIAG-D1.1 specifies the implemented panel/capture states;
task P05-DIAG01 records current evidence and remaining integration gates:

- Keep a small always-on ring of lifecycle summaries: input gesture begin/end/cancel, central
  command result, stroke/history revision, preparation operation, frame publication/rejection,
  context loss/recovery and resource failure. Use ephemeral correlation IDs and allowlisted
  error categories. No production per-sample or per-frame trace.
- Add Developer diagnostics to drawing settings. A nonmodal panel opens only when no canvas
  interaction is active; it does not cancel an interaction, move the canvas or queue itself.
  Provide Capture30seconds, Stop, Download JSON, Clear and Close. Starting capture returns
  focus to the canvas; completion never steals focus. Retain normal field/IME shortcuts.
- Offer an optional noninteractive metrics overlay, refreshed at most twice per second,
  without layout changes or a continuous render loop while idle. Show render submissions and
  validated complete updates per second separately; label browser frame intervals as scheduling
  data, not delivered FPS or physical pen-to-screen latency. Show aggregate input callback p95/max,
  source/render progress, worker queue/jobs, cache bytes/hits/misses, upload bytes and failures.
  Distinguish accounted CPU/GPU/Wasm memory, unavailable measurements and stale snapshots.
- Use a baseline cap of1024 events and1MiB logical payload, and detailed capture ending at
  the first of30seconds,4096 events or2MiB including its baseline prelude. Keep one report per
  tab, freeze on Stop/limit/departure/hidden tab, and report partial capture, drops and sink
  failures. Account actual buffers and export allocation separately. Verify the adopted caps
  and measured overhead before adoption; these are not storage or editor limits.
- Include exact build identifiers, schema version, monotonic clock domain and correlated
  temporary operation IDs. Exclude artwork, raw coordinates/pressure samples, document names,
  paths, raw URLs/errors, credentials and persistent user/device IDs. No telemetry or automatic
  upload. Explicitly review any proposed reproduction settings before adding them to the
  allowlist. A diagnostic mode must not become a content dump.
- Drain/serialize off input callbacks; download only by explicit idle user action. Capture or
  export failure cannot fail an edit. Keep a frozen report available for retry, and label the
  browser action Download requested rather than claiming a file was saved.

Rust owns authoritative command outcomes and source/revision validity; hosts own input origin,
render/cache/worker events and presentation. Correlation must pass through the checked boundary
without creating another editor owner. Detailed capture may affect timing and must disclose that
fact. Establish separate checks with capture off/on; diagnostic traces are not release benchmarks.

The web report represents shared u64 identities as canonical decimal strings: at most20 ASCII
digits, no leading zero except `0`, and no value above18446744073709551615. Convert directly
from bigint, never through Number or a growing alias map. Counts and durations remain checked
bounded numbers. Copy allowed fields once, discard unknown fields without retaining their
objects, and reject invalid allowed values. Capture/export acceptance includes boundary and
privacy canaries. An accepted-not-submitted sample metric remains Unavailable until compatible
authoritative sample watermarks exist; page counts and a completion boolean cannot supply it.

Preparation diagnostics associate each ticket with the executor's actual assigned request
before dispatch/waiting for the first page. Capture-only `worker.admitted` records that join;
`worker.started` requires successful dispatch. Pre-admission rejection has no fabricated request.
Concurrent zero-page failure, timeout and cancellation must remain distinguishable. Use a
per-job observation value, never an ambient asynchronous context or a guessed next counter.
Frame identity describes the immutable preparation source. Current state captured at admission
uses explicit admission-revision/scene/mapping fields; it cannot stand in for the frozen source's
revision. Unavailable source provenance stays unavailable. These observations do not change
worker messages, admission, editing authority or result relevance.

Required acceptance before adoption: real drawing and history correlated through publication;
stale/rejected/cancelled worker work distinguishable; controlled overload and export failure;
content-redaction canaries; no interruption or pointer interception while drawing; bounded
memory and callback overhead; English/Ukrainian, compact layout, keyboard/focus and theme checks.
The delegated lead will record the identified panel/overlay design and specialist review. These diagnostics do not
block fixing the independently reproduced active-tail publication defect.

## What to record

Record native action intent and its origin (menu, shortcut, toolbar, pointer, future agent),
central command acceptance/rejection, meaningful state transitions, and background operation
start/completion/failure/cancellation. Correlate a native intent with its Rust command and
file/render work without logging entire application state. Tool changes, stroke completion,
undo/redo, save/recovery and surface failures need useful outcomes.

Proposed common envelope: schema version, event name/version, severity, timestamp,
monotonic duration where applicable, build, component, ephemeral session ID, request ID,
operation ID, origin, outcome and allowlisted error category. Domain payloads may contain
revision before/after and bounded counters. Avoid persistent device/user identifiers.
A monotonic duration must be measured within a compatible clock domain; don't subtract
unrelated native/browser/worker clocks without a defined conversion.

Illustrative event, not an approved final wire/schema:

```json
{
  "schemaVersion": 1,
  "event": "editor.command.completed",
  "command": "Undo",
  "origin": "keyboard",
  "requestId": "request-42",
  "sessionId": "session-7",
  "revisionBefore": 12,
  "revisionAfter": 13,
  "outcome": "applied",
  "durationMs": 0.4
}
```

No per-sample production log and no full state dumps. Stroke begin/end summaries may expose
bounded counts/timing, not paths or points. Frame traces and detailed timing are opt-in,
bounded diagnostic tools, not unlimited always-on logging. Never promise every event survives
a crash or overload; expose dropped-event counts and retention policy.

## Privacy and execution

Allowlist fields. Exclude drawing text/content, coordinates, document names/paths, credentials,
serialized documents and raw error strings that may embed them. Convert errors to reviewed
categories; a debug mode is not a blanket permission to collect private content.

Buffer events with explicit count/byte limits; drain sinks off input callbacks. Rotate local
logs and cap age/size. Sink failure or queue saturation cannot fail an otherwise successful
edit or block input; count failures/drops through bounded diagnostics. Define rate limiting
for repeated faults and severity/retention rules. No network telemetry or upload by default.

Native host logs and Rust logs use the same correlation contract, not necessarily one logging
library. Browser/Wasm has a host-appropriate bounded sink; browser console output alone is
not a reliable persistent incident record. Local persistence/export policy needs host review.

Build/test tools emit structured job progress/results with compatible correlation conventions
but separate payloads from app events. Redact process output before ordinary reports; any raw
failure artifacts require explicit retention/access policy and must not leak into public CI.
No keys, shell environment dumps or secret-bearing command lines in job summaries.

## Responsibilities and acceptance

Implementers instrument their action/failure boundaries; rust_engine owns central command
outcomes; native implementers preserve origin/correlation; build_reliability owns sink/schema
infrastructure; rendering_performance checks overhead; reviewer audits privacy and failures.

Tests cover schema validation, rejection accuracy, request/worker correlation, redaction,
saturation/drop counts, rotation/retention, sink failure, shutdown/late completion and bounded
callback overhead. Demonstrate diagnosing a failed save/recovery from correlated safe events.
No logging framework installation is authorized by this document.

Internationalization: stable event/command/error IDs and typed values stay locale-independent. Do not use translated UI sentences as diagnostic identifiers or log localized field contents/filenames. Test-run locale metadata is explicit local evidence, not user telemetry. See internationalization.md.

Navigation logs record intent origin, route kind, guard/load outcome and ephemeral correlation.
Do not record raw URLs, document route IDs, titles, paths or grants. Motion may produce bounded
start/cancel/finish diagnostics when useful, never per-frame production events. Sink failure
must not prevent navigation or alter the document outcome.

## Selected local format (decision 65)

Use rotating local UTF-8 JSON Lines files for native preview diagnostics: one bounded versioned
JSON event object per line with newline termination. Application logs remain separate from SQLite
documents/catalogs. A later TypeScript reader can consume this output; no viewer/service is
implemented or approved here. Native/Rust correlation and all existing privacy rules still apply.

S02 reviews exact schema, library/version, app-private location/access, process ownership, queue/
record caps, rotation and age/total-size retention. Handle interrupted trailing records explicitly;
logging is best-effort and sink/serialization failure must never block edits or recurse endlessly.
No extra sink, compression or upload is implied. Future browser/platform adapters must review
storage availability and guarantees separately. Test framing/schema, redaction, rotation, partial
writes and overload/failure isolation. [JSON Lines format](https://jsonlines.org/).

## Selected retention budget (decision 66)

Retain app diagnostics up to seven days and 20 MiB total (20,971,520 logical file bytes), counting
active and rotated logs. Both caps apply; remove oldest logs first. Drawings, recovery copies and
build/test evidence have separate lifecycles and are excluded from this cleanup. Retention is a
maximum, not a promise of a full seven-day history. No automatic uploads.

S02 defines rotation granularity, temporary/active accounting, event/queue caps, safe store-scoped
cleanup and clock/permission/failure behavior. Apply cleanup while running and on next launch;
no service is authorized to delete while closed. If cleanup fails, bound/drop further diagnostics
rather than exceeding storage budgets or blocking edits. Test exact boundaries and non-log
preservation; logical byte accounting does not claim identical filesystem allocation size.
