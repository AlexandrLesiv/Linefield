# Autosave policy direction

Owner selected autosave to the document on 2026-10-16 (review decision 5/R06). This supersedes
explicit Save as the required way to persist ordinary edits and the original-copy/recovery-copy
split as a mandatory default. Implementation, schema and concrete scheduling remain unapproved.

## Selected behavior and responsibilities

Completed edits are persisted automatically to the document in the background. Rust retains
single-owner in-memory editor state and validates commands. Storage writes ordered revisions
using SQLite transactions on its worker; native UI displays shared persistence status.
An edit being committed to undo history is distinct from its database transaction completing.
No disk wait in input callbacks, no predictions saved, and no transaction per raw pen sample.
Brief bounded batching is selected (decision 11); exact coalescing, queue bounds and maximum
pending age require S02 review. Continuous editing cannot defer the flush indefinitely; do not
claim every just-finished stroke is durable immediately. SQLite owns atomicity/journal recovery.

Track current revision separately from last durably persisted revision. Writing revision N
cannot mark N+1 saved. Proposed presentation states are Saved, Saving and Could not save;
wording, indicators and retry interactions require UX/UI and identified Figma approval.
Failures preserve current in-memory content and expose pending persistence; never silently
claim success, discard pending edits or keep accepting unlimited queued work.

For New/Open/close/quit, resolve pending/failed writes before releasing the source session.
Use bounded asynchronous completion and reviewed retry/cancel or alternate-destination handling.
The exact controls are pending design, not a blanket permission for indefinite blocking.
A clean autosaved document needs no routine Save/Discard prompt. Cancel navigation keeps the
session; it cannot undo already persisted edits. If a later design offers abandoning unpersisted
changes, consent must name the affected revision and explain its limited effect. It is not
reversion to the document's state when opened.

Undo/redo remains shared editor behavior: an Undo is a new document change and must itself
be autosaved. SQLite transaction rollback is not user Undo after a transaction has committed.
Session-only Undo/Redo is owner-selected (decision 10). Revert-to-open, persistent history, versions
and backup retention are separate choices; autosave does not imply those features.

## App-managed drawings and library

On 2026-10-16 the owner selected app-managed drafts (decision 6). New starts a blank drawing
without requiring a name or destination first. Its completed edits autosave to a SQLite document
in app-managed storage; the user can choose a name/location later. Exact creation timing and
storage-failure handling remain concrete S02/S06 contract work. A draft is durable user content,
not a disposable render cache. Do not silently delete it on close or when opening another file.

Decision 7 now approves an app-managed gallery/library, with S02L before the canvas. Unnamed
drawings are retained library documents, not temporary content requiring eventual publication.
The gallery is the normal entry point in the single window. Rename changes display metadata,
not whether content is saved. Permanent deletion after explicit confirmation is selected (decision 8).
No Recently Deleted or system Trash workflow. Empty-item cleanup, exceptional restoration
and external-file exchange still need review; do not invent automatic deletion or eviction.
Test restart/reopen of persisted draft content, creation/write failure, cancelled destination
selection and failed publication without losing the draft, alongside revision-safe autosave.

## Recovery and copying

Normal crash reopen uses SQLite's transaction recovery for persisted content. Edits not yet
persisted can be lost; select and measure the pending-write loss window rather than promising
zero loss. Additional recovery stores are not mandatory by default; any retained pending-content
protection must have a justified, reviewed role and must not duplicate SQLite's journal.

Opening an explicit salvage/recovery candidate, if provided, preserves the source and creates
an unsaved copy under the existing recovery invariant. This differs from normal reopen of the
autosaved document and must be labeled separately in tests. No automatic corrupt-file repair.
Save As/copy uses a consistent SQLite snapshot and reviewed destination/association rules;
raw copying an active database is not the policy. Cmd-S/manual flush semantics remain open.

## Next decisions

- Concrete permanent-deletion failure/interruption policy, empty-item retention, restart exceptions
  and native-file exchange. Confirmed deletion must coordinate with queued/in-flight autosaves.
- External native import-as-copy is selected (decision 9); export details and native file actions
  remain to review. The former draft-to-file Save As assumption is not mandatory.
- Exact bounded-batching timing/flush/coalescing/overload contract (direction selected in decision 11),
  journal/durability settings, connection ownership and provider access.
- Crash/pending-write guarantees, failure exit choices, retention for drafts/recovery and future
  source-conflict handling. No network/sync/versions implementation is authorized here.

## Acceptance and ownership

CT-05/INV-06: ordered revision-aware persistence, failure preserves pending state. INV-07:
failed Open retains current drawing; explicit recovery candidates preserve originals. SU-09–12
and FILE/ROUTE cases must cover automatic persistence, undo/redo persistence, continued editing
while a write completes, close during pending work, disk/lock failure and independent reopen.
Test abrupt termination separately from orderly close; state which revision was durable and
which pending edits were lost. Native status/focus/exit flows need actual E2E after Figma approval.

ui_ux_designer owns lifecycle wording, flows and status presentation; Rust owns revision/command policy;
services delegate database mechanisms to SQLite; host engineers own dialogs/access. Follow
[format review](successor/formats.md). No runtime tests or app behavior exist yet.

Library lifecycle takes precedence over earlier references to choosing a permanent location for
a draft. Library documents already have durable app-managed storage. Exported copies are proposed
as independent snapshots; naming is not a persistence transition. S02L establishes minimal library
persistence before S04/S06 add actual stroke autosave and complete file-exchange/recovery evidence.

