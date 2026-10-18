# DX-G01 — repository and workflow bootstrap

Type: executable bootstrap/documentation task. Parent: DX00/developer workflow.
Status: owner review. Owner: lead; specialists: build reliability, UI/UX designer; fresh reviewer.
Authority: decision238 and docs/reviews/workflow-style-approval-2026-10-19.md.
Base: fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus the verified preserved working tree.
Branch: codex/dx-g01-workflow-bootstrap. PR: https://github.com/AlexandrLesiv/Linefield/pull/1.
Repository: https://github.com/AlexandrLesiv/Linefield (public, owner-authorized).

## Outcome and boundaries

Preserve the existing checkout, curate its delivered local work into a reviewed bootstrap PR,
adopt the task/PR/chat entry fields and create native SVG v2 views of existing explanatory
diagrams and the new workflow. Existing inherited application changes are baseline consolidation,
not new feature development. Do not mark durable/native engine work implemented or approved.

No feature merge, release, new runtime dependency, CI claim, credential exposure or deletion of
local evidence. Milestone and old approval records stay intact. A prior diagram's historical
meaning is not current authority merely because its appearance is updated.

## Acceptance and evidence

| ID | Required outcome | Evidence |
| --- | --- | --- |
| BOOT-01 | Full local snapshot before mutation, verify files/symlinks and unchanged status | quality/bootstrap-v1 preservation record |
| BOOT-02 | Explicit curated publication paths; ignored/private data excluded and preserved | staged inventory and privacy inspection |
| BOOT-03 | One executable task/branch/PR, template retains security and review requirements | task template, active index, PR template |
| BOOT-04 | Existing diagram inventory accounted for; v2 SVGs, workflow views, render and semantic review | docs/diagrams/migration-v2.md and quality/bootstrap-v1 |
| BOOT-05 | Applicable source/tool/browser checks with exact revision/hash evidence | baseline validation reports; missing lanes explicit |
| BOOT-06 | PR published to intended repository; owner merge remains pending | actual PR URL/head/base; no invented completion |

Security classification: repository/publication boundary, no new application runtime boundary.
Risks: private captures or credentials accidentally staged; lost ignored evidence; stale approval
or test claim; changed diagram semantics; publishing unreviewed baseline. Lead owns manifest/hash
verification, explicit exclusions, staged-content inspection and reviewer evidence. Existing SEC
privacy principles apply; no new app CT/INV/SU behavior is implemented by the bootstrap.

## Preservation and handoff

Before edits, copied the full checkout including .git, dependencies, ignored captures and symbolic
links without following them. All9295 entries verified,1152570359 file bytes; status unchanged.
Local path: .build-cache/bootstrap-preservation-2026-10-19 (ignored; never publish).
This is a local recovery copy on the same disk, not an off-device disaster backup. Do not run
git clean or delete build-cache while this is the retained recovery source. Manifest hash is in
the bootstrap evidence. Original branch remains codex/project-foundation; task branch preserves it.

Entry reading: AGENTS.md, docs/RESUME.md, approved task-pr-chat plan, Git strategy and style v2.
[Fresh validation and preservation evidence](../quality/bootstrap-v1/README.md) records root87,
browser118, schema6, DBML validation and the SVG render inventory. Original committed foundation
fbcc30c was published as remote main; task changes remain separate for owner PR review. After owner
merge notification, verify merge identity/checks and provide a next-task prompt. Next candidate:
bounded synthetic storage preservation investigation; production storage still blocked.

Publication: bootstrap commit7083fb4 is the reviewed candidate; this status-only follow-up records
the actual PR. Owner merge is pending. No subsequent implementation task has started.
