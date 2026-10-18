# Browser library storage v1 — concrete review proposal

Prepared 2026-10-19 against base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved work.
**PROPOSED; production adoption BLOCKED by the completed experiment.** See
[measured results](../../quality/browser-storage-v1/README.md) and
[implementation scope](../reviews/durable-library-implementation-scope-v1.md).
Decision237 authorizes the experiment/isolation requirement and browser-local risk posture;
it does not approve production adoption. Decision236 approves sequencing and removal policy,
not this dependency, isolation requirement, bridge, limits or durability claim. Lead owns this
integration; Rust/database specialists own semantic/schema contracts. CT-03/04/05/07/08,
INV-01/06/07/09, SU-09–13/21; extends [browser defaults](platform-ipc-defaults.md).

## Concrete recommendation and deliberate exception

Original candidate: upstream SQLite Wasm **3.54.1**, `opfs` VFS, rollback journal `DELETE`, `synchronous=FULL`,
`foreign_keys=ON`, one connection per file per worker. Verify returned pragma values before
admitting writes. Do not activate WAL or mix VFS implementations on the same file.
Proposed artifact: `sqlite-wasm-3540100.zip`; upstream advertised SHA3-256
`87e24f6a4588692310b7942dc2fa7c7275bb9ba2e01d553e4115aa4a904a0050`.
The synthetic probe downloaded and byte-verified this artifact and exercised Chrome/WebKit.
It is not a production dependency. The proxy retirement gap remains unresolved; the same-worker
SAH-pool alternative demonstrably truncates a synthetic payload after damaged pool metadata.
Neither candidate is cleared for production. The sections below retain the proposed contract,
not a claim that worker/flush safety or all admission checks passed.

