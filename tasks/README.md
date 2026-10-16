# Task board

Planning scaffold with root Node/TypeScript/pnpm tooling installed. S01 is partial; app implementation remains unauthorized.

| Task | State |
| --- | --- |
| [S00A Design foundations](S00A.md) | Planned; precedes detailed screen approval |
| [S00B Internationalization](S00B.md) | English + Ukrainian launch selected; OS-selected language; resource contracts planned |
| [S00C Competitor research](S00C.md) | Planned; sourced handoff to owner and designer |
| [S00D Navigation and motion](S00D.md) | Planned; native routes/web URLs and interactive motion handoff |
| [S00 Review and design](S00.md) | Awaiting remaining decisions/design approval |
| [S01 Independent foundation](S01.md) | Root tooling installed; native/app gates pending |
| [S02 Concrete contracts](S02.md) | Regional DBML v3 approved (209); revised exact ABI, numerical and native feasibility evidence pending |
| [S02M Multi-client coordination](S02M.md) | Direction selected; exact contracts/Figma/probes pending |
| [S02L Gallery and library first](S02L.md) | Scope/sequence approved; Figma/contracts pending; before canvas |
| [S03 Pure editor](S03.md) | Planned; not started |
| [S04 First native stroke](S04.md) | Planned; not started |
| [S05 Navigation and editing](S05.md) | Planned; not started |
| [S06 Files and recovery](S06.md) | Planned; not started |
| [S07 Reliability and performance](S07.md) | Planned; not started |
| [S07E PNG export](S07E.md) | Scope approved (decision 18); contracts/Figma/implementation pending |
| [S08 Developer preview acceptance](S08.md) | Planned; not started |
| [S09 Distribution](S09.md) | Planned; not started |

See ../docs/successor/delivery.md for detailed acceptance and dependencies. Old Native Sketch task statuses do not apply.

## Platform backlog

Portability planning is required now; feature implementation follows macOS. iPhone/iPad is second priority. These placeholders do not certify platform support.

- [P01 ios](P01.md): planned; no implementation.
- [P02 android](P02.md): planned; no implementation.
- [P03 windows](P03.md): planned; no implementation.
- [P04 linux](P04.md): planned; no implementation.
- [P05 web](P05.md): planned; no implementation.
- [P06 visionos](P06.md): planned; no implementation.
- [P07 tvos](P07.md): planned; no implementation.
- [P08 watchos](P08.md): planned; no implementation.
- [P09 chromeos](P09.md): planned; no implementation.

Contract and scenario work is part of each feature task, not a final testing phase. See [contracts](../docs/contracts.md), [shared E2E](../docs/testing/shared-e2e.md) and [decision audit](../docs/architecture-decisions-audit.md).

## Developer experience backlog

- [DX00 Contracts and design](DX00.md): day-one planning, no code.
- [DX01 Zed tasks](DX01.md): chosen integration; real launchers after Node actions exist.
- [DX02 Optional workbench/report UI](DX02.md): later scope and Figma approval; no custom Zed extension.

## Additional platform backlog

- [P10 Android TV / Google TV](P10.md): view-only host; placeholder only.
- [P11 Android XR](P11.md): initially 2D surface; capabilities/design reviewed before implementation.

- [P12 Wear OS](P12.md): planned view-only watch host (owner-selected); toolkit and source/standalone choices pending.

## Owner-requested reviews after current architecture-policy choices

- [S00E Day-zero security](S00E.md): threat model, security gates and security-agent recommendation.
- [S00F Platform input contracts](S00F.md): shared Rust behavior/binding proposal plus native device,
  shortcut/gesture/focus matrix and owner review before detailed input Figma.
- [S00G Distribution requirements](S00G.md): current official per-channel rules, day-zero impacts,
  evidence and existing-agent responsibility proposal; publishing remains separately gated.

These reviews precede freezing affected S02 contracts/Figma. They are required planning deliverables,
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

Use [security-review-template](../quality/security-review-template.md) for separate design and
implementation records. These are mandatory agent workflow gates; executable enforcement is not
installed. S01 owns installing a validator/report integration when implementation is authorized.

S00F now maintains an [input inventory](../docs/input/inventory.md) for per-feature UX proposals and owner design approval (151), not an up-front binding questionnaire. Decision 152 selects all four TV/watch hosts as view-only.
