# Durable library — concrete review handoff

**Superseded handoff:** the owner approved recommendations1–3 below in decision237.
The experiment and remaining preparation are recorded in
[implementation scope v1](durable-library-implementation-scope-v1.md). Preserve the original
published schema bytes and publication evidence; the hosted label predates that approval.

Status: mechanisms proposed for owner review; publication permission is not implementation approval.
Decision236 records approved recommendations1–3: durable library before ink, restart-surviving
recoverable removals, exact-set durable departure after destination readiness. These are settled.

## Delivered and verified

- Browser follow-up found clipped reverse-keyboard focus. Focused settings now scroll into view
  for keyboard focus without moving the control during pointer focus. Added pointer cancellation
  and fresh-click coverage. Final complete run: **118 passed, zero failed/skipped/flaky**, including
  the explicit WebKit case. Headless browser permission was granted; no Computer Use was needed.
- Web type checks, lint, formatting, production build and repository checks passed. Final assets:
  `index-DCSOpgQJ.js` and `index-z7JnId1S.css`. Exact source/test/build hashes and runtime report:
  [manifest](../../quality/continuation-2026-10-19/final-manifest.json),
  [browser results](../../quality/continuation-2026-10-19/browser/final-results.json).
- Designer source review accepted the focus correction. Independent review corrected acquisition
  recovery and preserved multi-client coordinator attachment. These reviews do not certify native
  accessibility, Ukrainian linguistic quality or a durable engine that does not yet exist.

## Review artifacts

| Version | What it makes concrete | Remaining evidence/contract work |
| --- | --- | --- |
| [Browser storage v1](../architecture/browser-storage-v1-proposal.md) | SQLite Wasm3.54.1 candidate, OPFS VFS, isolation exception, one writer with attached clients, lock ordering, typed bridge direction, error/receipt policy and provisional bounds | Synthetic browser feasibility, proxy-death fencing, exact generated bridge/SQL catalogue and measured capacity |
| [Deletion amendment v4.1](../database/deletion-v4/proposal.md) | Three added catalog tables, per-gallery scope, durable Stage/Undo/exact departure, acquisition recovery, dictionary and17 failure cases | Tested SQL/checks/migrations and scope/target locking; identified recovery screens and owner mechanism approval |
| [Regional engine v4](../interfaces/regional-v4-proposal.md) | Input versus stored coordinates, mapping generations, captured transforms, lifetimes/errors, proposed nearest-even normalization | Exact generated layouts/fingerprints, numerical span/painted-geometry proof, scale gesture review; not needed to store empty drawings |
| [Durable UI states v1](../design/durable-library-states-v1.md) | Own/other-tab removal, reclaim, unknown outcome, accepted removal with failed destination, focus and announcements | Identified visual frames, precise recovery selector, en/uk review and actual durable scenarios |

Schema-only publication was explicitly authorized by the owner and succeeded through pinned CLI0.6.3.
Hosted project: [Linefield schema review](https://dbdocs.io/AlexandrLesiv/Linefield-S02-proposal-v1),
version label **S02 deletion v4.1 proposed 2026-10-19**. It contains17tables,146columns and11
same-file relationships, with unchanged approved v3 table definitions plus proposed catalog additions.
The original approved review source remains untouched; the new derivative corrects its project
title/status/counts. Both standalone and combined DBML validate. No executable migration exists.
Authenticated CLI readback matched the local payload byte-for-byte (SHA-256
`059104124b0a86b67df6d2cfb0d9a13652357d861edf8090616caef6b66717fa`).
[Publication record](../../quality/continuation-2026-10-19/publication.json).
Existing project was previously verified private; publication did not request a sharing change.
Fresh hosted visual layout/privacy-setting inspection is still not performed. The tool returned
the project URL, not an immutable version URL; local hashes identify the exact review payload.

## Decisions still needed from the owner

1. **Browser storage direction and feasibility authorization.** Recommend testing the proposed
   OPFS/SQLite worker approach with synthetic data, including its isolated-origin/SAB requirement.
   This changes the previous no-SAB default only for upstream storage. Authorize a disposable
   feasibility fixture and pinned candidate dependency first; do not approve production durability
   by assumption. If proxy fencing fails, return with a replacement proposal before product code.
2. **Browser-local data-loss posture.** Recommend allowing local browser storage with clear
   disclosure that site-data clearing/eviction can remove it, requesting persistent storage and
   reporting refusal honestly. No native-strength or backup guarantee. Exact warning/recovery
   presentation needs identified design review; an external backup/export feature is separate scope.
3. **Deletion scope behavior and schema amendment.** Recommend v4.1 per-gallery ownership:
   another live tab cannot Undo/finalize your removal set; after verified owner loss a gallery can
   explicitly reclaim it. Multiple orphan sets stay separate. Approve these new behaviors/tables
   only if desired. They can be deferred while create/list/open/rename/reopen ships with Delete
   unavailable. D1–D3 did not settle this cross-tab behavior or the proposed capacity limits.
4. **Identified durable UI and implementation slice.** After feasibility and remaining exact
   bridge/SQL review, approve the concrete durable states and authorize create/list/open/rename/
   reopen of empty drawings. Keep Delete unavailable unless its additional contract/design tests
   are approved and pass. Real pen/scale remains a later separately approved engine slice.

The open bridge declarations, SQL/failure fixtures, visual frames and feasibility results are work
for the team, not questions for the owner to design. The next productive step is the bounded
synthetic storage experiment once item1 is authorized. No native implementation, production
persistence, Rust/Wasm engine, main merge or release was added in this work.
