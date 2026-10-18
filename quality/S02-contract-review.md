
> Working-copy terminology was normalized by owner decision235 on2026-10-18. Historical approval hashes below still identify their recorded approval artifacts, not these normalized bytes. The pinned base preserves a pre-normalization working copy and is an exact approval snapshot only where its hash matches. See [normalization provenance](../docs/reviews/design-workflow-normalization-2026-10-18.md).

# S02 contract proposal evidence and threat delta

Date: 2026-10-16. Documentation only; no code, migrations, generated declarations or runtime tests.
Scope: CT-01/03/04/05/07/09; INV-01/03/06/09/10/11; S02, S02L and later S06/S07E.
No Git HEAD: final file hashes identify the reviewed artifacts.

## Specialist work and fresh review

- Scoped database specialist drafted three DBML files, dictionary and constraints.
- rust_engine proposed copied-output typed ABI and command/effect lifecycle.
- macos_ui evaluated ownership, authenticated rename alternatives and sandbox feasibility gaps.
- Fresh reviewer independently inspected the assembled proposal and reported two findings:
  P1 backup-plus-DELETE cannot guarantee removal of private bytes in portable exports;
  P2 numeric catalog generations alone cannot fence a rebuilt catalog.
- Lead changed portable export to fresh allowlisted construction and added catalog incarnation UUID.
  Follow-up review status and hashes are recorded below after verification.

These are document reviews, not schema approval, generated-ABI compilation or native acceptance.

## New security analysis

| Existing threat | Concrete obligation in this proposal |
| --- | --- |
| SEC-01/02 hostile files and exhaustion | Expected-schema and row validation, defensive SQLite, limits, no extension loading; capacity != corruption |
| SEC-03 foreign boundary | Valid foreign pointer preconditions, validated tags/lengths, copied lifetimes, poisoned-session handling |
| SEC-04/16 peer or stale writer | Authenticated transport still gated; OS ownership guard held through commit; generation checks |
| SEC-05/06 publication and access | Exact target identity/grants and unknown-publication pause; no blind overwrite retry |
| SEC-07 deletion races | Durable exact consent/intent and common admission coordinator with export references |
| SEC-08/09 recovery and privacy | Preserve uncertain files; fresh sanitized portable DB; private internal copies/receipts; redacted diagnostics |
| SEC-10 permissions | No new broker, broad entitlement or unsigned peer fallback without review |

Threat delta is proposed; no mitigation is claimed implemented. Cloud sync/auth/encryption and other
platform implementations remain separately reviewed. No application-level encryption is selected.

## Planned verification matrix

| Scenario | Layer | Required observable result |
| --- | --- | --- |
| DB-01 schema/types/UUID/FK | Storage fixtures | Reject malformed/newer/unsupported safely; sample cascade; no inferred trust |
| DB-02 original samples/transforms | Engine + reopen | Original points/color/order survive edit/Undo/save/reopen |
| DB-03 incremental save parity | Services | Affected-row save equals reference document across randomized commands |
| DB-04 save/rename races | Deterministic workers + process | Pairwise revision correctness; old completion cannot mark newer state saved |
| DB-05 naming/create crash | Service + process kill | No reused allocated ordinal; no incomplete gallery item; failed formatting/creation permits gaps |
| DB-06 catalog loss/rebuild | Storage + multi-process | Preserve ambiguous/deleted remnants; new incarnation rejects stale pages/completions |
| DB-07 portable privacy | Raw-file + semantic | Private canaries absent from exported bytes, including free pages; current artwork intact |
| DB-08 import/migration/recovery | File fixtures | Fresh IDs, coherent capture, original preserved, supported lossless upgrade only |
| DB-09 activity counter | Storage + concurrent process | Atomic allocator/projection, idempotent retry; deletion never lowers highwater; clocks/import timestamps do not reorder local activity; overflow rejects; lost chronology never guessed |
| DB-10 localized default names | Shared fixtures + native E2E on each host | Rust en/uk messages use host-resolved launch language; first English Untitled then Untitled 2; fallback and gaps; existing names stable after language changes; no native formatting effect |
| COORD-01 lock ownership | Actual sandbox processes | One owner; no heartbeat takeover; retained guard through commit |
| COORD-02 rename replay/conflict | Process fault injection | Same receipt outcome, mismatched args rejected, unknown after lost/expired receipt never blindly reapplied |
| COORD-03 authentication/discovery | Signed sandbox probe | Verified peer, wrong peer rejected, no daemon/private API fallback |
| COORD-04 notifications/activation | Native multi-process | Advisory refresh only; explicit Open activates verified owner or reports in-use |
| JOB-01 export/delete coordination | Services + process crashes | No new source job after deletion admission; published outputs survive |
| JOB-02 publication ambiguity | Native filesystem faults | Changed/unknown target pauses; no silent overwrite retry |
| JOB-03 quotas/claim recovery | Multi-process stress | Per-process cap plus approved shared limits; no dropped durable jobs |
| FFI-01 generated layout | Rust + Swift compile | Exact ABI/version/layout, invalid tags rejected |
| FFI-02 handles/thread/panic | Boundary negative tests | Stale/wrong-thread/reentrant rejected; poisoned session cannot persist |
| FFI-03 buffers | Boundary sanitizers/tests | Borrowed input copied, output native-owned, bounds/UTF-8/overflow checked |
| FFI-04 capacities/resync | Contract | No partial consumption/replayed commands; incarnation/generation resync |
| FFI-05 effect/intent duplicates | Contract | Stale confirmation cannot delete; duplicate presentation does not reopen dialog |
| FFI-06 wake/shutdown | Race stress + native adapter | No lost wake/descriptor reuse; bounded main-thread work; no blocking teardown |
| FFI-07 shared semantics | Cross-adapter conformance | Named entry points equal direct dispatcher outcomes |
| FFI-08 viewers | Capability tests | Mutations rejected even if host enables controls |
| LOG-01 structured diagnostics | Privacy/failure tests | No content/paths/persistent IDs; bounded drops/sink failure do not fail edit |
| LIBRARY native cases | Real macOS E2E | Controls/rename/delete/pending navigation and field/IME priority reach shared commands |

