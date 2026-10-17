# Quality requirements

The root pnpm check runner verifies owned tooling and apps/web strict types, Oxlint, Oxfmt and source size, plus shared locale/theme validation, generated resource drift and generator tests. `pnpm theme:native-check` separately parses XML and compiles Android resources when the corresponding tools are installed, reporting unavailable checks explicitly; it does not certify native app integration. pnpm web:build and pnpm web:test verify the live browser prototype (WEB-G01–G11); see apps/web/quality/web-prototype. Native, Rust editor, durability and security-record gates remain planned. See tooling.md and ../quality/root-tooling.md for exact scope and evidence.

Use the SU-01 through SU-20 cases in [delivery](successor/delivery.md). SU-19 applies only if exports are approved. Each task maps requirements to discovered tests and records exact revision/build/device/results. Core tests, bridge tests, replay, native E2E, manual design/accessibility checks and physical measurements are distinct evidence categories.

Required future gates:
- Rust formatting, Clippy, unit/property/integration tests, targeted fuzzing, applicable sanitizers and dependency/license audit.
- Swift formatter/linter, supported concurrency checks, XCTest/XCUITest, keyboard/focus and accessibility checks.
- Node native .ts automation, strict type checking, Oxlint/Oxfmt and runner tests.
- <=200 physical source lines, dependency direction, generated declaration drift, reproducible clean build without the old checkout.
- Failure/recovery tests: invalid batches/files, cancellation, one-operation undo, revision races, interrupted writes, stale handles/results, surface loss, resource limits and logging failure/redaction.
- Native E2E on the actual host for pen/mouse interactions, transforms, shortcuts/text fields, save dialogs, dirty navigation and recovery. Stable runner identity and disposable fixtures.
- Structured, bounded, correlated diagnostics. No private drawing content or per-sample production logs.

Pin verified supported versions during implementation. Do not automatically update to latest or silently loosen lint rules, test exclusions, golden images or performance budgets.

S02 freezes fixtures, safety caps, measurement method and provisional targets. S04/S06 establish measured release baselines. Owner-reviewed thresholds precede S07 acceptance. Capture display/refresh/scale, visibility, hardware, power/thermal conditions and raw timings. Hidden windows invalidate visible presentation measurements. Physical pen latency needs a suitable camera and remains pending.

Native foreground checks require a current desktop reservation. Background checks should not steal focus. Fresh independent review and designer review are required before preview acceptance; neither approves main merges or publishing.

Multiplatform foundation: once tooling is authorized, add native and wasm32 engine compile/conformance checks during macOS development. Shared fixtures verify semantics/schema; each platform later adds actual-host E2E and lifecycle/input/storage/rendering evidence. Do not treat AppKit/Metal success as universal portability.

## Contract and E2E traceability

Follow [contract catalog](contracts.md) and [shared E2E](testing/shared-e2e.md). Map CT/INV/SU
and scenario IDs to discovered native test IDs and exact-build results. Share semantics and
fixtures, keep real platform UI execution and supplements, and report capability applicability,
automation existence, execution and freshness separately. Test-only fault/observation hooks
must be reviewed and disabled/excluded in production; no hidden mutation backdoor.

## Language and platform tooling selection

Before each platform's implementation, its task records supported/pinned tool versions,
format/lint/static-analysis commands, native test framework, dependency/license checks,
release/debug build lanes and hardware gaps. Verify current official support then; this
is a selection obligation, not an assertion that tools are already installed or newest.

| Platform/language | Required selection and evidence |
| --- | --- |
| Kotlin/Android | Kotlin formatter/static analysis, Android lint, Gradle build/unit tests, native instrumentation/UI tests, emulator/device and desktop lifecycle lanes |
| C#/WinUI | Formatting/compiler/analyzer rules, .NET tests, WinUI build and actual Windows UI automation, managed/native boundary checks |
| Rust/GTK Linux | Existing Rust gates plus GTK/accessibility-aware UI automation, target desktop/session and portal/file behavior; Rust tests alone are insufficient |
| Browser TypeScript/Wasm | Oxc/strict types, Wasm conformance, browser E2E/AX, browser storage/permission/offline lanes, bundle/dependency audit; browser selection explicit |
| Swift Apple hosts | Swift formatting/lint/concurrency and native unit/UI tests; each OS SDK, simulator/device and input/lifecycle differences explicitly covered |

