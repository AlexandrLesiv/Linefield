# Durable empty library — implementation scope v1

Prepared 2026-10-19 against `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus preserved work.
**For owner approval. No production persistence or Rust/Wasm app code was added.**
Decision237 settles recommendations1–3 of the previous handoff. The experiment is complete,
but its outcome blocks adoption of both tested storage mechanisms.

## Recommendation for the owner

Approve the bounded product, interface, reference format and design below as the first durable
library slice. Keep activation of production storage behind a separate reviewed mechanism and
passing recovery/fencing evidence. Approval of this scope must not waive the observed data-loss
hazard or select an untested replacement. Safe contract/conformance work can proceed meanwhile.

The next storage work should be a disposable preservation experiment: investigate a read-only
inspection step before any SAH-pool initialization/unpause, under the same exclusive ownership,
that rejects and preserves damaged or ambiguous pool files before upstream cleanup can touch them.
Its exact metadata rules, atomicity and runtime failure behavior must be reviewed before adoption.
If safe preservation cannot be proved without replacing upstream internals, return with a different
storage mechanism; do not silently introduce a custom VFS or weaken recovery requirements.
This is a proposed next investigation, not a completed fix or selected production design.

## What the first implementation would deliver

- Existing responsive web gallery backed by browser-local empty drawings: create, bounded listing,
  open, rename and reopen after reload/browser restart. New drawings receive durable identities
  and automatic names; sample artwork is not converted or presented as saved user content.
- Shared Rust library decisions compiled for Wasm, one authoritative owner per drawing, typed
  generated statements/adapter records, exact i64 values and bounded clients/queues. The browser
  owns presentation, worker/file access and native field/IME behavior.
- Honest creation/rename pending, unknown and failure states; durable rename success can coexist
  with a stale gallery projection. Navigation/focus/history only reflect accepted destinations.
- The existing blank drawing shell with a clear saved-empty-record versus UI-only-control
  distinction. Themes, English/Ukrainian, responsive layout, keyboard and reduced motion remain.
- Validation and conservative recovery: preserve uncertain sources, reject unsupported content,
  reconstruct valid catalog projections where safe, and block New if automatic naming authority
  is lost. No invented success or retry of an unknown commit.

No production Delete, stroke input/render engine, edit Undo/Redo, import/export, sync, native host,
file picker or migration of the old project. Removal v4.1 remains approved for the later deletion
slice; its initialized schema shape does not expose Delete. Numerical engine v4 is separate.

## Exact approval bundle

| Artifact | Concrete choice covered |
| --- | --- |
| [Library interface v1](../interfaces/durable-library-v1.md) | Named commands/queries, C01–C17/D01–D07, typed values, receipts, ownership and failure rules; DLIB-01–17 |
| [Format/bootstrap v1](../database/empty-library-v1.md) and its three SQL resources | Catalog/drawing IDs LFCA/LFDW, version1, fixed Pen seed, STRICT constraints, initialization and exact-schema validator; no installed migrations yet |
| [Empty-library design v1](../design/durable-library-empty-v1.md) and three linked boards | DLW-01–08, desktop/narrow en/uk states, failure/recovery wording, focus and motion contract |
| [Storage proposal](../architecture/browser-storage-v1-proposal.md) | Context and required guarantees only; tested VFS adoption is explicitly excluded until the blocker is resolved |

Finite preview limits are part of the requested contract approval: names256 Unicode scalars/
1024UTF-8 bytes; pages128 rows/256KiB;8 attached clients per drawing and4 hosted drawings per
coordinator;32 ordinary requests/8MiB plus4 control requests/64KiB reserve; retained creation
ledger256 rows/1MiB and document receipts4096 rows/8MiB. No pruning is included: exhausted ledger
or receipt capacity rejects further corresponding mutation while retaining existing documents.
These are proposed finite preview limits, not measured performance or permanent artwork limits.
The format packet additionally specifies schema/validator row, memory and VM-step budgets.
Full details and exact constants in the linked packets control; approval is not an assertion that
these bounds have passed runtime stress or hostile-file testing.

## Experiment result and proof limits

[Full storage evidence](../../quality/browser-storage-v1/README.md): SQLite Wasm3.54.1 digest
verified; Chrome155.0.8059.80 and WebKit27.2. Original `opfs`:9 Chrome cases and2 WebKit cases
passed. They cover basic commit/reopen, selected concurrency/termination and restart conditions.
They do not prove retirement of all old proxy I/O after the parent releases ownership (STORE-W9).
The post-commit case knew commit succeeded; it is not true lost-reply receipt evidence.
Firefox157.0 could not launch a profile; that lane is unrun, not unsupported SQLite or a pass.

Same-worker SAH-pool:5 healthy lifecycle cases passed. A sixth diagnostic damaged only synthetic
pool metadata: initialization reduced its20480-byte file to4096 bytes and discarded its association,
despite `preserveOnInitFailure:true` and `clearOnInit:false`. Actual before/after bytes and hashes
are retained. This is a confirmed preservation blocker; a zero runner exit means the diagnostic
completed, not storage passed. Neither candidate is production-ready. No user drawing was used.

Reference SQL has6 reproducible in-memory Node SQLite cases, including14-table schema source column parity,
STRICT tables, identity/name rejection, atomic rename rollback, removal uniqueness and scope FKs.
[Historical evidence](https://github.com/AlexandrLesiv/Linefield/commit/b0cb531). These are smoke/constraint tests, not browser
schema-validator, migrations, recovery or production persistence acceptance.

The designer inspected all three rendered boards and accepted their composition. Static designs
are not a live durable app, runtime accessibility tests or proficient Ukrainian review.
Existing prototype's118-pass browser evidence remains separate and unchanged.
[Independent review](../../quality/durable-library-review-v1/README.md) accepts presenting this
proposal for approval after two contract corrections; it does not clear production storage.

## Implementation order and release gates

1. Resolve the storage preservation/ownership mechanism in synthetic tests and review its exact
   contract. Obtain owner adoption approval if the mechanism changes. No production file writes
   before this gate. Firefox launch failure must be resolved or explicitly excluded from support.
2. Build shared Rust validation/command tests and generated typed adapter conformance, then exact
   bootstrap/schema-validator tests against the adopted SQLite build. Verify dependency/license,
   isolation/CSP, allocation and error mapping; no arbitrary UI SQL or cross-Wasm pointers.
3. Implement create/list/open/rename/reopen and recovery with actual worker/OPFS fault injection;
   execute DLIB-01–17 plus STORE-W cases. Include quota/refusal, corrupt/unknown files, uncertain
   commits, two-tab attachment, dead/frozen owners, receipt/ledger exhaustion and recovery races.
4. Integrate DLW states into the existing gallery/shell; run normal/reduced motion, Back/Forward,
   focus, IME, en/uk/pseudo layout and stable-ID browser scenarios. Obtain designer and fresh
   independent security/boundary review with exact build evidence before calling it complete.

The first owner decision is this bounded scope/format/design bundle. The remaining technical
storage blocker is engineering proof, not a request to accept data loss. No extra product
micro-question batch or real drawing-engine approval is needed for an empty durable library.
