## Current priority — full vector migration (2026-10-22)

Current owner renewal on 2026-10-22: [decision243](../docs/decisions.md) authorizes autonomous
M03–M09 and all required scoped technical/design decisions until the owner's return or
2026-10-23 07:13:55 UTC. [P05-DIAG01](P05-DIAG01.md) implements the approved bounded logging
and development mode after the M03 runtime contract freezes. The existing continuation is active
every 20 minutes until that deadline or the owner's return.
No merges; preserve current previews and reference5207. Quality requirements remain unchanged.

The migration sequence is [M01](P05-M01.md) → [M02](P05-M02.md) → [M03](P05-M03.md) →
[M04](P05-M04.md) → [M05](P05-M05.md) → [M06](P05-M06.md) → [M07](P05-M07.md) →
[M08](P05-M08.md) → [M09](P05-M09.md). Contracts/design are
[MIG-C1](../docs/interfaces/web-gpu-editor.md)/[MIG-D1](../docs/design/web-gpu-editor.md).
M01 is frozen at9e92c63 in [PR16](https://github.com/AlexandrLesiv/Linefield/pull/16).
M02 runtime is frozen at1157aeba in draft [PR17](https://github.com/AlexandrLesiv/Linefield/pull/17).
M03 is active in [draft PR18](https://github.com/AlexandrLesiv/Linefield/pull/18) on that frozen
runtime; its Undo-continuity preview remains available on port65177. M03's current wake/retention
checkpoint passes275 unique browser cases plus four affected fixture rechecks, static/build and
scoped reviews; preview65206 preserves prior builds. DIAG01 is in draft
[PR19](https://github.com/AlexandrLesiv/Linefield/pull/19), with bounded exportable diagnostics and
development tools on65208. Capture overhead and remaining M03 timing/resource gates stay open.
M04's first same-view prefix reuse checkpoint passes346 selected cases and scoped reviews;
preview65220 is available. Its one bounded comparison reduced completed-frame acknowledgement
from63.8/61.6ms controls to48.7ms; this is not panning or full-profile acceptance. Sparse coverage,
regions and tiles remain in progress. First compiled raster arithmetic/layout proof is authorized;
production pan-copy is gated. M05 settings/material controls are under source review on its
separate branch; shaders and combined browser acceptance remain pending. M06/M07 have prepared
contracts only; M08/M09 remain unimplemented. Later work needs frozen predecessors, not renewed
permission. No source or model checkpoint is a compiled shader, appearance or performance pass.
PR10 is verified merged at3eaaff8c07c3e15bdcbbbdb97c74031426fbe454. Older status statements
below are historical. One task/branch/PR, parent-first stacked review, owner-only merges.

# Current verification policy

Task files retain the original plain Markdown format. Historical results in older briefs are not current pass claims. Quality links lead to maintained guidance, not archived run payloads. The owner selects E2E tests only; static type, lint, format, generation and build checks remain. Approval records cover their identified proposals, not automatically a newer document at a replacement link.

Current 2026-10-17: decision 214 and [live prototype](../docs/design/live-web-prototype.md) supersede the old gallery experiments below. apps/web is the active review surface. Native/design review implementation gates remain.

Current gallery work: apps/web live prototype, decision 214; see ../docs/design/live-web-prototype.md. Android P02 retains Compose as its toolkit. Decision 232 requires shared Linefield styling, supersedes mandatory native appearance and retires the wheel. Decision233/P05-G01 implements one responsive Web gallery and removes hidden platform simulation; the drawing-screen UI prototype is authorized under P05-D01/decision234; real editing and native implementation remain gated. Native application implementation remains pending.

# Task board

See the [approved product backlog](BACKLOG.md) for the owner-confirmed order of upcoming functionality.
Those priorities do not mark the milestones below complete or waive implementation gates.
[P05-L01](P05-L01.md) prepares the first saved-drawing slice; production work remains gated,
with [S02-P01](S02-P01.md) the next synthetic storage prerequisite.
Owner-requested later follow-ups: [configurable finger drawing](P05-I01.md) under backlog #43
and [color-picker review](P05-D02.md) at #64. Neither changes the approved first-slice defaults.

## Proposed priority — in-memory shared web editor (2026-10-19)

Owner requested the smallest usable Rust/Wasm/CanvasKit pen slice, with confirmation of each
task's scope and position before it starts. PR #6 is verified merged at
`55d0cbad108969448ac4302a5b1f2a32ca1b6d57`. Execution refreshed to integrated
`8dbd9b1` after PR #7; the original main checkout is preserved.
This is launch provenance. PR #8 merged as `545f222` and was integrated into this task branch
at `f18b44f`; preserve its backlog and verify current main again before new execution.
Historical PR/base statements below do not override the actual integrated state.

| Order | Task | Gate |
| --- | --- | --- |
| 1 | [S02-W01 memory editor contract/design](S02-W01.md) | [PR #9](https://github.com/AlexandrLesiv/Linefield/pull/9) merged; investigation/reviews complete; core and P1/H1/S1–S4 approved; N1/A1/R1 approved at51d9345; merged c28f56b, integrated tree verified |
| 2 | [P05-E01 runtime foundation](P05-E01.md) | Owner-confirmed second task; implemented/reviewed from verified c28f56b; [PR #10](https://github.com/AlexandrLesiv/Linefield/pull/10) awaits owner review; no ink yet |
| 3 | [P05-E02 usable pen and viewport](P05-E02.md) | Owner confirmed scope/third position; awaits verified integration of PR #10; pen, pan/zoom, settings, cancellation and Undo/Redo together |

S02-W01 is integrated at `c28f56b`; P05-E01 is confirmed and assigned to one implementation
writer on `codex/p05-e01-memory-runtime` in its isolated worktree; implementation is frozen
for owner-review handoff. Original checkout drafts
remain preserved. P05-E02 is confirmed with no writer or PR; prerequisite integration remains pending. Existing regional C01
work must be coordinated before overlapping execution. Storage admission and durable/native
milestones are independent. No task grants approval by being listed. E2E-only tests plus
static/build checks apply; older unit/property/developer-tool suite wording is superseded.

Decision238 adopts the [task/PR/fresh-chat workflow](../docs/workflow/task-pr-chat.md).
The broad records below remain milestones/workstreams; existing completion claims describe local
deliverables, not fabricated GitHub merges. New executable leaf tasks follow the updated template.

## Executable task lanes

See [parallel task policy](../docs/workflow/parallel-tasks.md). Two implementation writers maximum;
owner-review PRs do not occupy a writer slot. Ready is scoped authorization, not permission to skip
base/contract checks. Each writer uses an isolated worktree; one owner per shared input/output.

| Task | State / PR | Dependencies and parallelism |
| --- | --- | --- |
| [DX-G01 bootstrap](DX-G01.md) | Owner review, [PR #1](https://github.com/AlexandrLesiv/Linefield/pull/1) | Initial delivered baseline; owner merge pending |
| [DX-G02 shared documentation](DX-G02.md) | Owner review, [PR #2](https://github.com/AlexandrLesiv/Linefield/pull/2) | Stacked on DX-G01; owns tooling/docs cleanup, not runtime behavior |
| [P05-S01 local styles](P05-S01.md) | Owner review, [PR #3](https://github.com/AlexandrLesiv/Linefield/pull/3) | Stacked on DX-G02; app style scoping and final documentation cleanup |
| [S02-P01 storage admission](S02-P01.md) | Ready for bounded synthetic investigation | DX-G01 baseline; independent of DX-G02 and S02-C01, separate probe paths |
| [S02-C01 regional contract](S02-C01.md) | Broader regional follow-up; coordinate before claim | S02-W01 currently owns the narrow web contract; do not run overlapping contract writers |
| [DX-T01 app token parity](DX-T01.md) | Contract-blocked; read-only inventory may proceed | DX-G02 token contract/review before implementation; no simultaneous shared-token edits |

After PR #1 integrates, S02-P01 and S02-C01 can use the same verified main base in separate worktrees
while DX-G02 is reviewed. Production durable-library work remains blocked by storage adoption and
exact implementation scope approval. Broad milestones below must gain a bounded executable brief
before implementation; listing them does not silently authorize every feature.

## Milestones and existing delivered slices

Root Node/TypeScript/pnpm tooling and the authorized web gallery prototype are implemented. Development order is web → macOS → iPhone/iPad, with macOS still the primary product target (decision 231). S01 is partial; full editor/native implementation remains gated by concrete contracts and approved slice designs.

| Task | State |
| --- | --- |
| [S00A Design foundations](S00A.md) | Repository foundations/component inventory and selected web prototypes delivered; complete foundation-version/native review pending |
| [S00B Internationalization](S00B.md) | Shared en/uk catalogs and web launch/region/Unicode checks implemented; native contracts and linguistic review pending |
| [S00C Competitor research](S00C.md) | Bounded gallery study delivered with official sources; full feature studies follow scope |
| [S00D Navigation and motion](S00D.md) | Web routes/history/focus and motion verified; durable/native flows and host evidence pending |
| [P05-G01 One Web gallery](P05-G01.md) | Complete: hidden platform simulation removed; responsive Web actions and flows verified |
| [P05-D01 Selected drawing screen v2](P05-D01.md) | Complete: selected slim rail/top settings UI;106 browser passes plus production smoke; engine/native implementation remains separate |
| [S00 Review and design](S00.md) | Awaiting remaining decisions/design approval |
| [S01 Independent foundation](S01.md) | Root tooling installed; native/app gates pending |
| [S02 Concrete contracts](S02.md) | Regional schema source v3 approved (209); revised exact ABI, numerical and native feasibility evidence pending |
| [S02M Multi-client coordination](S02M.md) | Direction selected; exact contracts/design review/probes pending |
| [S02L Gallery and library first](S02L.md) | Selected web gallery prototype complete; durable/native library design/contracts and implementation remain gated |
| [S03 Pure editor](S03.md) | Planned; not started |
| [S04 First native stroke](S04.md) | Planned; not started |
| [S05 Navigation and editing](S05.md) | Planned; not started |
| [S06 Files and recovery](S06.md) | Planned; not started |
| [S07 Reliability and performance](S07.md) | Planned; not started |
| [S07E PNG export](S07E.md) | Scope approved (decision 18); contracts/design review/implementation pending |
| [S08 Developer preview acceptance](S08.md) | Planned; not started |
| [S09 Distribution](S09.md) | Planned; not started |

S00A's [web foundation review packet v1](../docs/design/web-foundations.md) consolidates
the implemented component inventory and separate behavior/visual checklists. Existing screen
authorization remains valid; owner foundation disposition and native/linguistic evidence remain pending.

See ../docs/testing/acceptance.md for detailed acceptance and dependencies. Old Native Sketch task statuses do not apply.

## Platform backlog

Portability planning is required now. P05 leads implementation; the macOS milestones follow, then P01 as the next native priority. Other platform tasks retain their macOS acceptance dependencies. These placeholders do not certify platform support.

- [P01 ios](P01.md): planned; no implementation.
- [P02 android](P02.md): planned; no implementation.
- [P03 windows](P03.md): planned; no implementation.
- [P04 linux](P04.md): planned; no implementation.
- [P05 web](P05.md): first implementation platform; live gallery prototype implemented, full Rust/Wasm editor and persistence planned/gated.
- [P06 visionos](P06.md): planned; no implementation.
- [P07 tvos](P07.md): planned; no implementation.
- [P08 watchos](P08.md): planned; no implementation.
- [P09 chromeos](P09.md): planned; no implementation.

Contract and scenario work is part of each feature task, not a final testing phase. See [contracts](../docs/contracts.md), [shared E2E](../docs/testing/shared-e2e.md) and [decision audit](../docs/reviews/contracts.md).

## Developer experience backlog

- [DX00 Contracts and design](DX00.md): bounded action/report CLI implemented and independently reviewed; broader registry/UI remains planned.
- [DX01 Zed tasks](DX01.md): five thin launchers implemented; static conformance verified, actual editor runtime pending.
- [DX02 Optional workbench/report UI](DX02.md): later scope and design review approval; no custom Zed extension.

## Additional platform backlog

- [P10 Android TV / Google TV](P10.md): view-only host; placeholder only.
- [P11 Android XR](P11.md): initially 2D surface; capabilities/design reviewed before implementation.

- [P12 Wear OS](P12.md): planned view-only watch host (owner-selected); toolkit and source/standalone choices pending.

## Owner-requested reviews after current architecture-policy choices

- [S00E Day-zero security](S00E.md): threat model, security gates and security-agent recommendation.
- [S00F Platform input contracts](S00F.md): shared Rust behavior/binding proposal plus native device,
  shortcut/gesture/focus matrix and owner review before detailed input design review.
- [S00G Distribution requirements](S00G.md): current official per-channel rules, day-zero impacts,
  evidence and existing-agent responsibility proposal; publishing remains separately gated.

These reviews precede freezing affected S02 contracts/design review. They are required planning deliverables,
not completed assessments or implementation. Do not inflate the current question count with future
store chores; consolidate findings into review packets and ask only material unresolved choices.

S00E now has an architecture-level security proposal under docs/security/, with storage/native
specialist input; owner review, concrete mechanism decisions and implementation evidence remain.
S00F [input proposal](../docs/input/README.md) and S00G [distribution research](../docs/distribution/README.md)
are now prepared for review; owner approval and artifact compliance remain pending.

Decision 150 approves the ongoing [security development workflow](../docs/security/development-workflow.md): existing implementers own security and tests, independent focused reviews are required at sensitive boundaries. No new agent role or automated gate is installed by this documentation update.

## Required task gates

Use [_template.md](_template.md) for new work; bring existing task briefs into that shape before their
implementation begins. Do not bulk-mark existing placeholders safe or approved. Lead fills security
impact and confirms classification; sensitive tasks link independent design assessment and actual
owner approval before code; implementers supply negative cases and exact evidence; independent
implementation review and finding disposition precede complete status. Existing authorized routine
fixes reference their approved design without unnecessary repeated owner permission.

Use [security-review-template](../docs/security/review-template.md) for separate design and
implementation records. These are mandatory agent workflow gates; executable enforcement is not
installed. S01 owns installing a validator/report integration when implementation is authorized.

S00F now maintains an [input inventory](../docs/input/inventory.md) for per-feature UX proposals and owner design approval (151), not an up-front binding questionnaire. Decision 152 selects all four TV/watch hosts as view-only.
