# SAVE-06 — reload and saved-drawing gallery

Owner approved 2026-10-30. In progress on codex/save06-saved-gallery, stacked on
SAVE-05 1adb0b0. Preserve all existing previews; no merge authorization.

## Scope

Replace sample cards with actual durable catalog entries and white thumbnails. New creates a
separate durable drawing; Open and direct reload use the same stable identity. Preserve the
existing singleton without rewriting its drawing data. Loading, missing, corrupt and unavailable
storage never silently produce an empty replacement. Keep EN/UK, theme, focus and responsive
navigation. Rename/removal remain unavailable until their durable workflows are implemented.

Rust owns shared catalog contracts and canonical drawing/revision/replay semantics. The storage
worker executes checked statements and holds writer locks. The host owns routes, catalog
presentation and session switching. Keep same-document Back/Resume history. Switching documents
flushes and releases the previous writer before loading the next document.

## Invariants and acceptance

CT-03/04/05/07/08; revision-safe saves, exclusive writers, exact raw-data restoration, no input
loss or rendering-quality change. E2E: create two drawings; draw/save/reload/open each; verify
independent content and white named cards; same-document Back/Resume; direct route reload;
missing/corrupt catalog and document; interrupted create reconciliation; repeated create request;
legacy discovery; competing writer; failure leaves existing data unchanged. Retain exact save
and rendered-image checks, responsive/keyboard/EN/UK review and independent review.

## Follow-on capacity work

Approved next bounded task: replace cumulative journal limits with incremental current-state
storage and safe compaction, streaming reload and quota failure handling. Do not simply remove
length/queue guards. Establish before/after input, memory and recovery evidence beyond old limits.

## Implemented checkpoint

Separate catalog and per-drawing storage, durable creation intents, persisted localized ordinal
names, bounded128-entry pages and direct-ID lookup replace all sample gallery entries. Cards
have white thumbnails and always-visible names. No memory-only rename/delete actions remain.
The original singleton is discovered in place; original namespace and incarnation are retained.
Unknown/deleted/corrupt IDs never initialize blank drawings. A failed pending creation does not
hide healthy cards; Retry keeps the same creation ID. Missing catalog with managed new files is
refused rather than reconstructed automatically.

Same-drawing Back/Resume retains the engine and session history. Switching prepares a second
hidden candidate and waits for validated startup before retiring the old writer; failure retains
the previous engine/history. A successful switch starts the reopened document with fresh history.
The temporary second editor increases peak switch memory; drawing/rendering algorithms are unchanged.
Routes drain queued Back/Forward intents after asynchronous work. Returned-card timestamps update
without replacing focused elements. Each preview origin remains a distinct local library.

## Evidence

Actual-app13checks: two separate drawings, direct/gallery reload, exact canvas-image reload,
same-document Undo/Redo, missing-ID refusal, white cards and no uncaught errors.
Storage8groups: localized idempotent creation, exclusive independent writers, pending recovery,
incarnation mismatch, missing catalog, control characters and timestamp boundaries.
Legacy3checks: populated old SAVE05 three-brush drawing with paper/grid retains exact raw/style/
settings and canvas pixels after catalog discovery and repeated gallery reload.
Independent route4checks: delayed failed/successful startup and Back/Forward during blocked close.
Independent creation2checks: healthy drawing stays accessible on failed New; retry reuses its ID.
Reports: ignored .build-cache/save06-{app,candidate-storage,migration,route-review,create-review}.
Static/build/source-size checks pass. Physical Wacom and broad platform/performance acceptance
are not implied by these fresh Chromium contexts. Capacity implementation remains separate.

Designer10cases pass across EN/UK390/1200px light/dark, immediate second New, keyboard focus,
white thumbnails and unavailable-worker UI. Independent final source review finds no remaining
scoped blocker; failed-create recovery adds a third queued-Forward case. Frozen manual preview:
http://127.0.0.1:65354/ at .build-cache/save06-preview-65354. Existing65352 remains unchanged.
No claim that data moves between different preview origins. No merge authorized.
