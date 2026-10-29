# Saved gallery — SAVE06 executor contract

Owner authorized New/Open, real saved entries with white thumbnails, same-origin reload and
migration of the SAVE05 single drawing on 2026-10-30. This is a bounded adoption of separate
catalog and drawing files; the older complete library/removal schema is not silently installed.
Rename, removal, import/export, synchronization and persistent Undo history are outside this slice.

`crates/vector-engine/src/catalog/mod.rs` owns the fixed SQL catalogue, schema version, UUID/name
constraints and default-name templates. `scripts/save-catalog-contract.ts` generates the browser
statement resource; build checks reject drift. Native adapters can consume the same contract.
The host cannot submit arbitrary SQL through worker messages. Browser bindings validate typed
request/row shapes; SQL enforces stored scalar/state domains. Rust `valid_document`, `valid_title`
and `default_title` provide the native/shared semantics; the current browser adapter consumes
this generated contract rather than claiming those native functions execute in its worker.

## State and ownership

An entry is `pending` until its separate drawing database has been initialized and reopened with
validated identity. Only `ready` entries appear in the gallery. Catalog row incarnation must
match the drawing database before editing. Catalog and drawing transactions are separate;
publication is not represented as an atomic operation across files. Reconciliation retains the
same pending identity/title after interruption. Failed or unknown admission preserves bytes.

A creation attempt freezes its UUIDv4 before dispatch. Name allocation reserves the catalog's
monotonic ordinal in the same transaction as the pending entry. Retry of that UUID reuses the
stored name and timestamp; it must not allocate another ordinal or drawing. Default names use
persisted creation language: `Untitled {number}` or `Без назви {number}`. Titles are single-line,
trimmed, nonempty, at most256 scalars/1024 UTF-8 bytes; no Unicode normalization. The legacy
singleton retains stable ID `drawing`; sample artwork never becomes saved user content.

Browser-native timestamps use exact nonnegative integer milliseconds within the browser Date range (at most8,640,000,000,000,000), separate from
canonical content revisions. Default-name exhaustion rejects before mutation. Lists are bounded
to128 rows per request; drawing content is not loaded to render a gallery page. No limit on total
drawing count is introduced here. SAVE05 per-drawing capture/storage limits remain until the
separate approved capacity work is implemented and measured.

## Edge cases and acceptance ownership

CT-03/04/05/07/08, INV-01/06/07/09 and SU-09–13/21 apply. The feature's browser E2E tests must cover:

- SAVE06-01: create, save, Back, same-origin reload and open the exact stable ID; raw drawing
  content and images match, sample placeholders are absent. Host implementer owns this test.
- SAVE06-02: repeated Create clicks/unknown reply/retry expose one identity; interrupted pending
  creation reconciles without replacing partial or unknown files. Storage implementer owns it.
- SAVE06-03: missing/corrupt/newer catalog or drawing, mismatched incarnation, malformed ID/name,
  exhausted ordinal and read-only/unavailable storage refuse without modifying existing content.
  Storage implementer owns fault injection; independent review checks preservation evidence.
- SAVE06-04: target writer ownership precedes catalog admission, no waiting for a target while
  holding catalog SQL, simultaneous galleries remain consistent, same-document competing writer
  rejects and no lock is stolen. Storage implementer owns real-worker concurrency checks.
- SAVE06-05: distinct documents never share an editor instance's canonical state. Back/resume of
  the retained document preserves its session; switching flushes/releases the old writer before
  opening another. Host implementer owns focus/navigation/cancellation checks.
- SAVE06-06: interrupted singleton adoption can be retried without duplicate catalog entries or
  changing the original drawing bytes. Missing catalog with managed drawings is not a fresh
  empty library. Storage implementer owns reopen/admission evidence.

SEC-01/02/03/07/08/09 remain applicable: same-origin code is trusted; disk state and routes are not.
Generated statements and allowlisted requests reduce input surface but do not authenticate a
compromised same-origin script. Reviews must distinguish schema/receipt validation from browser
quota, eviction and forced process termination. No platform durability guarantee is added.
