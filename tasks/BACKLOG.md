# Product backlog

This list records owner-approved functionality and priority. Positions 1–11 were explicitly
approved in this chat. They are planned outcomes, not completed features or blanket approval
of unresolved designs, ABI, numerical, storage or security choices. Execution begins only after
applicable contracts and designs are approved. Split large outcomes into bounded child tasks,
each with one branch and PR; use existing milestones instead of duplicating their ownership.

Priority is product order, not permission to bypass dependencies. Shared-editor preparation
can proceed independently of storage where authorized. Web leads implementation, followed by
separately scoped native work. E2E tests and static checks are required; unit suites are excluded
by current owner policy. Preserve existing gallery/navigation, themes and English/Ukrainian.

| Position | Outcome | Existing milestone | Status |
| --- | --- | --- | --- |
| 1 | Create a saved drawing | [S02L Library](S02L.md) | Approved backlog; storage/contract gates remain |
| 2 | Draw with the shared editor | [S03 Pure editor](S03.md), [P05 Web](P05.md) | Approved backlog; concrete engine contracts remain |
| 3 | Undo and redo edits | [S03 Pure editor](S03.md) | Approved backlog; follows stroke transactions |
| 4 | Save and reopen artwork | [S02L Library](S02L.md), [S06 Persistence](S06.md) | Approved backlog; depends on 1–3 and storage adoption |
| 5 | Pan and zoom the canvas | [S05 Navigation and editing](S05.md) | Approved backlog; mapping/input contracts remain |
| 6 | Select and edit one stroke | [S05 Navigation and editing](S05.md) | Approved backlog; integrates history and saving |
| 7 | Rename a drawing | [S02L Library](S02L.md) | Approved backlog; durable metadata and failure handling |
| 8 | Remove a drawing with Undo | [S02L Library](S02L.md) | Approved backlog; deletion/recovery contracts remain |
| 9 | Export a PNG | [S07E PNG export](S07E.md) | Approved backlog; export/destination contracts remain |
| 10 | Change a selected stroke’s appearance | [S05 Navigation and editing](S05.md) | Approved backlog; new restyling scope, design/contracts remain |
| 11 | Organize artwork into layers | Child milestone to scope before implementation | Approved backlog; new layer scope, design/schema contracts remain |

## 1. Create a saved drawing

From the gallery, create an automatically named blank drawing that survives closing and
reopening the app. Include creation feedback, failure handling, opening the new drawing and
E2E persistence verification. Exclude drawing tools, folders, cloud sync and import.
Approval does not waive the storage preservation/fencing blockers documented in
[the durable-library scope](../docs/reviews/durable-library-scope.md).

## 2. Draw with the shared editor

Create real solid round pen strokes through shared Rust editing semantics and web rendering.
Include width/color controls and reliable cancellation. Rust owns editing policy; the web host
owns input acquisition and presentation. Shared-editor foundations are part of this outcome.
Do not silently substitute a separate TypeScript editor. Before #4, communicate that artwork is
not saved; a durable blank record does not imply durable strokes. Native integration is separate.

## 3. Undo and redo edits

Provide session history: one completed stroke is one action; cancelled strokes create no
history. Follow the shared interaction guards and native text/IME priority. Do not persist the
Undo stack or claim session history survives reopening. Later editing actions use this history.

## 4. Save and reopen artwork

Connect the editor to durable storage. Preserve completed strokes and accepted settings across
reopening, with honest pending/saved/failure states. Respect revision-safe background saving,
recovery, navigation and ownership contracts. No cloud sync or external-file write-through.

## 5. Pan and zoom the canvas

Navigate artwork through supported pointer, touch and keyboard input without changing drawing
geometry or losing coordinate accuracy. Define platform-supported input explicitly; verify
interaction guards, cancellation on mapping changes, focus and viewport/render agreement.

## 6. Select and edit one stroke

Select, move, uniformly scale and delete one stroke. Integrate completed operations with
session history and saving; cancelled operations preserve previous artwork. Exclude multi-select,
rotation. Selected-stroke restyling belongs to #10.

## 7. Rename a drawing

Rename from the gallery and persist the name, with clear pending/success/failure feedback.
Follow approved naming and editor-ownership rules; do not report success before durable acceptance.
Depends on the durable library in #1. Concepts reference: CS-OBS-001.

## 8. Remove a drawing with Undo

Provide recoverable removal and in-place Undo under Linefield’s selected deletion policy.
No separate Trash screen. Define departure/finalization, restart recovery, busy-owner and
pending-save failures through the reviewed contracts before implementation. Depends on the
library and its recovery/ownership mechanisms. Concepts gallery research informs this task;
Linefield’s own removal policy controls its behavior.

## 9. Export a PNG

Export completed artwork with reviewed resolution/background options and reliable destination
handling. Preserve the selected snapshot, cancellation, recovery and publication contracts;
a rendered preview is not proof of successful publication. Depends on saved artwork and rendering.
Exclude other output formats and cloud sharing. Concepts reference: CS-OBS-018.

## 10. Change a selected stroke’s appearance

Change the selected stroke’s width or color as an undoable, saveable edit. Keep this separate
from settings for future strokes. Define preview/commit/cancel semantics before implementation.
Depends on #3, #4 and #6. Exclude opacity, brush replacement and multi-stroke restyling from this
outcome. Concepts reference: CS-OBS-011.

## 11. Organize artwork into layers

Create, rename, reorder, hide and lock layers. Defer automatic layering and layer effects.
This adds product scope; review layer identity, stroke membership, ordering, hidden/locked
behavior, history and storage changes before implementation. Define how selection and export
interact with layers. Do not infer layer deletion, opacity, grouping or blending from this approval.
Concepts reference: CS-OBS-015 (panel observed; layer operations were not exercised).

## Further candidates

The next batch is awaiting owner confirmation in conversation. Do not treat research observations
as approved Linefield requirements. Concepts research remains outside Git; retained finding IDs
can support proposals without importing captures or duplicating the research archive.
