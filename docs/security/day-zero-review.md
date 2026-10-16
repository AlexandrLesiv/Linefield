# Linefield day-zero security review — proposal v1

Date: 2026-10-16. Scope: architecture/documentation assessment of the uncommitted Linefield scaffold;
repository has no HEAD commit. No application implementation, penetration test, entitlement probe,
dependency audit or runtime pass exists. Review snapshot hashes will be retained separately.
Owner approved this review, not every proposed mitigation mechanism. Concrete S02/DBML/ABI/trust
choices still require review before code. Current decisions include no app encryption (146),
sandbox from first macOS preview (145), fixed local library/future cloud boundary (144), typed Rust
commands and generated FFI, one editor owner per drawing, multiple processes and durable exports.

## Outcome and limits

Highest priority: hostile SQLite imports, authenticated cross-process mutation, destination authority
at resumed export, bounded computation/allocation, and safe lifecycle races. Local/offline does not
mean trusted: a downloaded drawing and another local process cross trust boundaries. Proposed
mitigations below are requirements for the corresponding implementation slice, not installed controls.

No encryption means anyone who obtains readable private files can inspect them. Sandbox limits the
app's authority; it is not a vault against every same-user process, administrator, compromised app,
OS or unlocked device. Deletion is not secure erasure. OS/disk/backup encryption is not assumed.
Availability and integrity matter equally: never trade accepted drawing data for a false success.

## Assets, actors and boundaries

Assets: artwork and sample/style data; names/catalog/thumbnails; recovery copies; immutable export
sources and destination access references; saved revisions/ownership/consent; logs and test evidence;
source/dependency integrity; future signing keys and cloud credentials. Exported files leave app
storage under explicit user intent; internal copies remain private even when marked temporary.

Actors: user; hostile external document producer; untrusted local process; faulty/stale peer instance;
compromised dependency/build input; future hostile page/origin/provider. Root/kernel compromise and
protecting plaintext during execution of a compromised authorized app are beyond this preview's
protection claim. Still minimize consequences and avoid treating process-local pointers as security.

~~~mermaid
flowchart LR
    File[Untrusted external drawing] --> Import[Bounded host access and import staging]
    Import --> Validate[Restricted SQLite reader and semantic validation]
    Validate --> Rust[Shared Rust command and ownership checks]
    UI[Native controls and input] --> Rust
    Peer[Other process: untrusted until verified] --> Gate[Reviewed peer authorization and owner generation]
    Gate --> Rust
    Rust --> Store[Private catalog and drawing databases]
    Rust --> Jobs[Private durable jobs and immutable snapshots]
    Jobs --> Publish[Revalidate destination access and consent]
    Publish --> Output[User-selected external output]
    Rust --> Logs[Allowlisted bounded diagnostics]
    Cloud[Future cloud adapter: deferred] -. reviewed replication boundary .-> Rust
~~~

The diagram is a trust/data-flow map, not a new process/thread topology. Typed FFI is an in-process
language boundary, not a sandbox against arbitrary memory access. Advisory catalog notifications
trigger rereads; they cannot carry authority to mutate. A file path identifies a location, not consent.

## Prioritized risk register

H = address before enabling the affected preview feature; M = address before preview acceptance.
Future = mandatory design gate before that future capability. Severity is qualitative consequence/
exposure prioritization, not a measured CVSS score. All rows are OPEN proposals without runtime proof.

