Update2026-10-19: this historical UNRUN status is superseded by the final118-case passing run in quality/continuation-2026-10-19. The run exposed and fixed reverse-focus clipping and added a pointer regression. Original attempt/review below is preserved.

# Drawing keyboard follow-up — 2026-10-18

Status: two regression tests authored, discovered and statically reviewed; browser execution UNRUN. No application source changed. Designer selected existing WEB-D2-02/03/05 and I18N-UK-002 gaps: narrow keyboard traversal/activation and keyboard-updated accessible percentages in a mixed language/region fixture. CT-08/09, INV-05/11 and partial SU-07/20 motivate the cases; no new product requirement.

Source: apps/web/tests/drawing-keyboard.spec.ts. manifest.json records exact test hash/base revision and verifies139 existing D01 source/resource/build hashes unchanged. discovery.log lists the two actual discovered cases. check.log records24shared +23action/configuration +10probe tests and root/web type, lint, format and source-size gates passing. Those are tooling/static passes, not execution of these two browser cases.

Browser availability attempt used the existing drawing-shell.spec.ts disposable-tools case. Playwright could not start its configured dev server: `listen EPERM: operation not permitted 127.0.0.1:65142`, webServer exit1. No browser case began. New tests were subsequently discovered only. Owner prohibits approval prompts/escalation and desktop automation, so no retry through elevated access or Computer Use was attempted.

Designer source review confirmed actual Tab/Shift+Tab order, Space/Enter selection, expected focus visibility/reachability and local value updates. Independent reviewer checked source and ran root checks; final static review has no unresolved finding. Runtime focus/scroll/keyboard behavior, screenshots and browser accessibility remain UNRUN for this follow-up. Existing D01106-pass and localization9-pass reports remain historical evidence at their recorded snapshots; do not combine them into a claim that this enlarged suite passed.

The Ukrainian UI/German-region fixture explicitly asserts both preferences, stable Ukrainian accessible names and expected integer percentage strings. Integer percent spacing happens to coincide in Ukrainian and German, so this case alone does not independently discriminate which formatter locale is used. It does test consistent visible/accessible values after keyboard changes once executed. Physical assistive technology and proficient linguistic review remain separate.

Next permitted browser session: run `pnpm --filter @linefield/web exec playwright test tests/drawing-keyboard.spec.ts`, inspect any failure rather than weakening focus/visibility assertions, then record runtime evidence. Do not request escalation while the owner is away. No screenshot was captured because no browser ran.