External native file import creates an independent library document with a new identity (decision 9).
Source files are unchanged by import and subsequent edits/deletion. Import is separate from future
synchronization; local-save status must not imply remote upload. No cloud subsystem is approved.

Decision 10: clear history only after successfully ending the editing session, including return
to the gallery. Pending/failed autosave or cancelled navigation must not prematurely discard
history. Saving does not reset Undo/Redo; reopening preserves saved content with empty history.
Native dialogs, temporary focus loss and backgrounding alone do not end a live editor session.

Decision 11 requires a flush before accepted editor exit and a maximum pending age during editing.
Completed operations may share a persistence transaction without changing their separate Undo
boundaries. Define age relative to the oldest unpersisted work under the reviewed coalescing
policy; resetting a debounce timer on every edit must not starve autosave. Disk/lock failures can
exceed the target: report pending/overdue/failure honestly and retain state, never claim durability
from a timer. Exact targets and storage settings await S02 review and later measurements.

## Selected local save-failure behavior (decision 15)

Continue accepting edits temporarily after local save failure within reviewed unsaved-work and
memory limits. Keep a persistent visible failure/pending indication; retry with bounded work and
backoff. Once limits would be exceeded, pause new document mutations safely, retaining accepted
content. Inspection and repair/retry controls remain usable; route changes that release the
editor still require successful persistence or explicit revision-specific loss acknowledgement.

S02 defines capacity accounting, gesture headroom, safe rejection/cancellation, timer behavior,
resume conditions and error classification. Do not solve overload by dropping accepted edits,
truncating committed geometry, hiding failed writes or resetting pending age on every input.
Resuming editing follows reviewed capacity/durability status, not a stale worker success.
Unsaved in-memory work is not crash-safe. Future cloud failures have separate sync status and
do not turn a successfully saved local drawing into a local-save failure.

Decision 19: launch after normal exit or a crash opens the gallery, not the last editor.
SQLite recovery restores only recoverable durable content; report problems without claiming
unsaved memory survived. Keep unaffected drawings accessible. Selecting a drawing starts an
empty Undo/Redo session. This does not select an automatic salvage/deletion policy for corruption.

## Selected meaning of Saved

Decision 27 requires successful commit with reviewed durable disk synchronization before the
matching revision is acknowledged Saved. Queueing/submission or weaker synchronization is not
success. Keep newer edits pending when an older revision completes; synchronization failures
retain honest pending/failure state. All disk work stays on the bounded storage worker, off
input callbacks. Exact SQLite/VFS settings remain S02 review items; hardware failure and false
flush reporting are outside a blanket durability guarantee. Fault evidence must distinguish
process crashes from power loss.

Decision 28 selects WAL for local macOS catalog and drawing databases. Keep durable commit
acknowledgement distinct from checkpoint completion: synchronized committed WAL content can be
saved before transfer to the main file. Review bounded checkpoint/growth/reader lifetimes and
sidecar recovery off the input path. Exports/migration copies must be consistent standalone
snapshots. No live database/sidecar copying to cloud storage is authorized.

## Selected exit after save failure (decision 49)

Offer Retry, Stay (default), and explicitly confirmed Leave Without Unsaved Changes when exit
would abandon pending edits. Preserve committed content and the library item; this is not
revert-to-open or delete. Stay/cancel retains history and pending content. S02 defines revision-
bound consent, queued/in-flight write resolution, stale-result rejection and accepted session
release. A concurrent commit cannot be cancelled retroactively. Do not release the old session
on failed replacement or falsely acknowledge saving/abandonment while the outcome is unresolved.
Native wording, focus/default controls and Figma require review; test all exit paths and races.

## Selected manual save behavior (decision 56)

Command-S and Save dispatch a shared Rust command to bypass batching delay and request persistence
of completed edits. No name/destination dialog, library relocation or separate saving mechanism.
A recoverable failure can be retried; repeated requests coalesce into bounded ordered worker work.
Unchanged already-saved content need not be written again. Keep disk work asynchronous and Saved
revision-aware. Never force-commit/cancel an active stroke/transform or native text composition;
only completed shared state is eligible. Saving does not change Undo history. S02 defines exact
revision/coalescing/availability rules and tests; native shortcut/focus acceptance remains required.

## Selected batching deadline (decision 64)

Request persistence no later than one second of deliberate batching from the oldest completed
unsaved edit; later edits cannot restart the timer. Use monotonic time. Earlier dispatch and
manual Save/exit bypass are allowed. The cap does not guarantee worker start/durable completion
within one second: backlog, scheduling and storage failures remain visible pending/overdue/failure
conditions. Preserve pending-age accounting across coalescing/in-flight results and bounded retries.
No timer-based Saved status, extra unbounded jobs or unfinished-gesture commit. S02 specifies the
scheduler details and tests; actual completion/responsiveness still require measurements.

## Batch 1 approvals (decisions 86 and 89)

Use incremental affected-row transactions for ordinary autosave, with revision/dependency tracking,
atomic rollback and parity against complete reference state. Retry transient failures automatically
with increasing delays and bounded work, plus explicit Retry. Show failure/pending until durable
success; never bypass memory limits, deletion fencing or newer-session checks. Review error
classification, backoff/caps and interaction with explicit Save/Retry in S02. Permanent faults
are not handled by endless retries. No code or tested performance is implied.