| ID / priority | Concrete failure or attack | Proposed mitigation and accountable owner | Required evidence / residual risk |
| --- | --- | --- | --- |
| SEC-01 H | Crafted SQLite schema invokes unexpected behavior during validation/migration | rust_engine + database_designer: closed supported schema/object policy, app-owned SQL only, connection hardening before queries, bounded staging; source unchanged | Hostile views/triggers/virtual objects and mismatched types rejected; SQLite parser defects remain possible |
| SEC-02 H | Huge sample counts, extreme coordinates or PNG bounds exhaust RAM/CPU/GPU/disk | Rust + rendering_performance: validate counts/overflow/finite values before allocation, budget query/geometry/export work; cancel/yield outside input callbacks | Deterministic limit/overflow/cancellation fixtures; host capacity differs from format validity |
| SEC-03 H | Invalid native buffers/handles or panic corrupts shared state | Rust + native engineer: reviewed ownership/thread/lifetime ABI, narrow unsafe wrappers, checked lengths/tags, generation checks; contain ordinary errors | Valid-pointer malformed-value tests, sanitizer/Miri where supported; raw arbitrary pointer validity is caller precondition, not magically checkable |
| SEC-04 H | Forged or stale peer renames another drawing | Native + Rust: authenticate peer separately from current ownership, bounded typed intent and request identity, authorization/deduplication and durable outcome | Wrong peer/reused PID/stale generation/duplicate/lost-ack tests; transport/signing contract not selected |
| SEC-05 H | Source/target/parent path changes between consent and write | Native + services: operation-bound capabilities and actual identity/replacement precondition; review links/aliases/volumes, bounded staged publication | Swap-target/parent and alias races; never promise universal provider atomicity or rely on one check-then-open |
| SEC-06 H | Restarted export overwrites a changed target using old approval | Native + Rust + DB: revalidate access, target, intent and job generation; reconcile uncertain publication before retry | Crash at prepare/publish/record boundaries, revoked bookmark, moved target; ambiguity pauses safely |
| SEC-07 H | Source deletion races a new export or stale worker and leaves hidden copies/writes | Rust + DB: reviewed deletion admission barrier and cancellable job claims, reference-safe cleanup, durable reconciliation across databases | Race new export against confirmed deletion; crash/cancel each step; published external outputs remain |
| SEC-08 H | Upgrade/rebuild mistakes denied access, lock contention or newer format for corruption | DB + Rust: distinguish error classes, validate supported versions, safe copies and exclusive migration ownership | Busy/denied/newer/corrupt fixtures, no blank replacement or deletion of unknown files |
| SEC-09 H | Sensitive data escapes through debug logs, screenshots, test upload or snapshots | Implementers + build_reliability: allowlist logs, private bounded storage, synthetic fixtures, evidence access/retention labels; no upload by default | Canary data absent from production diagnostics; user-authorized visual artifacts may contain artwork and require explicit handling |
| SEC-10 H | Excess entitlements or production test hook bypasses boundaries | Native + build_reliability: least-privilege signed sandbox, no broad access/network/helper solely for convenience; exclude test controls from release | Inspect actual entitlements/artifact, negative access tests; sandbox does not authenticate every peer automatically |
| SEC-11 H | Dependency/build script or automated command steals secrets | Build reliability + reviewer: pinned provenance, inspect scripts/native downloads, argument-array execution, secret/advisory/license checks | Reproducible inventories including SQLite/Skia C++ and generated tools; scanners cannot prove no malicious dependency |
| SEC-12 M | User names become markup, paths or diagnostic injection | Native/web + Rust: display as text, native localized resources, bounded canonical validation, IDs as storage identity | Unicode/control/HTML-like names, traversal labels and log-delimiter tests; preserve legitimate text/IME |
| SEC-13 Future | Browser XSS or compromised same-origin script accesses drawings | Web owner: narrow script/dependency trust, CSP suited to Wasm/workers, origin/message validation, safe DOM and local-dev binding | Real browser CSP/message/storage tests; Wasm is not protection from authorized hostile JS |
| SEC-14 Future | Cloud credentials or stale replica overwrites another user's data | Rust + future service owner: reviewed auth/authorization/tenant identity, conflict/delete semantics, transport security, device/recovery trust | Threat model before cloud code; local counters/locks/import identity are not sync authority |
| SEC-16 H | Former editor completes a queued write after ownership transfers | Rust + DB: fence queued/in-flight writes with reviewed owner generation and lock lifecycle, not only SQLite writer serialization | Pause/kill/resume, ownership loss during commit, stale completion; explicitly define already-committed boundary |
| SEC-15 Future | Malicious release/update or unauthorized publishing | Build reliability + platform owner: signing custody, provenance, reviewed update/channel trust and release approvals | S00G/S09 channel-specific evidence; no updater/distribution infrastructure selected |

## Concrete import proposal for S02 review

