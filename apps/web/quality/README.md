# Web verification guide

Maintained acceptance guidance belongs here. Generated logs, result JSON, source/build manifests,
screenshots and one-run review reports belong in ignored local output or PR attachments.
These pages explain what to verify; they are not a current pass certificate.

- [Gallery and navigation](gallery/README.md): responsive actions, routes, focus and motion.
- [Drawing preview](drawing/README.md): disposable controls, cancellation and keyboard access.
- [Localization](localization/README.md): language/region, literal text and remaining review gaps.
- [Appearance](appearance/README.md): themes, elevation, touch feedback and paper continuity.

The [live prototype specification](../../../docs/design/live-web-prototype.md) owns current behavior;
[app tests](../tests) contain executable assertions. This is one responsive Web interface over
in-memory samples. Browser evidence cannot establish persistent storage, a drawing engine,
native hosts or physical-device acceptance.

## Running and recording verification

From the repository root, use `pnpm check`, `pnpm web:build` and
`pnpm web:test` as appropriate. [App setup](../README.md) lists prerequisites;
[Playwright configuration](../playwright.config.ts) defines the browser/server setup.
For a focused case, use `pnpm --filter @linefield/web exec playwright test tests/<file>.spec.ts`.
Keep sources frozen: a reused development server can reload changing files during a run.

Record the tested commit plus dirty-source identification, build, browser/OS, scenario IDs,
failures/skips/retries and artifact location in the task PR. A focused rerun does not turn a
failed full-suite run into a full pass. Missing tools, blocked startup and unrun native checks
remain explicit gaps. Preserve unresolved failure material outside disposable-artifact cleanup.
Browser output belongs in ignored `apps/web/test-results/`; other local captures/reports can
use ignored `.build-cache/`. Do not add those payloads to this documentation directory.

## Open finding

The intermittent WEB-D2-08 failure remains open: the literal renamed title was expected, but “Coastal house” remained.
The cleanup run had 120 passes and one failure; five explicit focused reruns passed without
source changes. The cause remains unconfirmed. This documentation restoration neither reruns
the app suite nor closes that finding.

Physical touch/stylus, system keyboards/IME, screen-reader walkthroughs, native hosts and
proficient Ukrainian linguistic review remain separate acceptance work. Headless WebKit touch
emulation is browser coverage, not physical Safari/iPhone certification.
