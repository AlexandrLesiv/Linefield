# SAVE-08 — persistent drawing tile Rename and Delete/Undo

Owner requested the original tile actions for real saved drawings on2026-10-30. Authorized
implementation on codex/save08-gallery-actions from SAVE07 commit109222c; one task/branch/PR.
Keep65371 and every existing preview unchanged. No merge or permanent file purge in this slice.

## Behavior

Restore each drawing tile's original ellipsis menu, Rename dialog, and Delete/Undo removal slot.
Rename persists the validated trimmed title; deletion hides the drawing durably, while its
in-place Undo restores it. Keep white thumbnails, keyboard/focus behavior, responsive layout,
reduced-motion handling, theme and English/Ukrainian localization. Present changes only after
successful storage acknowledgement; failure keeps existing data and offers a clear retry.
After reload deleted drawings remain absent and direct routes refuse them. This slice has no
Trash screen or physical payload cleanup; reversible deletion retains the stored drawing.

## Shared contract and ownership

Rust owns catalog SQL, title bounds and generated contract. The storage worker executes checked
catalog operations and transactions. Extend catalogv1 transactionally with tombstones and exact
mutation receipts. Bind deletion and Undo to drawing identity/incarnation and a unique token.
Rename uses expected-title concurrency validation. Exact retries are idempotent; conflicting
operation identities and obsolete Undo tokens fail. Responses must not project an old title
when a newer rename has already committed.

Delete obtains drawing ownership before catalog mutation. The current host may retain a hidden
editor after returning to the gallery: flush and close only that matching session before deletion.
A failed flush leaves accepted drawing data and its editor available. Another tab owning the
same drawing blocks deletion. Keep drawing→catalog lock order. Rename changes catalog metadata
only. List, get, open, create retry and legacy reconciliation must never resurrect a tombstone.
Undo preserves the original activity ordering unless a legitimate newer operation changes it.

The host owns tile presentation, menus, dialog state and focus. Reuse the existing UI design;
do not add renderer/input changes or transplant sample-card in-memory mutations.

## Acceptance

E2E only: real strokes survive rename/reload and Delete/Undo with exact raw data/image; Unicode
names, layer/paper state, EN/UK labels, keyboard dismissal/focus, pending/error/retry states;
deleted drawing absent after reload and refused by direct URL; unrelated drawings unchanged;
matching cached session releases ownership; active other-tab drawing refuses deletion;
failed flush/transaction preserves data; exact lost-ack retries, stale title and Undo tokens;
deleted legacy drawing does not reappear during catalog discovery. Validate oldcatalog migration
without rewriting drawing payloads, including interruption/refusal of malformed storage.

Run scoped static/build/generated checks, independent source and design review. Open a separate
frozen actual-app preview including the latest approved pen/UI behavior. Keep unrelated branches,
work and previews intact. Report remaining limitations honestly; no merge.

## Restore acceptance finding

Exact-image reopen checks also reproduced missing restored Ink in the unchanged SAVE07 baseline.
Raw data was intact, but the completed-geometry registry did not discover restored strokes.
Include a bounded startup registration fix in this slice and require exact-image reload,
Rename and Delete/Undo coverage; do not mask the failure with image tolerances.

## Review and verification

Independent source/design review covered transactional migration, tombstone admission, exact
retry identity/current projection, cached-session failure, focus/pending states and pagination.
Findings were resolved, including shared gallery-operation serialization and restartable pages
after removal. Rust check, scoped authored Rust formatting, generated catalog/save ABI, web
types, localization, scoped lint/format and production builds pass. Whole-workspace Rust
formatting still reports pre-existing donor/generated-file differences; unrelated files remain
unchanged.

Integrated preview65377 combines this branch with the previously approved pen/UI overlay.
Its editor bundle matches65376, where both pen-identity cases and all16 mouse/pen contact
recovery cases pass exact accepted-sample preservation and durable reload. Existing65371
and earlier previews remain frozen. This preview has its own browser-origin library.

Real UI checks in English/Ukrainian pass Unicode rename, cancellation/focus, durable removal
and direct-route refusal, cached editor release, and Delete/Undo. All three brushes, layer and
paper settings preserve exact raw state and exact canvas pixels after Rename/reload and Undo.

Failure checks pass for pending Rename (no optimistic projection), injected quota failure with
retained dialog value and retry, failed cached-editor close preserving raw data, and successful
retry Delete/Undo with exact image. Another-tab ownership blocks deletion; retry after it
closes preserves exact drawing state and pixels.

Final integrated checks also pass catalog v1 migration with exact drawing-file/raw preservation,
malformed v1 refusal without file mutation, exact mutation retries returning current state,
stale-title/token rejection, Unicode title limits and unchanged ordering. A 130-drawing
pagination case verifies blocked actions during pending More, all129 remaining IDs after
deletion without duplicates/skips, and130 unique cards after Undo.

All eight SAVE08 E2E suites pass on65377, including deleted legacy drawing discovery (no
resurrection), transaction rollback, committed-worker loss/lost acknowledgement and exact
retry recovery. No SAVE08 acceptance failures remain. Task is ready for owner review; not merged.

## Creation-motion correction

Owner reported gallery reflow during new-document expansion. Preserve the clicked desktop
or mobile creation control and existing card layout through the expansion. Publish the new
gallery tile only after expansion completes, then retarget the return transition to it before
reconciling queued route intents. Durable creation remains independent of presentation: an
open failure must retain the already-created drawing, and retries must not duplicate it.
Cover normal/reduced motion, mobile creation and Back queued during expansion.

The regression fails on65378 (new card present at the first expansion frame) and passes on
65379 for desktop, mobile, reduced motion and Back queued during expansion. Each checks
stable gallery IDs/order through expansion, exactly one subsequent insertion and the correct
return target. Independent source review and scoped types/lint/format/build checks pass.
Injected editor-startup failure after durable creation also retains exactly one new card;
reopening the same document succeeds and reload preserves the identical drawing IDs.
