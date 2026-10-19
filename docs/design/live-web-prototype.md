# Linefield live web gallery prototype

Current policy, decisions232–233 (2026-10-18): one consistent Linefield visual system and
one responsive Web gallery pattern at every viewport. The hidden platform selector and
platform-specific presentation, gesture and viewer simulations are removed. Legacy platform
and preview query parameters are ignored. This implements the owner's gallery request within
the authorized browser prototype, not a migration of future native hosts to web technology.

Owner direction recorded 2026-10-17 (decisions 214–225). Current executable source: apps/web.

## Selected design

- One responsive Web gallery pattern at every viewport.
- Narrow layout: large single-column artwork cards with an in-card name.
- Desktop: three centered CSS Grid minmax columns, capped at420px per card in a1372px container including24px gaps and32px side padding. Two columns below960 CSS px; one below640 CSS px. Actual window width determines layout, including tablets in portrait, landscape, split screen and windowed use.
- Monochrome selected. Light/dark follows browser/OS preference, with no theme switch. New drawing has a quiet page-adjacent neutral fill and a subtle 1px dashed border; hover does not shrink tile content. Paper is white in light mode and softly off-white in night mode; original sample assets remain unchanged.
- Native browser resize and scrolling, with a custom theme-colored overlay scrollbar consuming zero layout width. The native scrollbar is hidden only while the custom control is mounted; its thumb supports dragging, track paging and keyboard navigation. It disappears when there is no overflow or a drawing/dialog is open. No resizable mock-device frames. No platform picker, Reset samples or Browser simulation control is exposed, including through legacy query links.
- No visible Gallery heading, edited dates, resting tile shadows or numbered Untitled names. Pointer hover adds a soft shadow only, without outline or resizing; keyboard focus retains its visible ring.
- Every live card uses an ellipsis action menu at every viewport. Fine-pointer wide layouts reveal names/actions on hover or focus; narrow and touch layouts show them without hover. Browser right-click and long press remain untouched. No custom context-menu or swipe-reveal action path remains.
- Narrow populated galleries use the existing fixed + New drawing button. Wide galleries use the dashed New tile; an empty narrow gallery shows only the centered New tile. Future watch/TV read-only product capability requirements remain in their platform plans; URL-selected browser simulations no longer stand in for them.

## Motion contract

The whole card bounds, including its caption area, become one opaque themed drawing surface at (0,0), covering the viewport. It has no inset paper, nested frame or border. Return animates to the whole original card. Artwork has an independent geometry track on the same clock: measured gallery image bounds (including padding/caption allocation) to the full drawing bounds and back. The source card stays hidden until both shell and artwork match, avoiding the previous last-frame size jump. Resize settles against current destination geometry. A single surface owns the transition, including blank/New drawings. New drawing preserves the actual neutral tile color and its plus/name/dashed border at departure, blending to the current themed paper color while its content fades out; return reverses both tracks. Interrupted motion captures the current color and opacity before replacing animations. Resize settles animation; reduced motion skips it. Browser Back/Forward is reconciled after a transition so the latest URL and visible drawing agree.

Menu motion was inspected in /Users/oleksandr/projects/QAFETestTool/src/devtoolbar (popupMotion.ts, useSheetMorph.ts, pinContent.ts and boxGeometry.ts): share an anchor corner, resize the outer surface, pin content at its final dimensions, fade the content without scaling text, and stay opaque until collapse reaches the trigger before fading away. The prototype independently implements this behavior with Web Animations; it does not depend on that checkout or copy its framework code. Outside click, Escape, scrolling and resize use the same dismissal path. Animated blur is removed; opacity and geometry retain continuity. Reduced motion bypasses motion.

## Interaction and safety scope

Rename grows directly from the current menu bounds into a nearby anchored modal form: no intermediate collapse to the button. The nearest shared menu corner stays anchored; placement clamps to the visible viewport with 16px margins, tracks keyboard viewport changes and uses internal scrolling if height is constrained. Final placement survives motion cleanup. Form content stays at final size and fades in; the source card remains softly emphasized/named. Outside press, Cancel, Escape and successful Save morph from the current form bounds back to the live ellipsis, with pinned unscaled content fading out. Save commits once immediately, then resolves the replacement trigger after rerender; focus returns to that ellipsis. Inside-to-outside dragging does not dismiss. Resize settles an active exit, and reduced motion skips it. Delete commits once immediately, then morphs the current menu bounds, color and corners into the live Undo button within the preserved card slot. Outgoing actions fade out as Undo appears. The animated shell reaches exact target geometry before an opaque, single-owner handoff; the live Undo hit target and focus remain available throughout. Immediate Undo, disconnection, scroll and resize remove obsolete motion. The old artwork crossfades into the same-size, same-slot Undo card; focus moves immediately to Undo. Mutation never waits for animation completion, and immediate Undo cancels obsolete visual remnants. Reduced motion skips both effects.

