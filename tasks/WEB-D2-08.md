# WEB-D2-08 — Investigate intermittent rename loss

Type: executable leaf. Parent: P05-D01. Status: bounded investigation prepared; original failure remains open.
Owner/writer: replacement Codex lead (prior writer stopped and transferred ownership); isolated worktree .worktrees/web-d2-08-rename.
Branch: codex/web-d2-08-rename. PR: [#7](https://github.com/AlexandrLesiv/Linefield/pull/7), draft for owner review; base main.
Verified base: 55d0cbad108969448ac4302a5b1f2a32ca1b6d57.
PR #5 is merged (69b320cf4f91b7bce24bbb152cb9ca6e379a550e, into its stacked base).
Default main and PR #5 final head a78494c have identical tree eefe8e687e4d396a31b5cbb5b30eafb33cff01dd.
No reset or merge; existing checkouts and untracked work remain untouched.

## Scope and dependencies

Investigate the existing literal-name rename failure, reproduce before fixing, and obtain
independent review. Prior full run: 120 passes / 1 failure; five focused reruns passed without
source changes. Those reruns did not establish a cause or a clean full suite.
Own this brief, its task-board entry, affected rename source/E2E tests and maintained web quality
guidance. Do not overlap another rename writer. Existing gallery/motion contracts are frozen;
shared contracts, durable storage, drawing engine, task tracker and unit suites are excluded.
Authorization: current owner request; decisions 214, 233–234 and 241; existing
[prototype contract](../docs/design/live-web-prototype.md). No new screen or architecture.
Reading: AGENTS.md, tasks/README.md, web quality guide, objectives, decisions, CT-07/08/09,
prototype contract, drawing/rename tests and workflow/task-pr-chat.md.

## 1. Security impact

Lead classification (2026-10-19, base above): no boundary change. Names are user-controlled
literal text in disposable in-memory fixtures. Preserve textContent rendering, 240-character
input bound, trimming, content-free diagnostics and existing cancellation/focus behavior.
SEC-09/12/13 and WEB-D2-08 remain applicable; no new persistence, dependency, network,
privilege, HTML interpretation or authority. Threat-model mechanisms remain unchanged.

## 2. Design gate

Existing approved prototype requires Save to commit once before closing motion; Cancel,
Escape and outside press preserve the name; inside-to-outside drag must not dismiss.
Investigate actual event ordering before choosing a repair. Material product/architecture
changes stop this task for owner review. Routine corrections within this behavior are authorized.
Independent reviewer will challenge established cause and proposed correction before acceptance.

## 3. Negative acceptance and implementation evidence

| Scenario | Trigger | Required outcome | Evidence |
| --- | --- | --- | --- |
| WEB-D2-08; CT-07/09; SEC-09/12/13 | HTML-like Unicode name, Rename, open | Exact literal title; no image element; bounded controls and browser context behavior | Original failure retained; focused attempts did not reproduce |
| WEB-RX01/03/04/05; CT-08/09; INV-05; SU-07 | Save/cancel/outside/drag during opening or exit; reduced motion/resize | Commit once or preserve name according to intent; return focus; no orphan dialog | Existing E2E retained; final result in PR |

## 4. Independent review and completion

Fresh independent reviewer: rename_review; read-only cause, scope, evidence and final-diff review.
Initial review found no established cause and rejected speculative motion changes. Final
review found no blocking code/security issues; its scenario-to-test mapping finding was fixed
and re-reviewed. Reviewer independently passed TypeScript, focused lint/format and diff checks.
Full-suite failures and the original unresolved finding still prevent a clean acceptance claim. Owner review/merge and subsequent integration verification remain required.
Do not call the historical failure resolved solely because it does not reproduce.

## 5. Automated gate evidence

Required: unchanged full browser baseline, bounded focused reproduction, failure-capture
validation, pnpm check, pnpm web:build and final full suite. Product behavior is unchanged;
no cause-specific regression or fix is claimed.
Static checks and production build passed. The final browser suite had 120 passes and one
WEB-G01 failure (expected width 389.328125, observed 537.4375), with zero retries/skips;
WEB-D2-08 passed. This is not a clean suite. Exact source hashes, platform/browser, bounded
attempt counts and ignored artifacts are recorded in PR evidence. Generated reports stay in apps/web/test-results or .build-cache; maintained
acceptance mappings and unresolved findings stay tracked. No unit/developer-tool suites.

## 6. Edge-case design and verification

| Event order | Expected invariant | Owner/test layer | Status |
| --- | --- | --- | --- |
| Fill then immediately click Rename during opening | Visible Save intent must commit entered literal name once | Lead/browser E2E, WEB-D2-08 | Cause unconfirmed; event/trace capture added |
| Inside press then outside release | Preserve open dialog and entered text | Lead/browser E2E, WEB-RX01 | Existing assertion |
| Outside press/release, Cancel or Escape | Preserve old name, return focus after exit | Lead/browser E2E, WEB-RX01/02/04/05 | Existing assertions |
| Successful rename rerenders origin | Resolve live card/trigger, preserve literal name on open | Lead/browser E2E, WEB-RX03/D2-08 | Investigate |

Physical device/IME and native acceptance are outside this bounded browser investigation;
no new visual design is proposed. Specialist consultation is proportional to established cause.

## 7. Investigation disposition and follow-up

Save synchronously invokes the in-memory update before exit motion. Successful event samples
show scrolling inside the opening dialog, but none show a lost submit; motion/scroll retargeting
remains a hypothesis. No product change is justified. Keep the historical 120/1 rename failure
and five focused passes distinct from the fresh baseline (120/1, separate WEB-G01 geometry
failure) and later instrumented attempts. The historical-full.json retained locally contains
discovery-only results, not execution evidence; the historical log/error retain the failure.

WEB-D2-08 moves from drawing-shell.spec.ts to rename-literal.spec.ts so failure-only trace
retention is scoped to that scenario. Its original actions/assertions remain. The bounded helper
records semantic targets, trusted-event flags, input equality/validity and closing state on
failure. No test waits, retries, skips, app behavior or approval gates change. Recorder timing
can influence races. Frame-navigation events include same-document history transitions; inspect
the trace and recorder availability before diagnosing a full document reload.

Next recurrence requires the event attachment and trace before further modification. Distinguish
a missed submit/cancel from accepted rename followed by reinitialization. Do not promote a
passing rerun into proof of a fix. WEB-G01 requires a separately bounded geometry investigation.
Owner review/merge and verified integration remain pending; storage/engine approvals unchanged.
