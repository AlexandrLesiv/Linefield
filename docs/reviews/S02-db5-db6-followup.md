Current direction: decisions 163–165 select multi-client incremental local editing and platform communication adapters, plus simple future cloud conflict warnings/conditional replacement. See ../architecture/incremental-collaboration.md and ../../tasks/S02M.md. Earlier exclusive-client alternatives/rename-only contracts below are historical or incomplete; exact mechanisms remain pending.

# DB5/DB6 follow-up: conditional saves and platform communication

Status: discussion and recommendations, not selected DB5/DB6 policy. Owner approved DB7-A and DB8-A separately. No schema/ABI/runtime changes in this follow-up.

## Conditional saves (optimistic concurrency)

The proposed ETag-like check is feasible. Prefer a logical persisted version token over hashing the raw SQLite file. A save carries the exact durable base version it was derived from; it must not compare its new edited state to the old persisted state. Pending batches chain from successful durable acknowledgements. A later main-thread edit cannot be marked saved by an earlier acknowledgement.

Within one short write transaction: acquire write admission (for example BEGIN IMMEDIATE), read/conditionally match the expected durable version, apply only the validated changes, advance the version and commit. On mismatch roll back without altering persisted data, preserve accepted unsaved work and stop blind automatic retries. SQLite busy/IO/capacity failures are different outcomes from a version conflict. Never hold the transaction while displaying a dialog. SQLite serializes writes, but comparison outside the write transaction permits a check-then-write race.

Existing content_revision / metadata_revision already provide domain-specific preconditions. A whole-document replacement must cover all overwritten domains; narrow metadata updates need the appropriate scope and coordinated owner semantics. Concrete aggregate-token representation and database replacement/restore fencing require review. A document UUID plus revision counters alone can repeat after restoring an older copy (ABA); do not silently add a new generation column or claim existing counters detect all replacements.

Every compliant relevant write must update its version in the same transaction. An external SQLite writer that bypasses that contract is not covered. A whole-file hash is expensive, WAL can hold committed changes absent from the main file, and checkpoint/layout changes alter bytes independently of logical drawing content. A canonical logical hash is possible but adds traversal/canonicalization/incremental-maintenance work; it does not replace atomic comparison or ownership.

## What a version check does not provide

Optimistic concurrency can prevent overwriting a changed committed base, but allows two divergent live edits until one saves and the other conflicts. It does not coordinate active input, Undo histories, accepted-but-not-yet-durable edits, delete/upgrade/import publication or multi-file authority. Replacing lifetime ownership with independent optimistic writers would change the selected one-owner product policy.

Recommendation (pending DB5): keep one document owner and add/retain transactional base-version checks as defense in depth. Use logical revisions rather than whole-file hashing. Rust owns conditions/outcomes; platform adapters supply ownership primitives.

## Conflict handling and possible override

Recommendation only: preserve local work, pause conflicting autosave and offer reviewed recovery choices such as keeping a separate drawing or reloading after explicit consent. Do not show recurring modal errors on every autosave tick. These new conflict UI/actions require product scope and design review approval.

Force overwrite is possible but unselected. It must obtain exclusive mutation authority, preserve a coherent recovery copy of the displaced version, and replace only the exact version the user confirmed. Recheck atomically after confirmation; further changes require renewed resolution. Preserve the proper schema/identity, increment a fresh version and invalidate stale work; never raw-copy over an active SQLite database. Both views containing unique unsaved work cannot be preserved merely by backing up the last disk commit. Independent autosaving writers could repeatedly overwrite one another, so confirmation alone is insufficient.

Future cloud conditional writes can use a server-issued opaque revision/ETag with the same expected-base semantics. A local SQLite token is not itself a cloud-sync protocol or authorization mechanism; no network implementation is approved.

## NSXPC and other hosts

NSXPCConnection is Apple's high-level native interprocess communication API. A native adapter exposes a narrow typed operation (such as rename with expected metadata revision), checks peer identity/authorization, and enqueues intent to the owning Rust dispatcher. It does not replace Swift-to-Rust typed FFI. Connection failure can mean unknown outcome; retain request receipts. Endpoint discovery, signing, sandbox and supported deployment versions remain unproven pre-code gates.

Use the same Rust command/conflict/outcome contract with platform scheduling/communication adapters, only where separate processes actually exist:

| Host | Candidate approach; not platform implementation approval |
| --- | --- |
| macOS | Same process: direct dispatch. Separate process: authenticated NSXPC candidate, conditional on feasibility probe. |
| iOS/iPadOS | UIKit scenes normally share the app process, so dispatch within that process to the document owner. Future extensions need a separate lifecycle/storage/communication design; do not assume a desktop daemon or arbitrary always-running peer. |
| Android/ChromeOS Android host | Direct owner dispatch in one process. Deliberate separate services/processes may use Binder/AIDL with caller and lifecycle validation. |
| Windows | Direct dispatch in one process; local named pipes/RPC or a suitable platform app-service mechanism are candidates for separate processes. Review access control, bounded framing and package/sandbox compatibility; a custom byte protocol is not implicitly approved. |

Portable does not require identical OS transport. No extra processes are needed solely to use a common interface. Mobile background suspension and extension permissions remain feasibility constraints. Other hosts need their own explicit adapter review when scoped.

## Required future negative tests

Two connections begin from the same base: at most one conflicting commit succeeds; mismatch changes nothing. Busy differs from conflict. Include queued save ordering, rename/content races, restore/replacement token reuse, stale callbacks, crash before/after commit, lost response, further changes during confirmation and preservation of unsaved work. Verify peer authentication/limits and platform lifecycle independently of shared Rust command tests. None executed: documentation only.

## Primary references checked 2026-10-16

- SQLite transactions: https://www.sqlite.org/lang_transaction.html
- SQLite isolation and WAL: https://www.sqlite.org/isolation.html
- Apple NSXPCConnection: https://developer.apple.com/documentation/foundation/nsxpcconnection
- Apple XPC service design: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html
- UIKit scenes: https://developer.apple.com/documentation/uikit/scenes
- App extension shared data/lifecycle: https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html
- Android AIDL: https://developer.android.com/develop/background-work/services/aidl
- Windows named pipes: https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes
