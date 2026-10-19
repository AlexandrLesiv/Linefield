# Product backlog

This list records owner-approved functionality and priority. Positions 1–45 were explicitly
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
| 12 | Select multiple strokes | [S05 Navigation and editing](S05.md) | Approved backlog; selection contracts/design remain |
| 13 | Rotate selected artwork | [S05 Navigation and editing](S05.md) | Approved backlog; transform contracts/design remain |
| 14 | Save reusable color palettes | Child task to scope before implementation | Approved backlog; palette ownership/storage/design remain |
| 15 | Adjust stroke opacity | [S03 Pure editor](S03.md), [P05 Web](P05.md) | Approved backlog; rendering/editing contracts/design remain |
| 16 | Smooth new strokes | [S03 Pure editor](S03.md), [P05 Web](P05.md) | Approved backlog; algorithm/input contracts/design remain |
| 17 | Choose paper and background | Child task to scope before implementation | Approved backlog; appearance/storage/export design remains |
| 18 | Display a canvas grid | Child task to scope before implementation | Approved backlog; grid types/mapping/settings design remains |
| 19 | Snap while drawing and editing | [S05 Navigation and editing](S05.md) | Approved backlog; target/admission/precision contracts remain |
| 20 | Draw with precision guides | Child task to scope before implementation | Approved backlog; straight-line guide design/contracts remain |
| 21 | Measure artwork to scale | Child task to scope before implementation | Approved backlog; units/scale/numerical contracts remain |
| 22 | Duplicate a drawing | [S02L Library](S02L.md) | Approved backlog; copy/identity/storage contracts remain |
| 23 | Duplicate selected artwork | [S05 Navigation and editing](S05.md) | Approved backlog; copy/placement/history design remains |
| 24 | Import an image reference | [S06 Files and recovery](S06.md) | Approved backlog; image/security/storage contracts remain |
| 25 | Define artboard dimensions and export region | [S07E PNG export](S07E.md) | Approved backlog; bounds and outside-artwork behavior remain to review |
| 26 | Save reusable drawing objects | Child task to scope before implementation | Approved backlog; local object storage/design contracts remain |
| 27 | Sample colors from artwork | Child task to scope before implementation | Approved backlog; sampling/color/design contracts remain |
| 28 | Group selected strokes | [S05 Navigation and editing](S05.md) | Approved backlog; grouping/transform/storage design remains |
| 29 | Erase portions of strokes | [S03 Pure editor](S03.md), [P05 Web](P05.md) | Approved backlog; segment geometry/history/design remains |
| 30 | Add curved and shaped guides | Child task to scope before implementation | Approved backlog; guide geometry/design contracts remain |
| 31 | Add text labels | Child task to scope before implementation | Approved backlog; text/input/font/storage contracts remain |
| 32 | Rotate the canvas view | [S05 Navigation and editing](S05.md) | Approved backlog; viewport/input/design contracts remain |
| 33 | Customize keyboard shortcuts | [S00F Input contracts](S00F.md) | Approved backlog; binding/conflict/settings design remains |
| 34 | Adjust layer opacity | Child task to scope before implementation | Approved backlog; compositing/storage/design contracts remain |
| 35 | Duplicate and merge layers | Child task to scope before implementation | Approved backlog; appearance/history/storage contracts remain |
| 36 | Mask artwork nondestructively | Child task to scope before implementation | Approved backlog; mask/render/storage design remains |
| 37 | Reshape existing strokes | [S03 Pure editor](S03.md), [P05 Web](P05.md) | Approved backlog; deformation/transaction design remains |
| 38 | Recognize drawn shapes | Child task to scope before implementation | Approved backlog; shape inventory/recognition design remains |
| 39 | Import PDF references | [S06 Files and recovery](S06.md) | Approved backlog; decoding/scale/asset contracts remain |
| 40 | Export SVG | Child task to scope before implementation | Approved backlog; format/fidelity/publication contracts remain |
| 41 | Save pen presets | Child task to scope before implementation | Approved backlog; preset ownership/storage/design remains |
| 42 | Configure touch and stylus actions | [S00F Input contracts](S00F.md) | Approved backlog; capability/binding/design contracts remain |
| 43 | Focus on one layer | Child task to scope before implementation | Approved backlog; presentation/input design remains |
| 44 | Export an editable Linefield file | [S06 Files and recovery](S06.md) | Approved backlog; format/snapshot/publication contracts remain |
| 45 | Import an editable Linefield file | [S06 Files and recovery](S06.md) | Approved backlog; validation/versioning/import contracts remain |

## Visual and interaction design approval