Open external content through reviewed source access and bounded staging; preserve a coherent source
revision and avoid write-through. Do not mark an arbitrary copied SQLite schema trusted merely because
it has the right extension, application ID, STRICT tables or passes an integrity check. Use fixed
app-owned queries/migrations and validate permitted objects, types, references, values and resources.
Propose constructing the accepted managed copy from validated records under our schema rather than
publishing foreign schema. Owner review must compare strict schema validation plus staged migration against semantic extraction
into a new current schema, including compatibility, copy costs and version handling. Neither removes
the SQLite parser attack surface. Do not accept source-controlled URI flags such as immutable/nolock;
coherent capture cannot assume a changing file is immutable. Verify effective hardening and FK
settings per connection; structural integrity alone does not check every FK/domain rule.
[SQLite URI rules](https://www.sqlite.org/uri.html),
[integrity checking](https://www.sqlite.org/pragma.html#pragma_integrity_check).

SQLite recommends defensive configuration, lower application-appropriate limits and progress/
interruption controls. For untrusted database files it describes trusted-schema restrictions and
optional unused-object/integrity defenses. Evaluate availability/configuration on every connection;
do not blindly disable triggers if required schema behavior depends on them. Disable unused extension
loading and avoid side-effectful SQL functions. Review validation cost before any full-file scan.
[SQLite security guidance](https://www.sqlite.org/security.html). Limits are proposal values until
measured/approved; SQL parameter binding alone does not validate an attacker-supplied database.

Native interchange needs a privacy review: export only approved portable data, not catalog/job
state or recoverable remnants of deleted/unrelated records. Compare fresh document construction
with an explicitly verified sanitization path. A database backup is a consistency mechanism, not
a privacy filter. [SQLite backup](https://www.sqlite.org/backup.html). This proposal does not
change the selected native format without schema/export contract review.

## Native authority and publication proposal

Separate four checks: authenticated peer, authority for the requested operation, current owner/job
generation, and user consent for the actual target. PID, document UUID, bundle name, notification or
remembered path alone is insufficient. A native transport such as XPC is a candidate only; show
alternatives, deployment/signing needs and typed rename/activation request outcomes before adoption.
No generic execute-command endpoint, daemon or arbitrary serialized command protocol is authorized.

Security-scoped resource access is a capability with a lifecycle; balance acquisition/release and
re-resolve persisted references when needed. Access does not prove that replacement of the present
file was confirmed. Treat denied/expired access separately from corrupt data. Review persistent job
bookmark storage, provider guarantees and unknown completion; never ask for broad permissions to
make a test pass. Apple documents sandbox file access and scoped access lifetime:
[filesystem access](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox),
[scoped lifetime](https://developer.apple.com/documentation/foundation/nsurl/startaccessingsecurityscopedresource()).

Verify sandbox feasibility of advisory notifications separately from authenticated rename requests;
do not assume payload-bearing distributed notifications form a permitted command bus. Owner-window
activation only follows explicit Open and verified identity. No background focus stealing.

## Platform and future-work applicability

macOS preview: container/access/entitlement and signed multi-instance probes before integration;
user-selected file operations and native field safety, private export storage and actual pen input.
iOS/iPadOS/visionOS: preserve protection on suspension/permission changes and app-private storage;
exact device/API/accessibility constraints belong to ports, not an AppKit-global assumption.
Android family: reviewed exported components/intents/URI grants and storage access; do not trust
an incoming intent as file or command authority. Windows: reviewed activation/IPC/file permissions
and package model. Linux: reviewed desktop/file/IPC permissions without assuming universal sandboxing.
Web/ChromeOS browser: origin/CSP/untrusted text and storage-eviction behavior; browser source cannot
contain privileged server credentials. Exact host mechanisms are later proposals, not certified.
TV/watch/viewer targets: Rust rejects mutations even if hidden controls or incoming messages request
them. Future agent signals require an explicit trust/capability boundary; typed commands alone are
not authorization. No agent/network/remote debug endpoint in the initial preview by implication.

## Needed review decisions, not another generic questionnaire

1. Concrete import reader/schema admission and validation budgets; whether an isolated importer is
   warranted by evidence. A new process would change topology and is not approved here.
2. Peer authentication/transport, owner-generation fencing and unknown-rename outcome handling.
3. File capability/target identity publication contract and recoverable deletion/export admission.
4. Private data backup/retention classification and capacity exceptions: unresolved snapshots cannot
   be deleted just to satisfy a quota; protected-full capacity must reject/pause new work honestly.
5. Open-source license/contribution and release governance proposal. Open source is intended, but
   no license, network endpoint, telemetry, publishing or external-data upload is selected.

## Agent recommendation

Use existing implementers for their security responsibilities and a focused independent security
review at import, IPC/FFI, persistence/export, native dependency and future cloud milestones. For this
local preview, a new permanent security implementer is not recommended: it would dilute ownership.
A narrowly scoped security-review role can be useful if frequent specialist reviews justify its
maintenance; ask the owner before adding/configuring one. The existing reviewer can perform focused
reviews now. This is a role recommendation, not a new configured agent or security certification.

Lead integrates the threat register and owner approval packets; rust_engine owns shared validation/
authority, native engineers capabilities, DB specialist persistence design, build_reliability checks/
provenance, UX/UI honest permission/failure flows. Implementers add security cases with their feature.
Reviewer independently challenges boundaries and evidence. Security findings do not bypass Figma
or expand features. External expert assessment may be appropriate before strong cloud/privacy claims.

See [security gates and response](gates-and-response.md) for traceability and evidence requirements.
