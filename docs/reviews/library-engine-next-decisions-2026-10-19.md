# Durable web library and real engine — next decisions v1

Status update2026-10-19: owner approved D1–D3 (decision236). This original agenda and browser attempt are retained as history; current results and mechanism decisions are in [the new handoff](durable-library-handoff-2026-10-19.md). Not implementation approval.
Prepared2026-10-19 against base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved uncommitted work.
Owner requested browser follow-up and concrete decisions needed to proceed. No app code changed.

## Browser follow-up

The two keyboard cases were attempted again. The configured Vite server failed to bind
127.0.0.1:65142 with EPERM before a test began. They remain UNRUN; see
[attempt record](../../quality/continuation-2026-10-19/browser-attempt.md). No elevation or Computer Use.
This environment blocker is independent of product decisions and is not a reason to change the UI.

## Already settled — no repeat approval requested

- Web first, macOS next, then iPhone/iPad; shared Rust editing semantics and Skia/CanvasKit.
- Existing responsive gallery and slim rail/settings design, themes and en/uk resources.
- SQLite managed library, autosave, original immutable samples, regional coordinates and anchored transforms.
- [S02 v2](S02-v2-approval-2026-10-16.md) and [regional schema v3](S02-v3-approval-2026-10-17.md)
  approvals, including their selected defaults; do not reinterpret old pending labels as unanswered choices.
- One authoritative writer/coordinator and the [selected browser communication direction](../architecture/platform-ipc-defaults.md).
  Actual SQLite VFS, flush/fencing and recovery implementation still need a concrete packet and evidence.
- Recoverable in-gallery removal with independent Undo, no countdown/reflow, and no finalization
  on failed/cancelled navigation or backgrounding (decision212). This postdates the approved schema.

## Owner choices to settle now

### D1 — staging the first implementation milestone

**Recommend: durable library first, real pen engine next.** First deliver create/list/open/rename/reopen
of durable blank documents through the existing web gallery. The temporary editor remains explicitly
non-drawing until the next milestone. Durable deletion joins this slice only after D2/D3 and the exact
staging amendment are reviewed. If its contract is not ready, disable production Delete honestly;
do not leave the disposable deletion simulation operating on real documents.

Alternative: combine durable library and pen in one milestone. This produces a usable drawing
workflow sooner as one release, but couples storage/ownership failures with input/render failures
and delays isolated durability acceptance. This is a sequencing choice, not a change of platform.

D1 does not itself authorize an unseen storage adapter or migration. After the exact implementation
packet is accepted, explicit implementation authorization can name this bounded slice and its tests.

### D2 — crash, reload and restart while removal is still recoverable

**Recommend: restore the Deleted NAME / Undo placeholders after restart.** Durably staged removals
remain reversible across crash, reload, forced close or worker termination until an accepted
in-app departure. This preserves removal intent and recovery; no countdown or general Trash screen.
Reconcile uncertain operations before enabling actions. Once an exact finalization set is durably
accepted at successful departure, recovery resumes cleanup rather than reopening Undo.

Alternative: automatically restore unfinalized items to the ordinary gallery with original identity,
name and content. This also preserves bytes, but silently cancels the user's previous removal intent.
The designer and database specialist recommend preserving placeholders instead.

Gallery removal placeholders are distinct from session-only document edit Undo; no persisted stroke-edit history is proposed.

The implementation must distinguish recoverable staging from accepted finalization durably. Neither
choice permits deleting busy drawings or bypassing export cancellation consent.

### D3 — browser close/refresh versus successful in-app departure

**Recommend: only accepted in-app departure finalizes pending removals.** Opening or creating another drawing
through the gallery can commit this boundary only after destination readiness and durable acceptance
of the exact finalization set. If that cannot be recorded safely, remain in the gallery with Retry /
Stay; failures/cancellation before acceptance keep Undo. Physical file cleanup may retry after acceptance.

