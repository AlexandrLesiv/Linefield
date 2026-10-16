# Structured diagnostics plan

Status: required architecture direction; concrete event schema, sink libraries and numeric
budgets are reviewed in S02. No implementation exists. This expands CT-07 and INV-09.

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
