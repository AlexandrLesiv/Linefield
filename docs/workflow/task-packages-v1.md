# Task packages v1 — pilot contract and review preview

Owner authorized the task documentation system, schema/pilot conversion, visual preview and PR/test
links on 2026-10-19. DX-T02 implements this bounded slice. The proposed visual layout awaits owner
review. No workbench command service, task editor, auto-approval, bot, CI publishing or product UI
is introduced. All legacy task documents and evidence remain byte-preserved.

## One task entity, several views

A package at tasks/ID contains task.json and authored brief.md. Its manifest indexes scope,
authority, security, dependencies, documents, acceptance, test references, evidence and handoff.
TASK.generated.md is a compact agent reading view. docs/workflow/task-preview contains generated
read-only HTML pages and a two-task index. Generated views are never edited by hand.

P05-S01 is the delivered/owner-review leaf pilot. S02L is the blocked milestone pilot. These are
supplemental conversions: the full original task documents remain linked and retain all extended
requirements. The pilot does not claim every historical policy has been normalized into a field.
Milestones own no implementation branch; children each own one branch/PR. Completed milestone
aggregation is deliberately unsupported by the v1 validator. Wider migration follows review.

Use pnpm tasks:generate, tasks:check and tasks:test for generation, drift and unit checks.
Use pnpm tasks:browser for headless preview scenarios. pnpm tasks:preview opens a loopback-only
read-only server and prints its URL; open that URL in a browser. Ctrl+C stops it. HTML can also be
opened directly. No task-defined command, browser script or endpoint can execute checks or mutate
approval. Server routes contain only generated pages, never arbitrary repository files.

## PR and test linking

The task's PR record stores repository, number, URL, observed state/time and revisions. Validation
requires URL identity agreement. The PR description includes Task-ID and Task-Package entries,
creating a backlink to the task. Owner review/merge happens in GitHub. Observations are snapshots,
not live synchronization; generation never accesses GitHub or changes PRs. The new DX-T02 task
uses its legacy brief during bootstrap; later converted tasks use the package path.

Each acceptance criterion links stable test IDs and evidence IDs. A test entry records its layer,
implemented/planned/manual state, source path and selector. Existing browser and root results are
linked, not rerun by viewing the task. Planned native scenarios have no executable path/selector.
This verifies reference consistency and file existence; it does not discover tests, parse every
runner format, prove a selector resolves or infer semantic coverage. Runner adapters can follow
as a separate bounded slice. Test links and source are ordinary read-only links, not launchers.

Done requires a merged PR observation and a matching integration revision with passed integration
evidence. The validator checks declaration consistency, not whether a human approval or remote
merge really happened. Required missing/failed/stale evidence still blocks completion under policy;
a well-formed record is never authorization. Reviewers must assess each required criterion.

## Evidence identity, safety and preservation

Every linked document/evidence file has a SHA-256. artifactRevision identifies its immutable Git
location when known; null means mutable authored source and is labelled accordingly. sourceRevision
and sourceManifest describe the original tested inputs separately. Imported results stay historical:
checking artifact bytes does not compare tested inputs with this checkout or a future merge.
Raw reports, retries, original screenshots and unresolved failure canaries remain at their existing
locations. Generated pages show recorded outcomes with their limitations, never a combined green
completion score. Large/binary artifacts are linked; text previews are capped and marked if cut.

The reader rejects missing files, lexical escapes, symlinks, nonregular files, excessive size and
hash mismatches. It assumes a trusted selected repository root and quiescent source files; this is
not a sandbox against a hostile concurrent filesystem. Rendering escapes HTML and Markdown data.
HTML has no scripts, remote assets, embedded active markup or command execution; CSP is defense
in depth. Only reviewed public task inputs belong in a published page. Path/hash validation is NOT
secret detection or a publication allowlist. Never reference private captures, credentials or
ignored backups merely because they are in the repository. Preserve them locally.

Generated pages must match the package inventory: stale pages left by removed/renamed packages
fail validation. No automatic deletion is performed. Review and remove only the obsolete generated
view explicitly; never delete authored records/evidence as a side effect. Multi-file generation
uses per-file replacements, not an atomic transaction; drift checks detect interrupted generation.

## Design and migration

Preview uses the approved diagram DTCG palette/type/radius tokens in a static document stylesheet.
The task page is semantic HTML with headings, anchors and native disclosures. This documentation
renderer is separate from apps/web; no application styling or language behavior changes. The v1
review preview is English documentation, not an English/Ukrainian product-screen acceptance claim.

Start from the attention banner, then scope, PR, acceptance/test links, evidence, design documents,
independent review and handoff. Small screens stack navigation and sections; keyboard users retain
native links/details and visible focus. Prose rendering is deliberately conservative: Markdown is
shown as escaped readable text with basic heading/paragraph treatment, not a full rich-text engine.

After owner review, migrate active leaves incrementally. Keep shared architecture in its canonical
location and pin its relevant revision. Generate the aggregate index from task packages instead
of editing a shared mutable board from every branch. No hosted tracker or duplicate status database
is required. Broader test-result import, current-source freshness and editing remain future work.
