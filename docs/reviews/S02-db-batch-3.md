# S02 decision batch 3 — pending work and multi-client behavior

Status: owner selected A for DB11, DB12, DB13 and DB14 on 2026-10-16, recorded as decisions 169–172. Alternatives below are retained for review history, not current selections. DB9-A (167) and DB10-A (168) are recorded. Preserve prior bounded editing during storage failure, one-second maximum deliberate save batching and decision 166. Questions concern additional guarantees/coordination, not whether data preservation is desirable. No implementation authorized.

## DB11 — Pending work before durable acknowledgement

A (recommended initial scope): each submitting client retains bounded completed operations in memory until durable acknowledgement. A surviving client can help reconcile coordinator loss, but no blind replay: operation identity/outcome/preconditions must be checked. If both client/coordinator die or power is lost before commit, unsaved work may be lost. Saved means durable, never merely accepted.
B: additionally persist client recovery records asynchronously before declaring the change recoverable. This can recover recorded pending work after all app processes restart, but requires reviewed local storage/schema, duplicate reconciliation, security, retention and crash tests. Work before record durability is still vulnerable. No synchronous disk waits on input callbacks or new database implicitly selected.

## DB12 — Orderly coordinator-process quit

A (recommended): stop new admission, finish or explicitly resolve pending persistence, disconnect clients and release ownership; surviving clients reconnect through safe takeover and durable reload. Brief editing interruption, no live in-memory state transfer. Failed saves must follow reviewed preservation/quit consent, not silent discard.
B: design coordinated live transfer of coordinator state and ownership to a surviving process before quit, including pending work, interaction/Undo state and lost acknowledgements. May reduce interruption but substantially expands lifecycle protocol and failure tests; never permits two owners.
Neither policy prevents forced termination; crash recovery is separate. Closing a window is distinct from explicit process quit.

## DB13 — Undo with multiple clients

A (recommended): each client undoes its own accepted operations. Check current object state and dependencies; if another client's edits make reversal unsafe, reject/explain and preserve work. Do not restore an obsolete whole-document snapshot.
B: shared document-wide Undo order; any client's Undo reverses the most recent undoable operation regardless of author, with clear presentation and reviewed interaction semantics.
Neither selects persistent Undo history across restarts, AI permissions or an automatic conflict merge policy.

## DB14 — Overlapping edits to the same existing object

A (recommended initial scope): validate relevant object/property preconditions at command acceptance. First valid incompatible change succeeds; later stale incompatible change is rejected and pending work retained for explicit resolution. Different objects need not conflict. No wall-clock winner or automatic geometric composition.
B: reserve an object during an editing interaction (for example moving/scaling); other clients receive busy feedback for incompatible operations. Requires reviewed acquisition/release, disconnection, fairness and cancellation. Reservations are not database write transactions and must not be held across dialogs/long-running agents.
Both still validate commands centrally; reservations cannot replace stale-result checks. Conflict/busy/Undo UI requires identified design approval.

Next continue storage recovery-copy retention, concrete budgets/configuration and cross-database recovery contracts. No runtime tests executed.
