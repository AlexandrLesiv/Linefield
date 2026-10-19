# DX-T02 minimal task preview v3

Owner selected the minimal mockup and explicitly requested updating HTML. The exact selected
SVG is docs/design/task-preview-minimal-v3/reference.svg. This is a revision of DX-T02 / PR #4,
not a second task branch. Prior v1 evidence remains unchanged in quality/task-packages-v1.

A white 672px reading column shows title, status, short outcome and PR link. Four initially closed
native disclosures retain all scope/design, acceptance/tests/evidence, reviews, PR metadata and
handoff detail. The task list shows only names/statuses. Blocked milestones keep the concrete
blocking explanation visible. No schema, execution, approval or product behavior was added.

[Root checks](root-check.log):124 tests passed plus strict types/lint/format/generated drift and
source-size checks. [Browser results](browser-results.json):8 scenarios passed, including desktop/
narrow layouts, initially closed groups, keyboard opening/closing, nested disclosure focus, visible
PR/blocker states and unchanged hostile-text/route checks. Captures are local in
.build-cache/task-preview-v3; hashes are recorded in browser-results.json.

[Source identity](tested-source.json) identifies actual renderer/data/generated outputs and the
selected reference. [Designer review](design-review.md) and [independent review](independent-review.md)
record the sampled result and limits. All original task documents and historical evidence remain
unchanged; only pilot presentation metadata (title/summary) changed. Prior metadata/source hashes
remain evidence for v1, not a claim that v3 was previously tested.

The same bounded documentation-only scope applies. No native/product/physical-input or full
assistive-technology claim follows from headless checks. Original historical run results are
still explicitly historical. PR #4 remains for owner integration after its parent PRs.