All rows are **planned, not executed**. Native E2E needs implementation, approved design review and a reserved
foreground session. Replays/injected dispatcher tests never substitute. A documentation link check
cannot certify SQLite migration or ABI correctness.

## Remaining approval/proof

D1/D6/D7/D8 policy choices are selected in DB1–DB4 (decisions 156–159). DB7-A/DB8-A select copied query outputs and macOS readiness; D2/D3 remain pending, along with exact ABI/lifetime proof and numeric budgets; complete canvas/delta/grant/launch-language DTOs; concrete NSXPC rendezvous and signing feasibility; recovery transitions and runtime durability. Retain source/layout hashes and hosted diagram evidence, not local rendered files.
Do not mark S02 closed until these are reviewed and evidence is honestly separated.

## Historical initial publication and tooling evidence

Later CLI authentication/publication and owner decisions are recorded in docs/RESUME.md and docs/reviews/S02-db-batch-1.md. The following records describe the initial proposal, not current unresolved policy status.

- Private dbdocs project published: https://dbdocs.io/AlexandrLesiv/Linefield-S02-proposal-v1, Version 1, 14 tables/104 fields. Sharing UI verified private/invited-only. Actual PNG exported and visually inspected. Editable companion layout remains pending.
- Browser parser exposed optional-reference/cardinality warnings; corrected canonical and combined DBML. CLI 0.6.3 validate reported no issues afterward.
- Fresh reviewer confirmed both architecture findings closed at documentation level. Runtime proof remains pending.
- Owner additionally authorized project-local CLI installation and database-designer CLI instructions. Official dbdiagram 0.6.3 pinned/locked, 70 packages installed with lifecycle scripts disabled. Node 24.12.0/npm 11.6.2. Version/help/publish help and validation passed. npm audit with optional dependencies omitted returned zero advisories; not a complete code/security audit.
- Reviewer then identified upstream validation credential lookup and usage telemetry. Documentation and agent instructions now explicitly require external isolation or owner operation for the strict credential requirement. No isolated runner exists. The agent did not directly inspect credentials; validation may have attempted lookup. No CLI login/token creation/authenticated CLI publishing performed. Browser publication preceded the later CLI-first instruction.
- Local link/fence check: 12 proposal documents, no broken relative links or unbalanced fences. DBML: 14 tables/8 same-database references. Source manifest records final hashes. No app builds/tests executed.

- Final targeted independent review closed both CLI documentation findings; read-only review, no additional CLI/authentication/runtime tests. Final static link/fence and pinned-package consistency checks passed. See [source manifest](S02-source-manifest.json).
