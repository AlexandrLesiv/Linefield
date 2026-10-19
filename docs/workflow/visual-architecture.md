# Visual architecture documentation

Requested2026-10-19. Architecture work must explain structure and behavior visually even when
no new owner decision is needed. Preparing/updating documentation is not a new implementation
approval gate. Material ABI, schema, topology, security and product changes retain existing gates.
This plan introduces no new agent configuration, service, installed renderer or external upload.

## Current direction: generated native SVG

Decision239 selects shared data definitions and DTCG2025.10 style tokens. New diagrams use the
approved [v2 appearance](../design/diagram-style.md). Edit the shared definition and regenerate;
do not hand-edit generated SVG output. Schema views use the same renderer and style tokens.
See [diagram sources](../diagrams/README.md) and [schema authority](../database/README.md).

DTCG is the W3C Design Tokens Community Group's portable JSON format, not a W3C Recommendation.
[The published specification](https://www.designtokens.org/tr/2025.10/format/) defines types and
references; Linefield implements its documented subset, rejects unsupported input and does not
claim a general-purpose token processor. Style tokens are not database columns or runtime contracts.

SVG is the review/distribution artifact: selectable text, precise layout, scalable, offline and
GitHub-viewable. Shared data keeps diagrams consistent; hand-tuned layout coordinates remain in
versioned definitions. PNG is a secondary capture, never source authority. No external diagram
service, renderer package or duplicate diagram notation is required. Review snapshots
are available in Git at e08f304; changing presentation does not renew architecture approval.

## Planner responsibility and review

The current configured roles contain no separate technical-architecture planner. The lead fills
that responsibility with scoped specialists: rust_engine for semantics/ownership/typed boundaries,
database_designer for persistence/schema, platform engineers for adapters, rendering_performance
for rendering, and build_reliability for evidence/build flows. UI/UX reviews user-visible state,
navigation and visual readability; an independent reviewer checks architectural accuracy.
If a planner role is added later, give it this same deliverable contract without transferring
implementation authority or increasing concurrency automatically.

For each architecture task the planner must:

1. Identify the question and existing decision/CT/INV/task IDs; distinguish actual implementation,
   approved-but-unimplemented design, proposal and rejected/blocked alternatives.
2. Select the smallest useful views below. Explain why omitted views add no information; do not
   demand every diagram type for a small refactor or an editorial correction.
3. Deliver editable diagram source, SVG review export where available, a plain-text equivalent,
   tradeoffs, evidence links and unresolved questions. Name the accountable technical specialist.
4. Review arrows/ownership/failure paths with that specialist, render and inspect readability,
   then obtain fresh independent review for substantive architecture changes. Reviewer acceptance
   means accuracy of the packet, not owner approval or runtime proof.
5. Update documentation in the same change as the affected implementation/contract, or explicitly
   mark the diagram stale with the task that will reconcile it. Do not silently retain false arrows.

## What to draw

| View | Must answer | Linefield starting point |
| --- | --- | --- |
| System context | Who uses it, local versus external resources, actual versus future hosts | Web now; macOS next; future hosts/cloud labeled planned, no implied networking |
| Components and execution | Which thread/process/worker owns mutation, which boundaries copy data | UI, Rust owner, SQLite adapter, VFS/proxy; native topology separate from browser |
| Data ownership and lifetime | What is durable, session state, viewport or disposable cache; who releases it | Document/catalog/receipts versus tool state and render caches |
| Sequence | Ordering, transaction/commit point, acknowledgement, cancellation and failure | Create/name reservation, Rename + delayed catalog projection, Open/navigation |
| State machine | Legal transitions and meaning of pending, unknown, durable, failed | Creation recovery and later removal-scope departure; no happy-path-only diagram |
| Trust and recovery | Untrusted input, authority validation, lost ownership, preservation before repair | Hostile files, browser eviction, stale workers, corrupt pool metadata |
| Dependency/build/deployment | What is compiled/generated/served, what is trusted and versioned | Rust/Wasm vs JS/Vite, generated bindings, isolation headers; future native builds |

Use C4-style levels of zoom for context/components without introducing a C4 tool dependency.
Avoid a full class diagram or every platform permutation before actual reuse exists. A diagram
is explanatory; typed contracts, executable migrations and test results remain their own authority.

## Decision record and file layout

Keep `docs/decisions.md` as the canonical owner-decision log; do not create a competing approval
registry or renumber historical decisions. Detailed topic packets live under
`docs/architecture/<topic>-vN/`, linked from an architecture index. Existing packets can remain
at their current paths; link shared source definitions for diagrams.
Suggested new packet layout: `README.md`, `context.svg`, `ownership.svg`, `create-sequence.svg`.
For an explicitly chosen generated-format exception retain its source too.
Use meaningful filenames, not numbered diagram fragments.

Each packet records: question/context; selected or proposed option; alternatives/tradeoffs;
status and date; accountable role; affected decision/CT/INV/task/scenario IDs; diagram legend;
source revision/hash; renderer/version/settings for generated exports; technical review/evidence;
owner approval reference only when actually required and received; superseded/superseding links.
Include what would invalidate the choice, migration/rollback implications and known evidence gaps.

Record policy approval, mechanism approval, implementation and verification separately. For
example, browser-local risk posture is approved while both tested VFS candidates remain blocked.
An attractive diagram must not turn the latter into an approved implementation.

## Visual conventions and checks

- One question per diagram; split crowded views. Put scope/status/version visibly in the title.
- Label every meaningful arrow with its action/data and synchronous/asynchronous character.
  Outline process/thread/trust/transaction boundaries distinctly and provide a legend.
- Mark the sole mutation owner, copied versus borrowed data, lifetimes and durable commit point.
  Show at least the relevant cancellation, unknown-outcome or failure path alongside success.
- Use words plus shape/line style for status; never color alone. Keep text selectable, readable
  at ordinary size, and unclipped. Include SVG title/description and a Markdown text summary.
- Prefer simple self-contained SVG with no scripts, remote fonts/images or active embedded HTML.
  Treat imported diagram files as untrusted; inspect before embedding. Do not expose paths,
  credentials, personal drawings or private research captures in examples.
- Check source/export correspondence, links and decision IDs; inspect the rendered result after
  changes. Renderer upgrades are separate from semantic edits when possible to isolate churn.
  Generated output is excluded from handwritten source limits; authored sources retain applicable
  repository limits. Do not add an unimplemented test/gate to a passing-check list.

## Rollout and first diagram backlog

1. Add a small architecture index linking existing authoritative packets; no historical rewrite.
   Start with context and ownership views of the current prototype versus proposed durable service.
2. Illustrate the current storage blockers: parent/proxy ownership gap and the observed destructive
   SAH-pool initialization. Show observed facts separately from hypothesized fault paths.
3. Add Create/Rename/recovery sequences and an empty-library state diagram to the concrete approval
   packet. Link the existing hosted schema instead of exporting a duplicate ER diagram.
4. Add deletion Stage/Undo/departure and regional engine views when those slices advance; defer
   detailed native deployment and future cloud internals until their contracts are actually scoped.
5. With style approval recorded and representative diagrams available, consider a small local SVG
   validation/render command under existing Node tooling conventions. No external diagram renderer is required.

Routine diagrams of already-approved behavior need no new owner approval. Present new material
architecture choices with their diagrams before implementation under existing gates. This rule
does not turn documentation refreshes into permission requests or waive substantive review.
