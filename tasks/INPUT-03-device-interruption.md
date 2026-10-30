# INPUT-03 — separate-device interruption diagnostics and recovery

Owner authorized investigation on2026-10-30 after a pen stroke stopped when mouse input
appeared. Keep one device owning the stroke. No mouse-to-pen sample adoption, invented
samples, timer-based release, renderer or storage-format changes. Preserve65379 and all
existing previews; provide a new frozen integrated preview. Do not merge.

Branch codex/input03-device-interruption is stacked on INPUT02 commit0f13b74. Rust retains
canonical samples/history/save authority; the host owns event admission and diagnostics.
Use the accepted SAVE08 integrated app only as a preview overlay, not an additional source
owner. Preserve unrelated work and never modify the donor application.

## Evidence and investigation

The supplied capture records pen contact2, pressed foreign mouse1, its rejected release,
then zero-button capture loss for pen2 and a pending528-sample stroke. A subsequent primary
pen3 contact commits those528 samples and begins a second251-sample stroke. Both committed
revisions are durable at export. This proves accepted data survived; it does not establish
whether absent pen movement originated in hardware/driver/browser or whether later owner
moves were rejected. Mouse contact alone must never steal or finish the pen stroke.

Record bounded content-free delivery/admission summaries alongside lifecycle transitions:
owner/source identity, delivered/coalesced counts, acceptance/rejection outcomes, last event
ages, capture/focus/visibility and document/save revisions. Do not log coordinates, pressure,
artwork, persistent device identifiers or per-sample payloads. Logging must stay cheap on the
input path and expose truncation instead of silently misrepresenting history.

## Acceptance

E2E actual browser dispatch: simultaneous foreign mouse activity cannot append, cancel,
commit or steal a pen stroke. Continued owner pen samples retain exact order and values.
Replay the observed interruption/recovery sequence, capture failure, coalesced input,
new-contact recovery, exact Undo/Redo and save failure/retry/reload. Distinguish synthetic
ordering tests from physical Wacom evidence; no driver/browser root-cause claim without it.
Check missing-delivery versus rejected-delivery diagnostics and bounded/redacted exports.
Run scoped static/build checks and independent source/interaction review. Preserve explicit
Escape cancellation; do not silently broaden unrelated editing gestures.

## Recovery amendment

Involuntary interruption of drawing (matching pointercancel, pressed capture loss, blur or
hidden/session suspension) commits only already-accepted samples once. Explicit Escape and
non-drawing gesture cancellation retain rollback. Clear ownership before releasing capture.
Hidden recovery must precede the exit-save flush; no resumed animation frame is required.

Zero-button capture loss alone remains ambiguous. If the same owner ID/type/primary later
sends a strictly newer pressed move without a delivered up/cancel, resume that stroke and
process its normal coalesced batch. Do not use elapsed-time heuristics. Foreign, retired and
stale events cannot resume it; advance the release-generation cutoff to reject queued old
terminal events. A real terminal event already finalized the stroke and cannot be resumed.
This amends INPUT02's earlier pending-pressed-move finalization policy to preserve continuity
when the same device resumes contact delivery.

## Verified findings

The unchanged65379 baseline accepts continued pen samples despite foreign mouse activity.
It does not reproduce driver-level delivery loss using synthetic events. It does expose
accepted-sample rollback on involuntary cancellation and pending continuation truncation;
the targeted recovery changes address those application paths without device takeover.

Final65381 focused E2E covers seven interruption sequences with exact sample arrays,
commit count, Undo/Redo and durable reload. Hidden saving reaches Saved with document hidden,
animation frames disabled and no manual flush. Save-failure/retry preserves exact data.
Diagnostics distinguish delivery/acceptance, retain prior-gesture summaries, and pass a
300-event overflow check with a256-entry ring, drop count and no coordinate/pressure data.
Source review and scoped types/lint/format plus integrated production build pass.

The preview includes the current SAVE08 gallery/saving in an isolated frozen build.
Physical Wacom reproduction is still needed to locate the absent event delivery. Export
from Developer → Export input diagnostics if it recurs; no hardware-root-cause claim is made.

Regression checks: all16 contact-recovery cases, both pen-identity cases and keyboard
checks (including explicit Escape active-stroke rollback) pass on65381. The22 release
lifecycle cases pass on65380 with the same recovery logic;65381 adds episode diagnostic
snapshots only. Keyboard fixture variants both use the candidate, not a performance baseline.
No remaining automated acceptance failures; physical device verification remains outstanding.