Owned Node .ts automation uses erasable types, explicit .ts imports and import type; no
runtime enums, parameter properties, decorators, any casts or type-check suppressions.
Tooling cannot add broad exceptions merely to make existing source pass.

Detailed requirements: [structured diagnostics](logging.md), [Node/Vite/Oxc tooling](tooling.md), [Figma handoff](design/workflow.md) and [Zed task/report reuse](developer-experience.md). No installed-tool or implementation claim is made by these plans.

## Internationalization readiness

SU-20 is required for the preview: [i18n contract](internationalization.md) and [locale matrix](testing/internationalization.md). Validate native catalogs/source fallback, typed placeholders/plurals, pseudo-LTR/RTL layouts, numeric parsing, IME/native shortcut priority, Unicode files, localized AX and locale-independent Rust/document behavior. Record language/region/keyboard/direction independently. English and Ukrainian are required at launch on every host, with OS/browser-selected language and no in-app switch. Require I18N-LAUNCH-002/I18N-UK-002 and linguistic review; actual support needs execution evidence. Planned checks are not installed.

Navigation/motion quality follows [shared cases](testing/navigation-motion.md): applicable
SU-07/SU-09–SU-12/SU-14–SU-18/SU-20 include native focus, dirty guards, URL/history correctness,
interruption, reduced-motion parity and rendering interference. Use actual normal-motion lanes
as well as deterministic functional lanes. Route examples do not expand approved screen scope.

## Selected evidence policies (decisions 110-115)

Use per-host screenshot baselines at every suitable E2E flow step, not just key states. Document
unsuitable checkpoints, exact capture environments and reviewed tolerances. Keep functional/AX/
semantic assertions and designer review; no auto-approved goldens or hidden meaningful differences.
Normal native evidence uses screenshots/logs; video is targeted to motion/gesture diagnosis and
must not contaminate performance measurements. Disposable fixtures/privacy/reservations remain.

Performance acceptance combines reviewed absolute budgets and same-host relative regression limits
against measured release baselines. Review workloads/statistics/repeats/noise/thresholds before
implementation; missing baselines are gaps. Short bounded seeded generated/fuzz checks accompany
relevant background commit checks; extended campaigns precede milestones. Save failing inputs.

Automatically prune eligible old successful test payloads under reviewed age/space caps, preserving
unresolved failures, pinned review evidence and required provenance. Mark pruned payloads honestly;
if protected data fills the cap, pause large capture/request cleanup. No document/log/recovery
cleanup is implied. Exact quotas are still pending. Keep unrelated dependency upgrades in dedicated
changes; required feature/fix dependencies may accompany them with explicit rationale and audits.
These are policy approvals, not installed tools, running automation or successful execution.

## Security review packet

S00E's [risk review](security/day-zero-review.md) and [gates](security/gates-and-response.md) define
proposed adversarial coverage and responsibility. No scanners or negative tests were installed/run
by writing this packet. Bind implemented test IDs/results to proposed SEC scenarios when authorized;
record gaps and advisory freshness, including native SQLite/Skia dependencies beyond Cargo/npm scans.
Read-only design assessment cannot certify a nonexistent runnable build. Owner approval remains for
material mechanisms, resource budgets and security assumptions.

Decision 150 approves the ongoing [security development workflow](security/development-workflow.md): existing implementers own security and tests, independent focused reviews are required at sensitive boundaries. No new agent role or automated gate is installed by this documentation update.

## Edge-case design review

Required workflow from 2026-10-17 (decision 204). Existing roles own this work; no extra
permanent agent or increased concurrency. This is an instruction/review gate, not a claim
that an executable validator or exhaustive test suite is installed.

Before a behavioral feature or material contract is ready for implementation, its owner
records a compact edge-case table in the task using tasks/_template.md. Existing CT/INV/SU/
SEC/scenario IDs should be linked rather than duplicated. Identify intended happy paths too:
failure handling must preserve successful editing, responsiveness and native behavior.
Routine prose/formatting-only changes can state a specific not-applicable rationale.

