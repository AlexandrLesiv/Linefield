# Native SVG migration — diagram style v2

Prepared 2026-10-19 after the owner approved style v2 and the task / branch / PR workflow.
This is a notation and documentation migration, not architecture implementation or new scope.
The starting source inventory contains **16 Mermaid blocks in 11 Markdown files**, plus two
new workflow views. Earlier “12 files” estimates were not the actual inventory.

Style: [v2 specification](../design/diagram-style-v2.md), retaining v1 semantic conventions.
Each new SVG is its own editable source. No renderer dependency, external assets or remote font
was added. Diagrams keep text selectable, title/description, 14 px minimum type, opaque light
canvas and explicit status. View at full size; a thumbnail is not the complete readable artifact.

## Source-to-artifact map and text equivalents

Block numbers are one-based within the named source file at migration start. This inventory
remains useful after the lead replaces the Markdown fences with SVG links and text summaries.
Original decision snapshots and prior diagram comparison/style artifacts remain unchanged.

| Original source / block | Native SVG | Status and text equivalent |
| --- | --- | --- |
| [Developer experience](../developer-experience.md), 1 | [Developer evidence flow](v2/developer-evidence-flow.svg) | Mixed implementation/planning: Zed and terminal enter the Node action layer; tool outputs become evidence; future local/CI views consume reports and task/decision/design records. Future Cargo/Xcode integration is not claimed implemented. |
| [Git strategy](../workflow/git-strategy.md), 1 | [Git integration loop](v2/git-integration-loop.svg) | Approved workflow: reviewed main → bounded branch → work/tests → specialist/fresh review → exact candidate verification → owner integration approval → updated main → next task. Setup and actual integrations are tracked separately. |
| [Successor architecture](../successor/architecture.md), 1 | [Historical host composition](v2/historical-successor-components.svg) | Historical native proposal: input → Swift adapter → generated native ABI → engine/services/renderer; services and renderer use the engine; renderer targets AppKit surface; immutable projection/native effects return to the adapter. This is not the full current IPC topology. |
| [Successor architecture](../successor/architecture.md), 2 | [Historical tool states](v2/historical-tool-states.svg) | Historical sketch: Idle admits Drawing, Transforming or Panning; samples/preview self-update; release commits one Undo for drawing/transforms; Escape/focus loss cancels; navigation ends/cancels. Its predicted-sample wording is preserved as history, not adopted initial-preview behavior. |
| [Successor architecture](../successor/architecture.md), 3 | [Historical native execution](v2/historical-native-execution.svg) | Historical main-thread owner view: AppKit → Rust validation → immutable editor revision → frame → Skia; owned snapshots go to the bounded file worker; typed completions return to state; structured logs drain separately; GPU execution is asynchronous. |
| [Recovery v2](../architecture/recovery-v2.md), 1 | [Recovery authority](v2/recovery-authority.svg) | Approved design181, not implementation: Host B uses an authenticated bounded mailbox to reach Host A's authoritative coordinator; immutable save batches enter storage; bounded completion/readiness returns; diagnostics remain redacted and bounded. |
| [Recovery v2](../architecture/recovery-v2.md), 2 | [Durable acknowledgement](v2/recovery-durable-ack.svg) | All 11 original messages remain ordered: validate command/capacity, report Accepted-not-Saved, persist changes/revisions/receipts against a checked base, acknowledge durable identity, reject stale completion and acknowledge incorporated outcomes. Commit may fail or be unknown. |
| [Recovery v2](../architecture/recovery-v2.md), 3 | [Reconnect states](v2/recovery-reconnect.svg) | Attached → Paused → Discovering; unavailable/held authority returns to Paused; verified takeover reloads and reconciles; known outcomes and retained unknown work permit Attached with fresh history; invalid data/authority requires recovery. |
| [Incremental collaboration](../architecture/incremental-collaboration.md), 1 | [Incremental coordination](v2/incremental-coordination.svg) | Approved policy, gated implementation: two local clients send typed operations to one Rust coordinator and receive ordered outcomes; bounded SQLite persistence returns durable acknowledgements. Future cloud receives coherent snapshots/conditional publication, not a current sync implementation. |
| [Ownership/rename v1](../architecture/ownership-rename-v1.md), 1 | [Historical ownership states](v2/historical-owner-states.svg) | Historical v1: explicit acquisition reaches InUse or Loading; validated load edits; close settles or returns to Editing; open failure releases; poisoned/lost ownership pauses and preserves work for recovery. Current multi-client design supersedes its exclusive-client framing. |
| [Ownership/rename v1](../architecture/ownership-rename-v1.md), 2 | [Historical rename sequence](v2/historical-rename.svg) | All 8 original messages remain: authenticated request, dispatcher guards, durable name/revision/receipt, then catalog projection and committed/projection status. A projection failure does not undo the drawing commit. Historical where v2 differs. |
| [Internationalization](../internationalization.md), 1 | [Localization boundaries](v2/localization-boundaries.svg) | Host numeric parsing fully validates before typed Rust commands; stable typed results plus locale resources feed presenters; UI text/numbers/accessibility localize; document data stays locale-independent. Shared generation exists; native runtime adoption is not implied. |
| [Native feasibility](../architecture/native-feasibility-v1.md), 1 | [Historical discovery option](v2/historical-native-discovery.svg) | Historical unselected option A: App A registers an anonymous endpoint with a discovery-only broker; App B requests it, then speaks directly/authenticated to A; A is the sole drawing writer. No broker installation or authority transfer is claimed. |
| [Shared E2E](../testing/shared-e2e.md), 1 | [Shared E2E execution](v2/shared-e2e.svg) | Planned shared contract: scenario/fixture catalogue fans out to five host-driver groups; actual UI execution feeds shared semantic plus platform checks and a common report. This is not a universal implemented runner or native acceptance claim. |
| [S02 database/interfaces v1](../reviews/S02-database-interfaces-v1.md), 1 | [Historical storage boundaries](v2/historical-storage-boundaries.svg) | Historical execution flow: AppKit → ABI → Rust model → Skia/native canvas; immutable jobs enter background storage, which touches drawing/catalog/export-job files and returns bounded completions. It shows database-file boundaries, not schema relationships. |
| [Deletion v4.1](../database/deletion-v4/proposal.md), 1 | [Gallery departure](v2/gallery-departure.svg) | Preserves all 11 messages: stage exact scope/target, durable Undo, prepare destination, commit exact removal set, accept route only on known commit, reconcile Unknown, then retry identity-checked physical cleanup. Schema approval237 does not clear the unimplemented storage/cleanup mechanism. |