Backlog approval confirms functionality and order, not visual design approval. Before implementing
new feature UI, ui_ux_designer prepares its layout, interactions, adaptive states, themes,
English/Ukrainian, accessibility/focus and motion/reduced-motion behavior. Present concrete
review artifacts and identify their source commit/version for owner approval. Record the exact
approved scope in the executable task. Follow [design workflow](../docs/design/workflow.md).
Existing approved components/screens may be reused within their approved scope; they do not
approve unseen states or new behavior. Design prototypes are review artifacts, not production
implementation approval. Designer review and independent review cannot replace owner approval.
Keep current authored specifications in Git; generated previews/captures stay ignored or in PR
attachments. After implementation, verify fidelity and E2E behavior against the approved design.

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
session history and saving; cancelled operations preserve previous artwork. Exclude multi-select and
rotation from this slice. Selected-stroke restyling belongs to #10.

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

## 12. Select multiple strokes

Lasso-select strokes, add/remove strokes from selection, and move, uniformly scale or delete
selected strokes together. Respect locked layers. Depends on #6 and #11; define hit testing,
selection feedback and atomic history/save behavior. Partial-stroke selection is not included.
Concepts reference: CS-OBS-010 (controls observed; multi-selection was not exercised).

## 13. Rotate selected artwork

Rotate one or multiple selected strokes with undoable, saved results. Canvas rotation stays
separate. Depends on #12 and reviewed transform precision/pivot/interaction semantics.
Concepts reference: CS-OBS-010 (rotation affordance observed; rotation was not exercised).

## 14. Save reusable color palettes

Create named palettes, add/remove colors, and apply a swatch to the pen or selected artwork.
No branded palette dependency. Review palette ownership and durability separately from drawing
colors; specify selection application and Undo behavior. Depends on #10 and, where multiple
selected strokes are supported, #12. Concepts reference: CS-OBS-009.

## 15. Adjust stroke opacity

Set opacity for future strokes or change selected strokes, with clear previews and Undo for
artwork edits. Depends on history, saved artwork and selected-stroke editing. Review canonical
alpha/compositing, preview/commit/cancel and multi-selection behavior. Layer opacity is excluded.
Concepts reference: CS-OBS-005; selected-stroke opacity is a Linefield proposal, not a tested
observation from that study.

## 16. Smooth new strokes

Provide optional adjustable smoothing for newly drawn strokes. Preserve cancellation and
responsive input; do not reshape existing artwork automatically. Depends on shared input/geometry
contracts and bounded performance evidence. The earlier unfiltered pen remains the baseline;
backlog approval does not select a smoothing algorithm or change existing stroke geometry.
Concepts reference: CS-OBS-006; the observed slider mismatch remains inconclusive.

## 17. Choose paper and background

Set a drawing’s background color or paper appearance independently of application theme.
Review available paper treatments and persisted settings; no Concepts textures/assets are reused.
Define preview, acceptance and export behavior with #9. This expands the earlier fixed-background
scope; it does not approve a concrete new appearance or schema. Concepts reference: CS-OBS-013.

## 18. Display a canvas grid

Choose grid type and spacing, show/hide the grid, and save its settings. Snapping is separate.
Review the supported grid inventory, coordinate mapping, zoom behavior, contrast and export
inclusion without altering artwork geometry. Depends on #4 and #5.
Concepts reference: CS-OBS-013 (settings inspected, not exercised).

## 19. Snap while drawing and editing

Optional snapping to grid points and eligible artwork points, with clear target feedback.
Depends on #18 and the relevant drawing/editing operations. Define eligible targets, tolerance,
priority and interaction/precision semantics before implementation; do not infer shape recognition
or automatic completion. Cancellation preserves prior artwork and creates no history.
Concepts reference: CS-OBS-016 (options inspected; accuracy not tested).

## 20. Draw with precision guides

Start with a straight-line guide for constrained pen strokes. Review placement, adjustment,
constraint behavior and interaction with #19. Additional guide shapes remain separate scope.
Use shared editing semantics and preserve the approved stroke transaction/cancellation rules.
Concepts reference: CS-OBS-016 (Line guide control observed; operation not exercised).

## 21. Measure artwork to scale

Choose units and drawing scale, then measure distances. Review exact numeric representation,
regional formatting, scale conversion, precision limits and saved settings before implementation.
Clarify measurement endpoints and feedback through owner design review; do not infer persistent
dimension annotations, areas or automatic geometry rescaling. Depends on navigation and relevant
precision contracts. Concepts reference: CS-OBS-013/016 (measurement controls inspected only).

## 22. Duplicate a drawing

