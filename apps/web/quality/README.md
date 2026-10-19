# Web verification guide

Maintained acceptance guidance belongs here. Generated logs, result JSON, source/build manifests,
screenshots and one-run review reports belong in ignored local output or PR attachments.
These pages explain what to verify; they are not a current pass certificate.

- [Gallery and navigation](gallery/README.md): responsive actions, routes, focus and motion.
- [Drawing preview](drawing/README.md): disposable controls, cancellation and keyboard access.
- [Localization](localization/README.md): language/region, literal text and remaining review gaps.
- [Appearance](appearance/README.md): themes, elevation, touch feedback and paper continuity.

The [live prototype specification](../../../docs/design/live-web-prototype.md) owns current behavior;
[app tests](../tests) contain executable assertions. The temporary drawing integrates shared
Rust/Wasm editing with CanvasKit; the gallery remains a prototype. Browser evidence cannot
establish persistent storage, native hosts or physical-device acceptance.

## Pen release ordering

WMP-02/CT-02/INV-04 uses the owner-approved pending-release exception in
[WMP-C2](../../../docs/interfaces/web-memory.md), with the D3-04R presentation in
[WMP-D3](../../../docs/design/web-memory-pen.md). `tests/memory/pen-release*.spec.ts`
exercises the real app: browser-generated trusted capture loss followed by delayed CDP pen
release; exact frozen-prefix pixels; one-operation Undo; same-pointer fresh contact; explicit
interruptions; preserved completed content and both history stacks; and enlarged Ukrainian
status/exit visibility. CDP pen input simulates browser events, not physical Wacom hardware.
Hidden/cancel/conflicting-capture and malformed/stale conditions are explicitly injected
browser event fixtures. The timestamp case uses a real CDP event with a deliberately older
timestamp. No test trust bypass or production command-injection hook is provided.

The state has no elapsed-time expiry: if no terminal or interruption event follows, the
provisional stroke remains frozen with Escape/Back exits. Pointer ID reuse is fenced by the
current Rust interaction and recognizable event timestamps; DOM does not expose a distinct
contact generation for arbitrarily mislabelled events. Physical-device retesting, full E02
acceptance and the previously failed long-path performance profile remain separate gates.

## Running and recording verification

WMP-01/03 rapid-stroke tests hold browser RAF only after a real initial presentation, then
send trusted input through the app and verify accepted strokes, per-stroke history and cold
rebuild pixel parity. This is an explicitly controlled scheduling fixture, not latency
evidence. WMP-11 viewport tests independently check held-drag pixel displacement before
release, captured-view cancellation, native held-key behavior and viewport retention. The
isolated Wasm viewport fixture checks hostile arguments, exact regional examples, stale
tokens and terminal generation reservations; it is browser boundary evidence, not native UI.

`viewport-pen.spec.ts` drives Chrome CDP pen input through the actual app: Space+tip moves
artwork before release, exact replacement preserves position, pan creates no history, Space-up
cannot turn a held tip into ink, and fresh unarmed pen contact draws. Escape and browser-generated
pressed capture loss restore the captured view. Wrong-device/old-timestamp events are explicit
hostile DOM fixtures. `viewport-pen-release.spec.ts` checks trusted zero-button loss before
delayed release, frozen hover, cancellation and fresh contact under the same event-driven
normalization as ink. Physical Wacom pan remains a manual hardware gap.

`viewport-throughput.spec.ts` collects bounded32/64-stroke diagnostics without ready waits
between strokes. Inspect its explicit `continuousPanVerdict`, publication count during
movement, pending age and cold-rebuild parity: collection completion is not a performance
pass. Temporary pan previews intentionally remain `updating` during the gesture; count their
publications separately from exact-ready frames. `pan-preview.spec.ts` asserts actual dense
held-pointer displacement, integer-pixel exact replacement and recent-ink/re-pan reversal;
`pan-preview-fractional.spec.ts` checks125% zoom/DPR2 alignment within one backing pixel.
Scheduling fixtures that hold RAF are correctness evidence, not latency measurements.
Maximum measured synchronous operations differ from browser Long Tasks and physical
input/GPU latency. Inspect snapshot count/cost and pan-translation cost separately; active
preview retains a complete published image before browser swap. The long-path performance
profile remains failed. Do not hide failed/cold observations
as warm-up or broaden this bounded collection into an acceptance claim.

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

## Rename recurrence diagnostics

The historical WEB-D2-08 rename failure was not reproduced during investigation, and no cause
or fix was established. The owner retired its task record; create a new defect if it recurs.
Investigation evidence and the distinction between failed runs and passing reruns remain in
[PR #7](https://github.com/AlexandrLesiv/Linefield/pull/7).

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

## WEB-G01 geometry sampling

The investigation baseline and first final run each had 120 passes and one WEB-G01 failure.
The cause was established: getAnimations()[0] selected shadow elevation, leaving the geometry
animation running. Freezing all surface/artwork tracks restores the exact source-card bounds.
WEB-G01 now checks x/y/width/height at the original tolerance and requires a geometry track;
WEB-M04 selects that geometry track explicitly for natural playback. No product motion changed.
Keep sampled geometry and natural playback evidence separate. The earlier failed runs remain
historical failures; latest full-suite results are recorded in PR #7.

Physical touch/stylus, system keyboards/IME, screen-reader walkthroughs, native hosts and
proficient Ukrainian linguistic review remain separate acceptance work. Headless WebKit touch
emulation is browser coverage, not physical Safari/iPhone certification.

## Buttons-only rotation

Owner-approved fixed15° steps/reset use Rust geometry and view-only state. The renderer applies
one Rust-derived affine transform to the original published image; accurate mapping remains
required for fresh ink. Rotation never creates history and is retained through Back/Resume.

- `rotation.spec.ts`: actual buttons,24-step/reset original-pixel parity under held RAF,
  unchanged snapshot count and≤2 image handles, bounded redacted rotation diagnostics,
  rotated input, pan cancellation, zoom, Back and one-stroke history.
- `rotation-affine.spec.ts`: three independent stroke locations at125%/DPR2 through rotation,
  fractional pan and another rotation before catchup. Independent expected positions plus
  each stroke's preview/exact bounds distinguish alignment from antialiasing refinement.
- `rotation-layout.spec.ts` and pending-release layout:320px enlarged en/uk night controls,
  visible unsaved opening and keyboard-visible≥44px controls inside the33dvh scrolling footer.
  Text presence alone does not prove visibility; assert range/viewport intersections.
- Isolated `Run rotation boundary`: malformed/stale/active/exhausted commands, source mapping,
  exact cardinal/subnormal normalization, diagonal regional extrema and conservative culling.
  `pan-failure.fixture.spec.ts` covers both pan and rotation affine failure, explicit display
  Retry, preserved owner/history and no automatic recovery. Fixture dispatch is not native input.

Current evidence is retained under ignored `.build-cache/web-memory/rotation-review/`; record
exact production and fixture build hashes separately. Preserve failed setup/visibility runs
alongside targeted reruns; do not describe their aggregate as a single clean full-suite run.
Held-RAF resource and synchronous timing observations are bounded diagnostics, not profile-v1
acceptance. Existing whole-path rendering and large-stroke Undo/Redo performance remain unresolved.