Each row names a stable case ID, concrete starting state and trigger/event order, violated
assumption/risk, expected visible result and invariant/state that must remain unchanged,
risk priority, accountable owner, test layer/platform and planned/executed evidence.
Reuse applicable security-negative rows; do not create a parallel incompatible register.
Distinguish policy selected, proposed behavior, implemented test and verified outcome.
Unresolved product/architecture choices go to the owner as bounded alternatives; a reviewer
cannot invent new recovery features, gestures, data-loss behavior or permissions as a fix.

Review applicable categories and explain relevant exclusions:
- Boundaries: empty/single/max/just-over-limit, zero/negative/nonfinite/overflow, region
  carry/borrow, cross-region painted bounds, degenerate strokes and extreme zoom/scale.
- State/ordering: duplicate, delayed, missing, reordered and stale work; wrong generation;
  simultaneous clients; cancel/end/commit races; undo/redo and in-flight save interactions.
- Lifecycle: focus/IME/dialog precedence, resize/display mapping, sleep/resume/background,
  disconnect/reconnect and process death at each durable transition where applicable.
- Capacity/dependencies: allocation/quota/disk-full, cache eviction, bounded queues/backpressure,
  stalled storage/GPU/IPC, permission loss and diagnostics failure without blocking ink.
- Native UX/accessibility: empty/loading/partial/error/retry states; keyboard/pen/touch and
  accessibility activation, en/uk text expansion, focus restoration and reduced motion.
- Security/data: malformed/untrusted input, denied authority, privacy/redaction, partial
  publication and protected recovery data. Link the existing threat-model delta.
Include consequential combinations (for example stale completion after cancel plus resize),
not just isolated conditions. Prioritize severity and plausibility; do not require a
combinatorial exhaustive list or pad a quota with irrelevant hypothetical failures.

### Responsibilities and review timing

| Role | Required contribution |
| --- | --- |
| Lead/integrator | Require the table in task handoff; identify affected domains, independent reviewers and decisions; reconcile findings and evidence |
| Feature implementer (Rust/platform/DB/rendering) | Challenge own assumptions before code; specify outcomes and add relevant tests/diagnostics with implementation |
| UX designer | Design interruption, unavailable/error/retry and recovery journeys; input/focus/accessibility/lifecycle expectations with owner-approved scope |
| UI designer | Represent relevant states in adaptive Figma, en/uk, focus/AX and motion; no layout shifts; no invented features to fill edge cases |
| Reviewer | Independently challenge material design before code and implementation before acceptance; inspect actual state transitions/diff/tests, not just authored table |
| Build reliability | Support deterministic fixtures, fault injection where reviewed, discovery and honest result/coverage reporting; implementers still own feature tests |
| Competitor researcher | Identify documented failure/limit behavior as evidence and label unknowns; cannot decide Linefield policy or certify safety |

For a material feature/contract, lead assigns a fresh reviewer who did not author the
assessed design. Routine fixes within approved design use proportional existing review,
not a new owner-approval ceremony. Reviewer returns severity, trigger, impact, missing
case/test and disposition; report no findings separately from not assessed.
Design review does not replace later implementation review. New findings update the same
table; bug fixes add meaningful regression coverage, retaining the failing sequence/seed.

When implementation is authorized, exercise relevant core/property/boundary/process tests
and real native/browser E2E. Native replay is not E2E; fixtures/mocks are not power-loss or
physical latency proof. Test exact outcomes/state preservation, not just no crash.
Record revision/build/device, result, retry/skip/flaky status and artifacts. Preserve native
foreground reservations and approved test-hook/security boundaries.

Do not mark affected design ready while required outcomes remain unspecified or required
independent review is absent. Do not mark implementation complete with unresolved required
cases/evidence. Record blockers and scoped owner-approved exceptions under existing rules;
continue independent authorized work. Tests/instructions cannot guarantee discovery of every bug.

### Lightweight reuse and future automation

Use the task table for design, implementation and review; no new service/report format/DSL.
S01 should later validate required fields, links, applicability and status consistency using
Node .ts actions, reusable by local checks/Zed/future CI. Presence checks do not prove scenario
quality; review remains necessary. Until installed, lead/reviewer enforce the workflow manually.
New chat/agent invocations must read current project instructions; editing TOML does not prove
already-running agents reloaded them. Lead includes the requirement explicitly in active handoffs.
