# Linefield current handoff — 2026-10-19

## Authorization and workspace

Repository `/Users/oleksandr/projects/linefield`; base HEAD `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7`.
Delivered source/tests/docs are consolidated in the bootstrap PR; ignored local research and
recovery copies remain preserved. No reset/clean,
main merge or release. Read AGENTS.md, objectives, latest decisions and the assigned task.

Current executable task: [P05-S01 local styles](../tasks/P05-S01.md), branch
codex/p05-s01-local-styles, stacked on PR #2 at b0cb531. Verified locally: 106 root tests and 121 browser tests pass; 32 visual pairs are unchanged.
Component styles are local; globals cover document/reset integration only. Evidence and reviews:
quality/local-styles-v1. Owner PR review/integration remains pending.

Parent [DX-G02 shared documentation](../tasks/DX-G02.md), branch
codex/dx-g02-shared-documentation; [PR #2](https://github.com/AlexandrLesiv/Linefield/pull/2) is
open for owner review, explicitly stacked on [DX-G01 / PR #1](https://github.com/AlexandrLesiv/Linefield/pull/1)
at e08f304. PR #1 is owner-review, not merged. Decision239 permits independent ready tasks while
other PRs await review and replaces the hosted schema diagram workflow with generated native SVG.
[Parallel task policy](workflow/parallel-tasks.md) and [task board](../tasks/README.md) define hard,
contract and independent dependencies, owned paths, branch bases and parent-first stacked integration.
S02-P01/S02-C01 can be claimed independently within their synthetic/contract scope; DX-T01 app token
migration waits for its token contract. No production engine/library implementation is approved.

Shared diagram definitions and DTCG2025.10 style tokens generate19 architecture/workflow views;
shared schema inputs generate17-table/146-column/11-relationship review data, four SVG views and
complete dictionary. Reference SQL is unchanged; jobs remain proposal-only. No external schema CLI
or account is needed. Earlier approval bytes live at Git e08f304; historical hashes do not describe
cleaned current prose. Private captures/backups remain local. Owner review/merge is still required.

The decision235 away-work window ended2026-10-18; its heartbeat remains PAUSED.
Decision236 records owner approval of D1–D3. Current work prepares concrete storage/deletion/engine
mechanisms; no production implementation approval is inferred. The owner now permits requesting
needed permissions. Authorized headless browser tests ran; no Computer Use or desktop reservation.
[Current implementation-scope handoff](reviews/durable-library-implementation-scope-v1.md)
supersedes the previous recommendation packet. Decision237 records approval of its recommendations
1–3: synthetic storage experiment, browser-local risk posture and removal v4.1 scope/schema.
The experiment completed; neither tested storage candidate is cleared for production.
Material ABI/schema/security/product choices still require their concrete review. General task
work is not approval of unseen native screens, architecture or new behavior.

Design uses repository specifications, references and live web prototypes. Writable references
to the retired external design service were removed;11 protected agent configs could not be
edited. Current human instructions override them. See the evidence index for provenance.

## What exists

P05-G01 and P05-D01 are complete within authorized web-prototype scope: one responsive gallery,
ellipsis actions, slim drawing tool rail and contextual settings. History, transitions, focus,
themes and English/Ukrainian are preserved. Settings/modes are disposable UI state over static
sample/blank artwork. Color/settings panels remain unavailable. No drawing engine, persistence,
native app, Rust/Wasm integration or hidden platform switch was added.

DX00 has five fixed background actions; DX01 has thin project Zed entries. Shared locale/theme
resources and local validation are implemented. Later slices corrected output paths, record
validation, action completion timing and resource-tool failure reporting. S02 has test-only
forward/inverse arithmetic diagnostics, not adopted production algorithms or numerical limits.

[Evidence index](reviews/autonomous-work-index-2026-10-18.md) lists each delivered slice, its
specialist/independent review, exact evidence and limits. [Previous handoff](RESUME-2026-10-18-0405.md)
is preserved verbatim as history; do not restart its completed queue.

## Latest verification and open lanes

- DX-G01 fresh [Historical evidence](https://github.com/AlexandrLesiv/Linefield/commit/b0cb531): root aggregate87,
  full browser118 (zero failures/skips/flaky), build, six schema tests and schema source validation passed.
  Native SVG conversion covers18 views; final review/publication state is in DX-G01.

- Latest local aggregate: [native-resource-tools](../quality/native-resource-tools/README.md),
  **87 tests** plus root/web types, lint, formatting, resource drift and200-line gates passed.
  Locale8XML/4gettext and theme3XML/aapt2 compilation passed;41 generated resources unchanged.
  Apple asset, WinUI compiler and GTK runtime lanes are explicitly not-run.
- Current app artifact evidence: [D01](../apps/web/quality/web-drawing-v2/README.md), historical
  **106 browser passes**, build and Chrome/WebKit smoke. Assets `index-CpH1NmHN.js` /
  `index-z7JnId1S.css`. [Latest D01 preservation audit](../quality/theme-record-boundaries/manifest.json)
  verified139 hashes unchanged; this is not a new browser run.
- [Localization launch](../apps/web/quality/web-localization-launch/README.md):9 separate passes
  on unchanged app. Do not combine these into a claimed115-case run.
- Keyboard follow-up is resolved: final full suite **118 passed**, zero failures/skips/flaky,
  including the new pointer regression. [Historical evidence](https://github.com/AlexandrLesiv/Linefield/commit/b0cb531).
  Final assets index-DCSOpgQJ.js / index-z7JnId1S.css; web gates/build and repository checks passed.
  Designer and independent review passed; reviewer audited runtime artifacts, their own sandbox
  rerun remained blocked. Physical assistive/IME/input, actual Zed and native apps remain unrun.

## Next work and gates

The [task/PR/fresh-chat workflow](workflow/task-pr-chat-plan.md) and [diagram style v2](design/diagram-style-v2.md)
are approved by decision238. DX-G01 establishes the active leaf/task template and current diagrams;
large milestone files keep their IDs and historical evidence. Verification/PR state belongs to
the task and bootstrap evidence; do not infer merge or production readiness from adoption.

Owner-requested documentation follow-up: [Git strategy](workflow/git-strategy.md) recommends a
reviewed-main/task-branch workflow and a preservation-first transition from the current dirty
foundation branch. [Visual architecture plan](workflow/visual-architecture.md) specifies planner
deliverables and generated native SVG presentation, including schema views under decision239.
DX-G01 established the workflow; DX-G02 adds parallel task lanes and generated shared styles; no new agent, CI protection or renderer dependency
is implied. See its actual PR/integration status rather than the earlier planning snapshots.
Routine documentation needs no new approval; material architecture gates remain unchanged.
Native SVG style v2 is the adopted diagram style. Existing historical snapshots remain preserved;
new derivatives are indexed separately, without changing their architecture disposition.

The immediate owner review is [durable empty-library scope v1](reviews/durable-library-implementation-scope-v1.md):
create/list/open/rename/reopen empty drawings, exact Rust/adapter contract and format/bootstrap,
DLW-01–08 identified design; no Delete or real drawing. Designer reviewed three rendered boards;
six retained Node SQLite constraint tests pass. [Storage evidence](../quality/browser-storage-v1/README.md)
records Chrome9/WebKit2 scoped OPFS passes, Firefox profile-launch failure, five healthy SAH-pool
cases and a confirmed synthetic damaged-metadata truncation20480→4096bytes. Proxy retirement
also remains unproved. Do not adopt either VFS or infer a green storage suite. Next recommended
work is a reviewed, disposable non-destructive admission experiment, followed by owner adoption
of its exact mechanism if proven. Production implementation approval remains pending.

Choose a concrete gap in an authorized task before starting; do not manufacture new product or
framework scope. Bounded tooling correctness/conformance work and useful review packets can
continue locally. The initial migration/runner/launcher/arithmetic queue is already delivered.

The [web foundation subset](design/web-foundation-review-v1.md) is designer-authored and independently
reviewed, ready for a future narrow owner disposition. Existing selected-screen authorizations
remain valid. Proficient Ukrainian review, full foundation/native mappings and host evidence remain.
Do not alter its embedded S00A/foundations snapshots without reconciling the recorded hashes.

[Numerical follow-up](reviews/regional-precision-followup.md) and [inverse diagnostic](reviews/inverse-mapping-probe.md)
retain unresolved normalization/rounding, exact regional ABI and painted-geometry/span evidence.
No probe chooses policy or authorizes engine code. Durable library/native implementation remains
gated. DX02 workbench/service and broader registry/discovery work are still planned.

## Operational traps

- App uses Vite, semantic HTML and Vanilla Extract; preserve typed en/uk resources and semantic
  theme tokens. Handwritten source/tests/scripts stay within200 lines. SQLite was downloaded only
  for synthetic probes and Firefox installed only in the browser test cache; no production
  dependency was added. Storage adoption remains blocked.
- Navigation integration: navigation.ts, main.ts, surface-motion.ts, canvas.css.ts and routes.ts.
  Keep local range cancellation, ordinary Tab, idle drawing Escape, transition inertness,
  stale-focus protection, browser history/scroll and disposable New behavior intact.
- Inspect existing servers before launching/killing anything;65142 was preexisting,65144 served
  built smoke,65143 research. Their current availability is not assumed. No desktop reservation.
- Runner supports direct leaf checks only; no formatter worker trees or Windows fallback. Source
  freshness is endpoint equality, not an atomic snapshot. Resource tool timeout is a termination
  request, not a hard deadline for uncooperative processes. Never report unavailable lanes as pass.
- [Archive index](design/archived-explorations.md) preserves retired studies. Private Concepts
  research captures include unrelated drawings; do not serve/version/publish them. No new chat,
  external upload, hidden simulation, wheel exploration or native approval is implied.
