# SAVE-03 — incremental save capture, receipts and reload checkpoint

Status: isolated checkpoint complete; independent review passed with findings resolved; awaiting owner review. Owner authorized this isolated checkpoint on2026-10-29 after SAVE-02.
Base: frozen SAVE-02 commit9718226406ea9ff0af0c14e2705c824d59a42918, PR23 still open.
Branch: codex/save03-incremental-recovery-checkpoint. No production saving or preview changes.

## Scope

Replace full metadata rescanning for subsequent saves with Rust-owned completed-edit tracking.
Measure both edit bookkeeping and capture: moving an O(document) scan into every edit does not
resolve the SAVE-02 stall. Preserve active-gesture exclusion and exact regional/raw data.
Bind immutable pending batches to checked revisions, operation identity and storage receipts;
committing revision N must not mark N+1 saved. Test transactional persistence and validated
reload into a fresh engine, rejecting incomplete or malformed input without replacing live work.
Transferred disposable buffers remain baseline. No renderer, native or production save UI changes.

Rust owns completed semantic state, delta content/revisions, acknowledgement validation and
restore validation. Host owns transfers, worker lifetime, SQLite transactions and receipt lookup.
Storage never becomes a second editing engine. Keep the pinned read-only admission guard and
its documented limits; this checkpoint cannot silently adopt a production backend.

## Checks and review

SAVE-INCREMENTAL-01: capture/edit costs on metadata-heavy documents and large sample sources.
SAVE-INCREMENTAL-02: draw/move/Slice cancellation, undo/redo, layer edits and pending N+1.
SAVE-RECEIPT-01: exact replay, conflicting body, stale base/incarnation/grant, lost reply.
SAVE-RELOAD-01: exact raw/metadata roundtrip, malformed/truncated data, atomic rejection.
SAVE-RECOVERY-01: precommit worker loss, postcommit lost reply, restart/reconciliation.
Map to CT-03/04/05/08 and INV-01/06/07; isolated checks are not SU-09–13/18 UI/native passes.

One Rust implementation writer owns engine and Rust/browser capture/reload probes; lead owns
storage probe and documentation. Independent reviewer checks authority, failure and evidence.
Use E2E-only browser boundary tests plus static/build checks. Evidence lives in ignored cache.
All experimental APIs stay default-off. No stable format adoption or production migration.

## Security and remaining gates

Bound lengths/counts, validate canonical coordinates and finite styles/transforms, version and
revision identities before applying data. Failures preserve previous state and pending sources.
SQLite uses bound values for payloads; trusted fixture SQL is not an application API. Receipts
must match operation body, incarnation and revision, not just a reused operation ID. Worker
termination alone never manufactures a DurableReceipt. Missing receipts remain unresolved
unless transaction outcome is proven. Document any untested quotas, power loss, hostile same-
origin writers, native lifetimes, storage content recovery and visual parity without claiming pass.

Return measured performance/recovery results and review findings before enabling production.

## Implemented checkpoint policy

The journal freezes affected completed records at command completion and includes Undo/Redo.
It preserves ordered operation revisions rather than coalescing away their identities. New
sources are sent once; metadata edits reference retained source identities. An immutable batch
can remain in flight while later completed edits accumulate separately. Full initial replay and
first-document capture remain bounded cold work, not steady-state incremental latency claims.

Checkpoint overflow is sticky and fail-closed for saving: accepted editing survives, but prepare
and acknowledgement reject thereafter. This is explicitly not the production admission/recovery
policy; no Saved result can conceal a missed edit. Production must provide a recoverable bounded
journal strategy without discarding accepted input. A full log is not silently cleared on failure.

Rust validates pending token/base/result acknowledgements. The trusted browser checkpoint adapter
validates document/incarnation/current grant, operation, exact revisions and SHA-256 body receipt
before calling Rust acknowledgement. This split is not final Rust ownership of the complete
shared saving contract. Reconciliation reports current authorized grant, not original commit grant.