## New workflow views

- [Task / PR lifecycle](v2/task-pr-lifecycle.svg): ready task → branch/chat → scoped work →
  internal review and one PR → owner review/merge → integration verification → next prompt.
  Owner comments loop back to the same task/branch/PR. Missing authority/dependencies/evidence
  stop dependent work. Only an approved publication destination permits pushing/opening a PR.
- [Next-chat handoff](v2/next-chat-handoff.svg): verify the owner's completion report against
  actual repository, destination, merged state and SHA; compare tested/integrated content and
  run affected checks. Verified completion permits a concise next-ready-task prompt. Otherwise
  keep integration pending. A replacement chat for an interrupted task reuses its branch/PR
  after the old writer stops and checkout ownership transfers; it is not a new task.

## Semantic preservation and exceptions

The diagrams simplify sentence wrapping, not authority or event order. State diagrams with
long guards use numbered transitions and a full on-sheet key; transition numbers identify
edges, not execution ordering. The source initial markers are stated explicitly in their
initial-state card and transition key. Parallel edges with the same endpoints share a route
only when every distinct trigger remains separately listed. Reply arrows are solid under v2;
dashed guides mean participant lifetime only. A future/proposed path is written as such.
In dense historical views, a small background gap at a crossing separates independent routes;
it is not a junction or an additional relationship. Directed endpoints remain authoritative.

The S02 database/interfaces block is a **flowchart**, not an ER diagram. Its replacement shows
three database-file boundaries only. DBML/layout and hosted dbdocs retain schema authority;
no physical ER export, schema publication or replacement was performed.

The deletion source's old header says schema approval is absent. Decision237 and the current
handoff supersede that stale statement; the SVG labels schema approval separately from proposed
mechanisms. This notation migration does not alter approved schema content or infer production
deletion permission. The lead may reconcile current-status prose while retaining original
approval/evidence snapshots.

Existing native-gallery/drawing-screen mockups, the liked first SVG comparison and v1/v2 style
approval artifacts are historical design assets, not active Mermaid diagrams. They are not
mass-restyled or reinterpreted as new application designs. This set does not add a permanent
architecture planner agent or change concurrency rules.

## Review and evidence

The lead renders the new artifacts and checks links/source placement; the designer inspects
representative and dense views; fresh independent review checks semantic fidelity and statuses.
XML/source-size checks are appropriate; application tests are not evidence for documentation
notation. Record exact file hashes and rendered artifacts in the migration evidence packet.
Missing or uninspected renders remain gaps until recorded. Diagram completion does not close
storage adoption, native integration, language review, security or product implementation gates.

Designer verification on 2026-10-19: all 18 initial renders inspected; ambiguous independent
routes and the workflow failure/verification branches were corrected. All 18 were rendered
again using a fresh headless Chrome page per SVG, waiting for fonts and two animation frames;
changed diagrams and the footer-capture regression were visually rechecked. No text overflow
or pairwise text-box overlap was reported. XML validation passed; each SVG is below 200 lines.
[Render manifest](../../quality/bootstrap-v1/diagram-renders.json) records exact source and local
preview hashes. Captures are local review artifacts, not native accessibility/runtime evidence.
An initial sandboxed Chrome launch failed; scoped approved headless execution completed. No
foreground UI, remote publication or application behavior was involved. Independent integration
review remains the lead's responsibility; designer inspection is not a user study.
