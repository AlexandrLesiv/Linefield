# Clean successor app review plan

Status: review proposal copied into Linefield on 2026-10-16. The owner selected the name
Linefield and root /Users/oleksandr/projects/linefield and authorized documentation/folder
scaffolding only. No application implementation, Figma approval or runtime verification.
The current approval record is [decisions](../decisions.md). This packet is maintained
for the existing Linefield scaffold; application implementation remains unstarted.
Reference audit: Native Sketch at `3b580873ded3fea63d0220a53d7c5ece66c5d897`.

Build a smaller macOS application around selected, requalified Rust behavior. Start in
a separate repository and filesystem directory. Do not carry over the old application's
multiple command bridges, old platform implementations, or incomplete acceptance claims.
Linefield now has apps/ documentation placeholders for all planned hosts; see
[the current platform plan](../platforms.md). Portability is designed from day one, with
macOS features implemented first and other hosts afterward.
The benefit is a clear ownership model; the cost is rebuilding and revalidating integration,
including failures that the old application already learned to handle.

## Review packet

- [Architecture, ownership, threads and caching](architecture.md).
- [Reuse and discard inventory](reuse.md).
- [Native document and export options](formats.md).
- [Implementation tasks and acceptance criteria](delivery.md).
- [Separate project setup and future agent prompt](bootstrap.md).

This packet does not replace or mark complete tasks 018–024 in the old repository.
It is an alternative successor proposal. Review it before authorizing implementation.
The existing refactor's branch ancestry and compatibility requirements remain applicable
to that refactor; they are not requirements for a separately approved new repository.

## Confirmed product decisions

| Decision | Scope |
| --- | --- |
| First platform | macOS; Swift/AppKit controls and custom Skia canvas |
| Shared behavior | Rust commands, document, editing, geometry and persistence semantics |
| First release | Local developer preview; distribution is a separate milestone |
| Editing | Pen, pan/zoom, single-stroke selection, move, uniform scale, delete, undo/redo |
| Files | Open/save and recovery; new document format, no old-file compatibility |
| Boundary direction | Typed FFI with generated declarations; no custom command packets |
| Project isolation | Separate local project, old repository referenced read-only |
| Design gate | Owner approves identified Figma design before new UI/tools are implemented |
| Source policy | Maximum 200 physical lines per handwritten source/test/script file |

## Proposed preview boundary

Selected window scope (R02, 2026-10-16): one window with one editable drawing at a time;
independent session ownership, no tabs/multiwindow in this preview. Remaining behavior below
is proposed where not separately approved. Mouse and tablet pen input, pressure where
available, native menus/toolbar, brush width and existing-style macOS color control.
Space-drag/scroll pan, pinch/menu zoom; a single selected stroke can be dragged, uniformly
scaled or deleted. A transform is one undo operation, irrespective of preview updates.
Native field editing retains normal text shortcuts. Invalid field values stay editable.
Retain useful existing macOS behavior only after the designer specifies it explicitly.

New/Open, autosave, reviewed Save As, pending/failed persistence guards, cancellation and
recovery are part of the preview. Ordinary crash reopen uses SQLite recovery; explicit salvage/
recovery candidates preserve the source and open a separate library copy. App-managed library
retention and gallery-first S02L are selected; native-file exchange/manual Save details remain pending. Undo/Redo is session-only by owner choice (decision 10), cleared after successful return to gallery. No multiwindow support.

Defer rotation, multi-selection, layers, eraser, image import, document clipboard, text,
brush libraries, accounts/network sync, agent execution, collaboration, plugins, workbench,
and other platform applications. These are not implicit obligations of “clean architecture.”
Exports are a separate scope choice below; asking about their options does not approve them.

## Choices for owner review

| Choice | Recommendation | Alternative and consequence |
| --- | --- | --- |
| Working name and path | Selected: Linefield at `/Users/oleksandr/projects/linefield` | Documentation scaffold exists; no app implementation |
| Native format | Selected C: SQLite application document; concrete schema/lifecycle pending | Supersedes ZIP/JSON proposal; transaction, backup and provider behavior need review |
| Export scope | Native snapshot + PNG selected for preview (decision 18), after reliable save/recovery | SVG/PDF deferred; concrete contracts and Figma pending |
| Runtime | Selected A for macOS: main-thread editor/Skia, bounded background storage/logging and early measurement | Dedicated render/editor thread requires additional synchronization and new measured justification |
| Project structure | Selected B: four Rust crates with distinct responsibilities; concrete types/lifetimes still reviewed | Split further only for a demonstrated responsibility or build requirement |
| Preview environment | Available Apple Silicon Mac and its installed macOS; record exact versions | Intel and older-macOS certification belong to an explicitly expanded matrix |
| Interaction details | Single window; cancel active gestures on focus loss; Escape cancels or clears selection | Final controls, scale anchor and keyboard movement behavior need Figma handoff; keyboard nudging is not assumed |

Review of this packet can authorize the proposed architecture and scope. It does not approve
a future unshown ABI/schema or Figma version. S02 presents concrete contracts before their
implementation. Track approval by decision, document version and any conditions.

## Project identity

The owner selected **Linefield** and `/Users/oleksandr/projects/linefield`. The independent
documentation scaffold exists. Brand/domain availability has not been checked; distribution
identity review remains a separate milestone.

Current supplements: [contract catalog](../contracts.md), [shared E2E plan](../testing/shared-e2e.md)
and [session architecture audit](../architecture-decisions-audit.md). These organize the existing
proposal without approving concrete implementations or exports.