Proposed acceptance boundary: the durable logical departure/finalization commit, after destination
readiness, rather than animation or visible editor completion. If the commit succeeds but its reply
is lost or the tab crashes before the editor appears, reconcile the durable result; committed
finalization does not regain Undo. An uncertain outcome must not be reported as a definite failed
departure with Undo retained. Explicitly test lost replies and crashes between commit and visible
route completion. This clarification is part of D3 for owner review, not an adopted mechanism. Tab close, reload, backgrounding and abrupt browser
termination do not count as successful departure; D2 determines their recovery. Browser unload is
not a dependable opportunity to finish asynchronous storage work.

Alternative: treat an explicit application-owned close action as a finalization boundary too, after
its transaction succeeds. There is currently no such browser control; adding one needs its own design.
Native orderly quit handling belongs in the later native packet. Do not silently treat all process
exits as consent or introduce a custom close control merely to avoid this decision.

## Engineering deliverables before the next implementation approval

These are our work, not requests for the owner to choose internal constants or guess feasibility.

| Packet | Concrete deliverable / recommended starting direction | Acceptance before claiming readiness |
| --- | --- | --- |
| Browser durable storage | Pin an actual SQLite/Wasm backend/VFS under the already selected worker/coordination direction; document catalog/document ownership, lock lifetime, flush acknowledgement, quota/error/eviction limits and supported environments | Disposable create/reload, interrupted transaction, quota/denied storage, competing-tab and lost-owner tests; no in-memory fallback labeled durable; unavailable browser evidence remains a blocker |
| Decision212 schema/lifecycle amendment | Versioned schema source delta, table dictionary, staging→Undo/finalization/recovery sequence and hosted review snapshot consistent with D2/D3 | Owner review of exact amendment; storage fault/restart, stale intents, cross-file reconciliation, other-client visibility, busy-owner/export and restore/finalization failure cases |
| Library failure-state design | Existing visual system applied to loading, creation/rename failure, storage unavailable, in-use and removal recovery states, en/uk and focus behavior | Designer packet with identified states and native exclusions; no gallery redesign |
| Regional typed boundary | Separate canvas-local inputs from stored/query regional positions; Rust owns mapping generation and captured gesture base | Identified signatures/layouts/lifetimes, bounded copies, failure semantics, declaration compile plan and native/Wasm vectors; old affected global-f64 ABI cannot be reused unchanged |
| Numerical normalization | Evaluate nearest-canonical rounding before input acceptance, including tie rules and upper-domain endpoint behavior; exact-domain check before rounding | Compare exact-rejection/directed alternatives, idempotence/equivalent representations, original accepted-byte preservation and an explicit input-error budget. Recommendation is an experiment, not adopted policy |
| Real pen slice | Authoritative actual samples, atomic validation/cancellation, one-operation Undo, completed-state save boundary, renderer-independent geometry and CanvasKit adapter | Reviewed complete transform/painted-bounds/clipping/hit evidence at selected zoom/scale, real input/focus tests, measured admissible span; no arbitrary span offered as a preference |

The [forward diagnostic](../../quality/regional-arithmetic/README.md) and
[inverse diagnostic](../../quality/inverse-mapping/README.md) expose real numerical traps but do
not approve a production algorithm, input rounding policy or stroke span. Root tests and resource
checks are not browser storage, native IPC, actual drawing or performance acceptance.

## Review and stopping boundary

After D1–D3, prepare one identified library implementation packet with the storage evidence,
schema source amendment, failure-state designs and exact tests. Request approval of those concrete artifacts,
not blanket permission to invent their contracts. Prepare the regional ABI/numerical packet in
parallel as documentation/evidence, then authorize the real pen slice separately. Preserve exports,
future sync, other hosts and optional workbench scope for their own milestones.

No migration, dependency installation, hosted publication or real library/engine implementation
was performed in this preparation. Specialist and independent review disposition will be recorded
in quality/continuation-2026-10-19/review.json; owner answers remain pending.
