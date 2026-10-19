# Current verification policy

Task files retain the original plain Markdown format. Historical results in older briefs are not current pass claims. Quality links lead to maintained guidance, not archived run payloads. The owner selects E2E tests only; static type, lint, format, generation and build checks remain. Approval records cover their identified proposals, not automatically a newer document at a replacement link.

Current 2026-10-17: decision 214 and [live prototype](../docs/design/live-web-prototype.md) supersede the old gallery experiments below. apps/web is the active review surface. Native/design review implementation gates remain.

Current gallery work: apps/web live prototype, decision 214; see ../docs/design/live-web-prototype.md. Android P02 retains Compose as its toolkit. Decision 232 requires shared Linefield styling, supersedes mandatory native appearance and retires the wheel. Decision233/P05-G01 implements one responsive Web gallery and removes hidden platform simulation; the drawing-screen UI prototype is authorized under P05-D01/decision234; real editing and native implementation remain gated. Native application implementation remains pending.

# Task board

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
| [S02-C01 regional contract](S02-C01.md) | Ready for contract/probe work | DX-G01 baseline; independent of storage and documentation tooling |
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
