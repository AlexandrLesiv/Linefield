# Independent project setup and future agent brief

Linefield exists at `/Users/oleksandr/projects/linefield` as an independent local Git
repository with documentation/configuration and folder placeholders only. Do not recreate
or initialize over it. Read [resume state](../RESUME.md) and [decisions](../decisions.md).
Application code, build manifests and dependencies remain unimplemented and unauthorized
by the scaffold request.

## Foundation work after implementation approval

1. Verify the existing Linefield repository is separate from the old project. Preserve its
   files and local Git history. Do not create a worktree, submodule or symlink to the old repo.
2. Maintain the approved plan, decision/approval record, existing AGENTS.md and specialist
   instructions in Linefield before delegating implementation work.
   Preserve source cap, Figma, architecture review, diagnostics, E2E and merge gates.
3. Record the old reference commit and approved reuse ledger. Read old source at that
   commit; do not modify or silently import later old-repository work.
4. Create only dependencies needed by the first macOS slice. Copy selected source with
   license/provenance records and rewritten local imports; do not copy build artifacts,
   task statuses, cached evidence, credentials, absolute paths or all agent history.
5. Use new application/bundle/document identifiers. Set up a stable test-runner identity;
   permissions may require user action. Never repurpose or reset system trust automatically.
6. Prove the new build works without the old checkout, then proceed through approved tasks.

Proposed initial layout (within the independent new root):

```text
AGENTS.md                    product boundaries and workflow gates
.codex/agents/               selected specialist responsibilities
apps/                       All planned host placeholders; macOS implementation first
crates/editor-engine/       model, commands, history, codec, geometry, scene
crates/editor-services/     file worker, recovery and diagnostics sinks
crates/editor-renderer/     Skia/Metal integration and caches
crates/editor-native/       typed ABI generation and runtime composition
scripts/                    Node TypeScript build/test/report entry points
quality/                    acceptance registry and evidence schemas
docs/                       approved contracts, design links, decisions, evidence
tasks/                      successor tasks only, with honest statuses
artifacts/                  ignored local builds, traces and reports
```

Generated headers are reproducibly generated from reviewed Rust declarations and checked
for drift. Choose their location during S01; do not maintain competing handwritten copies.
Keep all planned host placeholders under apps/ from day one; implement their features
after macOS. Follow ../platforms.md for portable boundaries. Tooling may emit portable
machine-readable reports for later CI/workbench reuse without implementing that dashboard.

## Future starting prompt template

The owner should supply the approval references before using this implementation prompt.
The template is not current authorization to implement unapproved decisions.

```text
Act as lead/integrator for Linefield at /Users/oleksandr/projects/linefield.
Follow this project's approved AGENTS.md and successor plan.
Approval record: <APPROVED_PLAN_REVISION_AND_DECISIONS>.
Figma approval: <APPROVED_VERSION_AND_FRAMES_OR_PENDING_UI_GATE>.

The old project at /Users/oleksandr/projects/native-sketch is read-only reference.
Reference commit: 3b580873ded3fea63d0220a53d7c5ece66c5d897.
Use its docs/successor review packet as provenance; the approved copy in this
new project and current owner instructions govern the successor.
Do not apply the old task board, compatibility obligations or branch ancestry
as successor requirements. Do not alter the old repo. No build/runtime path
dependencies, symlinks or submodules pointing to it.

Implement only the next approved task in the successor plan. Start by reading
the decision record, task dependencies and acceptance registry. Reuse selected
Rust behavior and test intent with provenance; do not copy packet protocols,
competing session owners or unverified acceptance claims.

macOS first: actual AppKit controls, shared Rust commands and behavior, Skia.
Use typed FFI/generated declarations under the reviewed concrete contract.
No implementation of new UI/tools before the identified Figma approval.
Ask for review before material ABI/schema/thread/framework/security changes.
Assign scoped specialists; freeze contracts before parallel writers and use
isolated worktrees. Keep handwritten source/tests/scripts <=200 physical lines.
Require structured redacted logging, failure tests, native E2E, designer review
and a fresh independent reviewer. Record untested hardware honestly.

Run background checks autonomously. Ask before reserving the desktop for UI
tests/benchmarks unless a current explicit reservation covers the run.
Present a running developer preview and evidence for owner review.
Do not merge into main, publish, or add features/platforms beyond approved scope.
```