New opens a transient blank preview outside the sample collection; closing it cannot create a tile because editing is not implemented. Repeated entry, Back/Forward and reload preserve sample count/order. Open/Rename/Delete/Undo operate on disposable in-memory fixtures. Delete holds the same slot with Undo until successful gallery departure. Legacy platform queries select no capability mode. Text names use textContent. History identifiers must match known drawings before DOM lookup. Focus returns to the originating card or creation control; Rename and Undo return to the Web ellipsis when present; menus and rename support keyboard dismissal. English and Ukrainian follow browser language at launch; translation review remains pending. Catalogues are shared/localization/en.ts and uk.ts, with semantic IDs, translator context and typed argument metadata in catalog.ts. Generated web resources are imported by the prototype; Apple, Android, Windows and Linux resources are generated from the same validated catalog. Type checking enforces keys and named arguments; WEB-R01 checks catalogue parity. See shared/localization/README.md for generation, constrained plural rules, platform overrides and native integration limits. Interpolation uses literal substitution and DOM text, never HTML.

No network, file import, authentication, persistent storage, Rust editing, drawing input or native app implementation is introduced. Reload discards sample mutations; known drawing paths reopen the corresponding fresh sample or transient blank preview, while unknown initial paths return to the gallery. The Vite server binds loopback only. The production build is a distributable browser prototype, not a completed drawing app. Bounded development diagnostics include event/outcome/sequence/timing only, never names or content. Dependency installation disables lifecycle scripts.

## Scope and approval

Decision233 selects the existing Web appearance and interactions across responsive widths.
It supersedes platform-specific browser treatments in decisions214–231. Native implementation,
engine, persistence and FFI remain gated. This does not change future viewer-host requirements.
The combined ui_ux_designer reviews this gallery refinement and future identified design handoffs.

## Review and reproducibility

From repository root: pnpm install --ignore-scripts --frozen-lockfile; pnpm web:dev.
Open http://127.0.0.1:65142/. Use browser device emulation/window resize and color-scheme/reduced-motion emulation for review. Old ?platform and ?preview links load the same Web interface; query strings are retained without selecting a UI mode. Open drawings use /drawing/<id>, including /drawing/preview-new for the transient blank preview. The host must serve the Vite entry document for these paths. Back/Forward and direct-entry Back remain in-app.

Styles are authored in Vanilla Extract .css.ts modules with a typed semantic light/dark theme contract; component styles use exported local classes; globals cover reset/document integration only. Vite emits static CSS using the [official integration](https://vanilla-extract.style/documentation/integrations/vite/). Stable DOM query hooks remain shared with browser tests but are not global styling selectors.

Checks: pnpm check; pnpm web:build; pnpm web:test. WEB-ONE01–04 cover ignored legacy
queries, one responsive action pattern, breakpoint/locale/theme continuity and existing flows.
SEC-WEB-QUERY-01 ensures query values cannot restore a platform/capability simulation.
See [P05-G01](../../tasks/P05-G01.md) and current evidence.
Current browser evidence does not establish native viewer enforcement or device behavior.


## Selected drawing screen implemented (decision234 / P05-D01)

The selected slim left rail/top settings reference is now implemented as disposable UI over the existing sample/blank artwork. Pen/Select/Eraser/Line/Shapes select presentation modes; relevant integer ranges update local settings and an isolated sample only. Color and settings are visibly unavailable. Default width8, opacity100%, smoothing25%; fixed zoom100%. The screen explicitly discloses non-editable artwork. Normal Tab traversal reaches controls; idle Escape does not navigate. Local pointer cancellation, stale-event fencing and deliberate-focus preservation are tested.

Current acceptance requires exact-build browser tests and specialist/independent review.
