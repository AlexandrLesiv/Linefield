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

## Open findings

The intermittent WEB-D2-08 failure remains open: the literal renamed title was expected, but “Coastal house” remained.
The cleanup run had 120 passes and one failure; five explicit focused reruns passed without
source changes. The cause remains unconfirmed. [WEB-D2-08](../../../tasks/WEB-D2-08.md) owns the bounded
investigation. Further passing attempts do not establish a cause or close the original failure.

WEB-D2-08 now lives in tests/rename-literal.spec.ts. Its original clicks, literal-title assertion,
context-menu assertion and control bounds remain intact. A test-only bounded recorder retains
up to 64 semantic event observations and a dropped-event count on failure; the scenario also
retains a Playwright trace on failure. No production instrumentation, waits, retries or relaxed
assertions are added. The recorder stores input equality/validity flags, never entered text or
coordinates. Traces contain browser fixture state and remain ignored. Instrumentation can affect
race timing, so successful instrumented runs are not proof that the uninstrumented race is absent.

For a recurrence, preserve test-results before another run replaces it. Inspect rename-events and
the trace together: did a trusted click reach Submit, did the form submit with the expected value,
did cancellation/closing start first, or did a document navigation reset the in-memory sample?
Do not infer cancellation solely from an old canvas title. Compare ordinary playback with bounded
slow-CPU/longer-press diagnostics; report each separately. An intentionally failed diagnostic
assertion checks evidence capture only and is not reproduction of the product failure.

The fresh investigation baseline also exposed WEB-G01: the opening surface width differed from
the recorded card width (expected 389.328125, observed 537.9375). That run had 120 passes and one
WEB-G01 failure while WEB-D2-08 passed. This separate geometry finding remains unconfirmed and
outside the rename repair scope; a later passing suite does not establish its cause.

Physical touch/stylus, system keyboards/IME, screen-reader walkthroughs, native hosts and
proficient Ukrainian linguistic review remain separate acceptance work. Headless WebKit touch
emulation is browser coverage, not physical Safari/iPhone certification.