Upstream documents that `opfs` needs SharedArrayBuffer and isolation headers; `opfs-wl` additionally
needs Atomics.waitAsync. SAH-pool holds exclusive handles and has initialization cleanup hazards.
WAL requires exclusive locking and removes concurrency benefits here. These facts favor ordinary
`opfs` for this proposal's multiple tabs, rather than adopting the fastest pool variant.
[SQLite persistence documentation](https://www.sqlite.org/wasm/doc/trunk/persistence.md),
[release artifact listing](https://www.sqlite.org/download.html), consulted2026-10-19.

**Owner-review exception:** permit SharedArrayBuffer solely inside the upstream storage VFS/proxy,
and require `Cross-Origin-Opener-Policy: same-origin` plus `Cross-Origin-Embedder-Policy: require-corp`.
This amends the default no-SAB browser plan; it does not authorize a shared-memory editor protocol.
Serve app, workers, Wasm and fonts from the dedicated trusted app origin; no third-party scripts.
Deployment/header and CSP compatibility must pass before adoption. No system security changes.
Alternative: retain no-SAB direction and investigate separately partitioned SAH pools with explicit
open/close ownership. That adds pool lifecycle/recovery work; it is not silently selected fallback.

## Execution and data ownership

Each tab has one dedicated coordinator/storage worker containing the Rust library/session owner,
an upstream SQLite Wasm instance and a thin JS storage adapter. Upstream `opfs` may create its
own proxy worker; it does not own Linefield semantics. UI remains asynchronous and cannot submit
SQL. Rust decides commands, validation, transitions and persistence ordering. JS binds approved
SQL statements, invokes SQLite and returns typed rows/errors; it cannot decide deletion/Undo.
This **two-Wasm-instance adapter boundary is proposed**; no promise of direct C pointers between
Rust and SQLite memories. Copies use bounded typed records; pointer ownership never crosses.
Proposed bridge contract: synchronous, non-reentrant calls on this worker only. Rust owns the
versioned SQL statement catalogue; generated JS bindings consume it without handwritten alternate
SQL. `begin(txId)`, `query(txId, statementId, parameters, rowLimit, byteLimit)`,
`execute(txId, statementId, parameters)`, `commit(txId)` and `rollback(txId)` return typed results.
Parameters/rows use null, signed-i64 BigInt, finite f64, validated UTF-8 text and copied byte arrays;
never convert i64 through Number. UUIDs remain exact16-byte arrays. Rust validates queried
preconditions inside the same transaction before execute/commit. No await/event callback/reentry
is permitted while a transaction handle is active. Reject foreign/stale txId and excess results
atomically; query buffers belong to the caller until explicit release, charged to the copy budget.
Classify SQLite Busy, Full, Corrupt, NotADB, access and generic I/O separately; thrown/worker-lost
commit is Unknown. Final generated signatures, statement IDs, byte encodings and fault proof remain
a pre-code gate; this proposal does not claim that bridge implementation has been demonstrated.

Retain separate catalog and per-drawing databases; jobs database remains reserved for its approved
future slice. Library identity and relative managed locators are origin-private and generated by
services, never route/user-supplied paths. Import/export and jobs are outside the first slice.
One opening worker owns mutable state for its drawing. Other tabs may attach clients to that
coordinator under decisions163/168, or coordinate different drawings independently. Attachment
uses the selected typed request channel and shared command dispatcher; clients never open a
second writable database connection or mutate their own document replica.
No permanent service, SharedWorker dependency or second mutable editor is introduced.

## Locks, admission and recovery

Proposed origin-scoped Web Locks names are versioned trusted constants plus validated opaque IDs:
`linefield:v1:catalog`, `linefield:v1:drawing:<id>`, `linefield:v1:removal-scope:<id>`.
These are coordination, not authentication; any same-origin script is inside the trust boundary.
Hold a drawing's exclusive lock until its connection closes and editor grants retire. Never use
`steal`, timeout-based takeover, tab visibility or BroadcastChannel presence as ownership proof.
Another tab requests attachment to the verified existing coordinator; competing writer admission
rejects. An unavailable/unverified coordinator produces InUse rather than forced takeover or a
duplicate editor. Coordinator loss retires attached grants; reattachment follows durable recovery.

Catalog operations acquire the short exclusive catalog lock, including reads, then perform one
bounded transaction. For target operations acquire the target lock before catalog admission.
Departure obtains staged-target locks with non-waiting `ifAvailable` in sorted ID order before
catalog lock. If any is unavailable, release only newly acquired locks and reject preparation;
never wait or release another coordinator's long-lived ownership to satisfy ordering. Destination
readiness is a dispatcher reservation on its existing owner, not another target-lock acquisition;
destination is forbidden from the removal set. No coordinator waits for reciprocal target grants.
Never await UI, another target lock or external I/O while holding catalog SQL.
Release short locks in reverse order. A live drawing owner handles its own targeted operations
through its dispatcher; a requesting gallery cannot acquire a competing writer grant.

Removal scopes additionally hold their scope lock for the live gallery visit. Reclaim uses a fresh
exclusive lock grant, then increments durable claim generation under catalog admission. Browser
lock release following worker death is only a candidate proof of prior holder retirement; no timer
can replace it. Adoption additionally requires proving that the upstream proxy cannot finish old
writes after ownership is released. Until STORE-W9 proves that, takeover writes remain blocked.
Old generation/session replies reject. Scope-lock acquisition precedes target
locks; all code follows scope → sorted targets → catalog. No catalog holder waits for scope.
If this ordering cannot integrate existing ownership, block implementation and amend the proposal.
BroadcastChannel carries only advisory invalidation and typed requests; reread catalog under lock.
Frozen tabs may retain locks indefinitely: report InUse/unavailable; do not break authority.

## Persistence receipts and failures

Rust supplies an operation identity, expected incarnation/revision and a validated immutable batch.
The adapter returns committed only after successful SQLite COMMIT; shared services then publish
the exact durable revision. A failed/absent reply is Unknown until queried by operation identity.
Retrying an unknown mutation blindly is forbidden. Transaction errors must rollback or close the
failed connection before another operation. Preserve accepted in-memory work on persistence failure.
No memory-only fallback may say Saved. No unload handler promises final writes.

SQLite's requested synchronization and browser flush are not a proof against OS/power failure,
browser eviction or user-cleared site data. First admission checks secure context, worker support,
OPFS synchronous handles, Web Locks, isolation and actual create/write/close/reopen in a disposable
probe namespace. Never probe by modifying user databases. Ask the browser for persistent storage
through its normal API; refusal remains a visible storage-risk condition, not permission to erase.
The proposed product posture is to allow browser-backed local work with explicit eviction limits;
owner must approve that posture and associated design before durable production use.
If catalog is absent but managed drawing files remain, stop normal admission and follow decision82's
automatic validated reconstruction under exclusive maintenance authority. Never manufacture an
empty replacement or infer deletion consent; unresolved files remain preserved. The probe may
stop safely without pretending to implement reconstruction.

Quota estimates are advisory. Map exhausted space, unavailable access, corrupt data, busy ownership
and unknown commit to distinct stable typed errors; do not retry generic I/O as though it were Busy.
Only a proven not-started Busy admission may retry automatically, at most three times within one
second. Unknown operations reconcile. These proposed limits require browser measurement.
No app-level encryption, network sync, credentials or external filesystem picker is added.

## Proposed initial bounds and first implementation slice

Start with one catalog connection and up to four hosted drawing connections per worker/tab,
proposed as the browser profile corresponding to the existing native hosting count. A tab opening
Y retains X while attached clients still depend on X; navigation never silently drops its owner.
At capacity reject new hosting, not existing clients. Orderly shutdown must reconcile/persist and
retire grants before closing connections; unexpected death follows fenced recovery. A maximum of32 queued
storage requests and8MiB of copied payloads per tab, with separately reserved recovery/control
capacity of4 requests/64KiB. Reject admission before consuming the reserve; never drop accepted
requests. These provisional limits supplement, not replace, approved native budgets. The probe
must establish memory accounting across both Wasm instances and the upstream proxy.
No original-stroke span or real pen payload is admitted by these empty-library limits.

First slice after contracts and implementation approval: create/list/open/rename/reopen a durable
empty drawing; preserve shared names/order and bounded gallery pages. Create writes and closes a
validated drawing before publishing its catalog entry; an idempotent lifecycle intent reconciles
death between files. Rename follows the approved document-authority model and distinct catalog
projection outcome described below. Do not emulate cross-database atomicity. Exact SQL/intents and
failure fixtures are required in the implementation task. Document metadata commit is authoritative
for rename: if catalog repair fails, return the durable rename with `catalog_projection_pending`,
not a fictitious failed rename or blind retry. Delete stays disabled until its amendment
and review states pass. No disposable prototype action may alter actual library files.

## Required evidence before adoption (all UNRUN)

| ID | Required experiment / acceptance |
| --- | --- |
| STORE-W1 | Pinned bytes/build identity, license/audit; headers/CSP; Chrome, Firefox, WebKit capability and close/reopen |
| STORE-W2 | Two tabs, different drawings; simultaneous catalog operations; same-drawing client attachment with one writer; competing writer rejected; no stale writer after worker death |
| STORE-W3 | Kill worker before/during/after COMMIT and lost reply; exact operation recovery, never duplicate New/rename |
| STORE-W4 | Quota/I/O/flush failure, corrupt/missing catalog, reload/close; preserve source and truthful status |
| STORE-W5 | Ordered scope/target/catalog contention, orphan claims, frozen tab, stale generation and no forced takeover |
| STORE-W6 | Bounded queue/copy memory and reserved recovery capacity; no input-thread blocking or silent loss |
| STORE-W7 | en/uk failure/recovery/focus states, browser Back/Forward and accepted-departure gap; designer-reviewed captures |
| STORE-W8 | Actual browser restart in isolated test profile, persistent-storage refusal and documented eviction limitations |
| STORE-W9 | Worker/proxy death or delayed COMMIT versus successor lock grant; prove no old write after takeover, or reject the VFS/topology candidate |
| STORE-W10 | Tab A opens Y while hosting X for B; bounded retention, orderly close, projection-pending rename and validated catalog reconstruction |

Rust/build reliability own protocol/storage probes; web implementers own real browser drivers;
database specialist reviews migration/introspection; independent reviewer audits failure/security
claims. No current UI browser test establishes these cases. The authorized disposable feasibility
fixture is complete; its scoped results and blockers are linked at the top. The exact library/SQL
and bootstrap proposals now exist; generated adapter/runtime conformance remains future work.
Follow the current scope packet for the next preservation experiment and adoption gate.
Engine work remains gated by regional numerical admission.
