# INPUT-02 — recover abandoned drawing contacts

Owner authorized state-based recovery, accepted-sample preservation, document diagnostics,
pen/mouse and saving recovery checks, and a separate preview on 2026-10-30.
Branch codex/pen-stall-diagnostics is stacked on UI-01 (e020ace); preserve existing previews.

## Contract and boundaries

The host retains pointer event ownership. Rust retains canonical samples, commit, history
and save revisions. No rendering, storage format, timeout or numerical changes.

An active drawing commits its accepted samples when a strictly newer primary tip-only
contact from the same mouse/pen source follows an earlier primary contact. A matching
zero-button move also completes drawing, retaining eligible coalesced tip-contact samples
(including tip plus barrel), without appending the hover position. A matching document-level
release completes drawing even when capture-loss notification was absent.

Foreign releases alone never complete another pointer's stroke. Unrelated down events do
not cancel a pending drawing. Matching pending pressed moves/capture transitions preserve
its accepted stroke through commit. Clear ownership before releasing capture to avoid
reentrant cancellation. Ordinary explicit cancellation, Escape, blur/hidden and pressed
capture-loss semantics are unchanged; this is not a promise to commit cancelled gestures.

## Diagnostics

The 256-entry metadata ring includes document lifecycle and button/target transitions,
primary/source/ID, rejection/recovery reasons, active ownership and save revisions. No
coordinates, pressure samples or artwork. Temporary toolbar export works without opening
an input-blocked modal; pointer activation snapshots before document recovery, keyboard
activation is separate. Existing previews and their storage are unchanged.

## Acceptance

- INPUT-02-A: no foreign release commit; matching outside release accepted once.
- INPUT-02-B: new/reused primary ID and hover recover exact accepted data without foreign endpoint.
- INPUT-02-C: valid coalesced contact samples retained; unrelated pending contact cannot erase data.
- INPUT-02-D: one Undo operation per recovered stroke, exact Redo and durable reload.
- INPUT-02-E: injected storage commit failure retains recovered data; retry and reload match exactly.
- INPUT-02-F: document transitions bounded and content-free; real mouse and diagnostic export work.

E2E: apps/web/tests/vector-contact-recovery.mjs (16 mouse/pen cases) and
apps/web/tests/vector-release-recovery.mjs (22 lifecycle cases plus trusted mouse/export).
Type checking, scoped lint/format, checked boundary generation and Rust/Wasm/web builds pass.
Independent source/interaction review required coalesced barrel preservation and foreign
pending-contact protection; both addressed and covered by browser cases.

Physical Wacom verification remains required. Automated pen events validate host ordering,
not a claim to reproduce the operating system's missing pointer release. If no further
state evidence arrives, there is intentionally no timer manufacturing a release.

## Primary-pen identity continuity

The owner supplied a second log showing pressed primary-pen moves under a replacement ID
without a new down event, then approved continuous identity recovery on 2026-10-30.
Only an active drawing owned by a primary pen may transition on a canvas-targeted pressed
primary-pen move newer than the last owner event. A pending terminal release excludes
transition. Retire old IDs for the stroke; never accept their late moves/releases as a
handover back. Set the new owner generation before releasing old capture. Do not start or
commit a Rust stroke at handover. Preserve the delivered coalesced sample batch.

Matching document moves/releases continue if replacement capture reports NotFoundError;
matching outside cancellation retains ordinary cancellation semantics. Foreign mouse/touch,
secondary pen, hover and stale moves cannot take ownership. Queued release events preceding
takeover cannot finish the replacement owner. The retired-ID set is bounded to 64 per stroke;
exhaustion refuses further identity adoption and is exposed as identityRecovery.limitReached
in exported diagnostics. It never evicts IDs or changes accepted document data.

E2E apps/web/tests/vector-pen-identity.mjs covers two consecutive transitions with and without
capture, exclusions, stale replacement release, late retired events, coalesced tip/barrel,
outside move/up/cancel, exact samples, single Undo/Redo, and durable reload. Both scenarios
pass without page errors. The16 existing recovery/save-failure cases and22 lifecycle cases
pass on frozen65363. Independent source/interaction review has no remaining blocking findings.
Physical Wacom testing remains outstanding; no rendering-quality or persistence-format change.