Create an independent library copy with its own identity while preserving the original.
Review coherent source revision capture, naming, failure/cancellation and resource ownership.
Depends on durable artwork (#4); shared storage references must not make edits to one copy
mutate another. Concepts reference: CS-DOC-011 (documented, not exercised in the device study).

## 23. Duplicate selected artwork

Copy selected strokes within the drawing, then position the copy; support Undo and saving.
Depends on #12 and shared editing/history. Define when duplication commits and how placement
cancellation behaves before implementation. No cross-drawing clipboard behavior is implied.
Concepts reference: CS-DOC-016 (documented, not exercised).

## 24. Import an image reference

Import a local PNG/JPEG as a copy, position/scale/rotate it, and retain it with the drawing.
No external-file write-through. Review decoding/resource bounds, durable asset ownership,
color handling, transforms and failure/cancellation. Depends on saved artwork and appropriate
layer/render integration. PDF, camera acquisition and remote image retrieval are excluded.
Concepts reference: CS-DOC-021; CS-OBS-012 inspected import options without importing a file.

## 25. Define artboard dimensions and export region

Define artboard dimensions and use the artboard as an export region. This is the owner-revised
scope: orientation controls and preservation/deletion of artwork outside the region were not
confirmed as Concepts observations and are not settled by this approval. Review outside-artwork
behavior explicitly before implementation; do not infer permission to delete or crop stored art.
Depends on #9 and reviewed coordinate/dimension semantics. Concepts references: CS-OBS-013
(dimensions/presets inspected) and CS-OBS-018 (Artboard export option observed); artboard changes
and outside-artwork behavior were not exercised.

## 26. Save reusable drawing objects

Save selected strokes as named reusable objects and insert independent copies into drawings.
Local library only; no marketplace or sharing service. Depends on selection and duplication.
Review object identity, storage, naming and insertion/Undo behavior; no linked instances,
automatic propagation, asset packs or proprietary Concepts assets are implied.
Concepts reference: CS-DOC-024; CS-OBS-017 inspected the library without inserting objects.

## 27. Sample colors from artwork

Pick a color from visible artwork for subsequent strokes. Review transparency/background
sampling explicitly, including canonical color conversion and preview/accept/cancel behavior.
Do not infer retrieval of other stroke properties or application to existing artwork.
Concepts reference: CS-DOC-015 (documented; sampling was not exercised in the device study).

## 28. Group selected strokes

Group and ungroup strokes so they can be selected and transformed together, with Undo and
saving. Depends on #12 and #13; review group identity, membership, transform behavior and
interaction with layers. Nested groups and cross-layer grouping are not implicitly selected.
Concepts reference: CS-DOC-016 (documented, not exercised).

## 29. Erase portions of strokes

Remove intersected vector segments with a Slice-style tool. Support Undo; nondestructive
masking stays separate. Review hit geometry, resulting stroke identities/styles, atomic
commit/cancel and saving. Respect locked layers and shared active-interaction guards.
Concepts reference: CS-DOC-013 (documented, not exercised).

## 30. Add curved and shaped guides

Extend #20’s straight-line guide with arc, ellipse and rectangle guides. Automatic shape
recognition remains separate. Review placement, constraints, precision and interaction with
snapping; preserve shared stroke/history/cancellation semantics. No additional guide inventory
is approved by this outcome. Concepts reference: CS-DOC-019 (documented, not exercised).

## 31. Add text labels

Create and edit text, position it on the canvas, and preserve it through saving and PNG export.
Include native text input and English/Ukrainian support. Review text/font representation,
layout fidelity, IME/focus, native text Undo priority and export portability before implementation.
No rich-text editor, arbitrary font embedding or text-to-path conversion is implied.
Concepts reference: CS-DOC-013 (documented, not exercised).

## 32. Rotate the canvas view

Rotate the view while drawing, with reset to upright. Preserve artwork coordinates; keep
viewport rotation separate from selected-artwork rotation (#13). Review gesture admission,
coordinate mapping and cancellation rules; this approval does not waive existing active-stroke
navigation guards or implicitly allow simultaneous rotation and stroke input.
Concepts reference: CS-DOC-017 (documented; direct multitouch was not exercised).

## 33. Customize keyboard shortcuts

Assign shortcuts to supported actions, detect conflicts and restore defaults. Preserve system
shortcuts and text/IME priority. Review per-platform bindings, held/repeated input, interrupted
key state and settings persistence; no new action becomes approved merely by exposing a binding.
Concepts reference: CS-OBS-014 (shortcut editor inspected, settings not changed).

## 34. Adjust layer opacity

Change a layer’s opacity without rewriting individual stroke colors or opacity. Preserve the
setting in saving and export. Depends on #11; review compositing, history, preview/commit/cancel
and interactions with hidden/locked layers and stroke opacity (#15). Blend modes are separate.
Concepts reference: CS-DOC-020 and CS-OBS-015 (opacity control observed, not exercised).

## 35. Duplicate and merge layers

Duplicate a layer independently or merge layers with reviewed appearance preservation and
Undo behavior. Depends on #11 and #34; review membership, identity, ordering, opacity, lock/hidden
states, grouping, image/text content and durable atomicity. Do not silently rasterize editable
content or claim appearance equivalence before defining and verifying the supported cases.
Concepts reference: CS-DOC-020 (documented, not exercised).

## 36. Mask artwork nondestructively

Hide parts of artwork without deleting underlying geometry. Support Undo, saving and export.
Review mask ownership, layering/compositing, editing and format-specific fidelity before
implementation; keep masking separate from segment deletion (#29). Do not assume every output
format can preserve mask semantics. Concepts reference: CS-DOC-013 (documented, not exercised).

## 37. Reshape existing strokes

Provide a Nudge-style tool for local stroke reshaping, with cancellable previews and Undo.
Review deformation geometry, bounds, pressure/style preservation, saved representation and
interaction with selection/locked layers. No automatic reshaping or replacement of original
stroke geometry before acceptance. Concepts reference: CS-DOC-013 (documented, not exercised).

## 38. Recognize drawn shapes

Optionally convert draw-and-hold gestures into supported geometric shapes. Review the supported
shape inventory and acceptance/cancellation behavior before implementation. Preserve regular
freehand drawing when recognition is disabled and define interaction with smoothing/guides.
No recognition algorithm or universal shape inventory is selected by backlog approval.
Concepts reference: CS-DOC-019 (documented, not exercised).

## 39. Import PDF references

Import selected PDF pages as local references, position them and preserve reviewed scale.
No PDF text editing. Review decoder isolation/resource bounds, page dimensions, asset ownership,
fidelity, cancellation and restart behavior; import as copies without source-file write-through.
PDF export, page reauthoring and embedded active content execution are not included.
Concepts reference: CS-DOC-023 (documented, not exercised).

## 40. Export SVG

Export supported artwork as vectors with explicit handling of features that cannot retain
appearance or editability. Review the supported feature matrix, text/images/masks, conversions,
resource bounds and destination publication. Do not silently promise lossless export or
round-trip editing. Reuse approved export lifecycle semantics where applicable.
Concepts reference: CS-DOC-022 (documented; SVG export was not exercised).

## 41. Save pen presets

Save and recall named combinations of width, color, opacity and smoothing. No new brush types.
Depends on #15 and #16; review preset ownership/storage, naming and application during eligible
interaction states. Applying a preset must not implicitly restyle existing artwork.
Concepts references: CS-DOC-005/008; exact Linefield preset combinations are an adaptation.

## 42. Configure touch and stylus actions

Choose supported finger/stylus actions and shortcut-button mappings. Preserve visible controls
and respect platform capabilities, system preferences, native text/IME priority and shared
interaction guards. Review conflicts with keyboard bindings (#33), device absence and settings
persistence. No unsupported hardware parity or new native host implementation is implied.
Concepts references: CS-DOC-009/025 (documented; hardware behavior not physically verified).

## 43. Focus on one layer

Temporarily emphasize the active layer and dim other artwork without changing saved artwork
or export appearance. Depends on #11; review selection/hit testing, hidden/locked states,
entry/exit and accessible contrast. Focus is presentation state, not layer opacity (#34).
Concepts reference: CS-DOC-020 (documented, not exercised).

## 44. Export an editable Linefield file

Export a coherent drawing snapshot in Linefield’s own format, preserving supported editable
content. Review versioning, asset inclusion, resource bounds, destination publication and
failure/cancellation. Follow selected immutable snapshot and export lifecycle policies where
applicable; no Concepts-file or legacy-project compatibility is implied.
Concepts reference: CS-DOC-022 (native-format exchange workflow, not Linefield format authority).

## 45. Import an editable Linefield file

Validate and import as an independent library copy. Preserve source bytes and handle unsupported
versions or damaged files safely. Review captured source consistency, new identity assignment,
asset/resource validation and atomic admission before implementation. No automatic source-file
write-through or silent repair. Depends on the reviewed format in #44 and durable library.
Concepts reference: CS-DOC-021; Linefield’s selected import-as-copy policy controls behavior.

## Further candidates

The next batch is awaiting owner confirmation in conversation. Do not treat research observations
as approved Linefield requirements. Concepts research remains outside Git; retained finding IDs
can support proposals without importing captures or duplicating the research archive.