The executor stores bounded opaque batch streams transactionally rather than adopting final
record-oriented DDL. It is limited to128 batches/128 grants/48MiB payload. Its inherited1MiB
read-only file-admission guard limits reopen experiments to small databases. The host temporarily
aggregates transferred chunks into one framed batch; production streaming blob writes and their
copy/memory costs remain a separate gate. No user files or production database are opened.

Independent review found and fixed uncommitted receipt visibility during a fault pause, writer
identity reuse, and an incomplete geometry byte comparison. Staged restore now rejects
intervening edits/gestures and mismatched persisted/embedded revisions; late malformed batches
preserve live document/history/revisions. All source findings were re-reviewed after fixes.

## Final checkpoint evidence

Source-matched reports: .build-cache/save03-rust-final/report.json and exports.json;
.build-cache/save03-integrated-final/report.json; .build-cache/save03-storage-regression/report.json;
.build-cache/save03-batch-regression/report.json. Hardware: Apple M2Pro/16GiB, Darwin27,
installed Chrome156.0.8078.48 headless. No live preview participated.

31 Rust/browser assertions passed. Actual Rust→transfer→SQLite→worker reopen→fresh Rust
roundtrips passed20 assertions in each of three modes: normal, postcommit lost reply, precommit
worker death with identical-body retry. Each mode persisted seven batches through revision16,
including reload→edit→save→reload.25 receipt/recovery assertions and seven persisted-load
validation checks passed. The previous19 capture and10 storage-guard checks also passed.
These counts include shared/repeated invariants.

| Workload | Result |
| --- | --- |
| One changed stroke after1k/10k/100k strokes |165-byte metadata-only delta, one stream, no raw sources resent; five changes per size |
| Single changes in a100k-stroke document | Maximum completion hook0.1ms; prepare and acknowledgement below0.1ms timer resolution; encode/copy maximum0.2ms |
|100k initial unsaved backlog | Prepare353.8ms; acknowledgement162.2ms; fixture creation4762.3ms |
|100k fixture memory |1,111,621,632 bytes Wasm linear memory including document, allocator and checkpoint; not RSS or save-only overhead |
| Seven small normal SQLite batches |173–4,225 framed bytes; submit-through-receipt3.93–11.195ms, median5.47ms; framing<=0.01ms and hash<=0.03ms |
| First-batch injected recovery |56.765ms postcommit reconciliation;62.265ms precommit restart/retry, including worker restart |

Cold timings are single observations per size in the final run, not cold medians. Earlier exploratory
100k prepare varied59.7–353.8ms; do not claim initial-capture speedup. Steady timings measure
individual phases, with coarse timer resolution; zero means below resolution. They do not measure
physical input, application frame stalls, power-loss durability or bulk database throughput.

Reload preserves exact sampled coordinates/pressure, captured stroke metadata, layer ordering,
visibility, names, transforms and Slice fragments in the fixtures. Full derived geometry bytes
match, with a tail-corruption sensitivity check. This is not shader/pixel parity, paper/grid
persistence, native lifecycle or full application Save UI acceptance.

Static Rust builds/formatting, scoped JS/TS lint/format/types, source-length and diff checks pass.
Default-off build retains118 exports and the baseline fingerprint. The experimental feature has
139 exports (including the five SAVE-02 exports); it is not adopted as a stable product ABI.

## Recommendation and remaining gate

Keep incremental deltas and transferred buffers as the implementation direction, but do not
enable production saving. Bound initial preparation and acknowledged-batch retirement: the new
steady-state path does not solve the initial/backlog stalls. Complete recoverable overflow/admission,
streaming storage, full Rust receipt authority, paper/grid capture, production file validation and
larger reopen limits, quota/power-loss/writer retirement evidence, and real application/pixel
roundtrips before production adoption. Current previews remain unchanged; no merge is authorized.
