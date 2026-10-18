# S02 decision batch 6 — conflict granularity and reconnect behavior

Status: DB20-A, DB21-A and DB22-A selected on 2026-10-16 (178–180). DB17-B is recorded as 177. Alternatives below are retained as history. Concrete schema/interfaces and identified design implementation remain unapproved.

## DB20 — Initial conflict-check granularity for existing strokes

A (recommended initial scope): use a whole-stroke mutation precondition, not the whole-document revision. If another client changed the same stroke since the command's expected state, reject the stale command even when properties differ. Independent strokes still proceed. The concrete token must detect intervening mutations, not only current value equality; storage/session representation needs review.
B: use property-level preconditions and explicit read dependencies. An independent color change and movement may both succeed; operations such as delete/scale/Undo still validate all relevant assumptions. More precise concurrency, more contract/tests.
Both implement DB14-A (no reservations), not offline semantic auto-merge. Document-level dependencies/paint order and atomic command groups still require validation.

## DB21 — Undo/Redo after coordinator failure and successful reconnection

A (recommended initial scope): reconcile pending operation outcomes, preserve unresolved work separately, then begin a fresh editing session with empty Undo/Redo. Surviving client pending work must not be discarded as part of clearing history. Clear feedback about the history reset; no obsolete history sent to a new coordinator.
B: preserve a surviving client's in-memory history and revalidate it with the new coordinator. Only proven safe entries can remain actionable; invalid/unknown entries require defined handling. No persistent history across full app restart. Requires authenticated history/operation linkage and reviewed inverse/redo/reconnect semantics, not blind trust in client-supplied inverses.
This decides whether coordinator recovery ends the editing session; it does not change decision 10's rule that an actually closed/reopened session has empty history, or DB13's client-scoped Undo.

## DB22 — Other queued commands after one command conflicts

A (recommended): pause/reject dependent commands while allowing demonstrably independent commands from that client to proceed under their own preconditions. Preserve all pending work/outcomes; if independence cannot be proved, conservatively pause the affected dependency chain. Atomic groups stay all-or-none. Retain client sequence for dependent/ordered commands and shared paint-order invariants; this is not arbitrary queue reordering.
B: pause that client's entire editing submission stream until the conflict is resolved. Other clients continue. Simpler control flow but unrelated edits by the affected client are interrupted.
Neither means automatic reconciliation of conflicting work. Existing bounded queues, no silent dropped edits and identified design conflict design remain required.

Next step after outstanding answers: consolidate a concrete contract packet, including numeric budgets, receipt/incarnation schema amendments, current-vs-superseded decisions, transitions and planned negative/conformance/native E2E evidence. Do not proliferate new policy questions where a concrete engineering proposal will suffice.
