# Linefield live web gallery prototype

Current policy, decisions232–233 (2026-10-18): one consistent Linefield visual system and
one responsive Web gallery pattern at every viewport. The hidden platform selector and
platform-specific presentation, gesture and viewer simulations are removed. Legacy platform
and preview query parameters are ignored. This implements the owner's gallery request within
the authorized browser prototype, not a migration of future native hosts to web technology.
The dated iteration records below remain historical evidence only.

Owner direction recorded 2026-10-17 (decisions 214–225). Current executable source: apps/web.
This supersedes gallery-v1 through gallery-v4. Those experimental source/boards were removed at the owner's request, after carrying forward six original PNG drawing fixtures and four selected v3 watch reference images. Competitor source links remain in gallery-competitor-screens.md. No schema approvals or native implementation approvals were changed.

## Selected design

- One Web gallery; Native Showcase, the multiple-gallery experiment and platform simulations are retired.
- Mobile A: large single-column artwork cards with an in-card name. The owner referred to “screen 2”; the attached selected artwork-card example and declared interpretation determine A. Compact rows/B are retired.
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

Styles are authored in Vanilla Extract .css.ts modules with a typed semantic light/dark theme contract; plain CSS source has been retired. Vite emits static CSS using the [official integration](https://vanilla-extract.style/documentation/integrations/vite/). The stable semantic selectors remain shared with browser tests.

Checks: pnpm check; pnpm web:build; pnpm web:test. WEB-ONE01–04 cover ignored legacy
queries, one responsive action pattern, breakpoint/locale/theme continuity and existing flows.
SEC-WEB-QUERY-01 ensures query values cannot restore a platform/capability simulation.
See [P05-G01](../../tasks/P05-G01.md) and [current evidence](../../apps/web/quality/web-one-gallery/README.md).
Native-preview-only tests are explicitly retired; historical reports retain their original claims.
Current browser evidence does not establish native viewer enforcement or device behavior.

## Historical iteration records — superseded where platform-specific

The following dated records explain previous implementations and evidence. Decision233 removes
their platform simulation branches; shared resource and retained Web behavior records still apply.

## Undo return and mobile refinement

Successful Web Undo restores the sample immediately and morphs the current Undo surface into the restored ellipsis. Content fades without scaling text. If Delete is still moving, Undo captures its current appearance before taking over. The focused live target stays available throughout; next input, target detachment, scroll, resize and reduced motion settle obsolete presentation safely. Native previews do not receive this Web-only animation.

Approved mobile treatment: Delete pushes the main artwork left out of its clipped slot after the explicit action, revealing Deleted/Undo underneath without moving neighboring tiles. Undo slides the artwork back. Mobile Rename closes the swipe rail and fades in a compact form while the drawing remains visible. These proposals are approved and implemented by decision 221: artwork slides within the preserved clipped slot, Undo reverses from the current outgoing position, and Rename uses opacity-only entry/exit while closing its rail. Web behavior is unchanged.

Decision 221 acceptance: WEB-URL01–URL03 cover unchanged selector addresses/history, clean paths, direct entry/reload/Back, malformed IDs and viewer restrictions. Mobile Delete/Undo and Rename motion checks are recorded in apps/web/quality/web-mobile-routes.

## Direct swipe and shared resources (decision 222)

Delete now moves the complete visible card, including its revealed action rail, out of the clipped slot over 320ms. Immediate Undo takes over the current full-card presentation and retracts artwork over the rail as it returns. Direct drag follows the active pointer without committing Delete; release snaps to open/closed. Foreign pointers are ignored; vertical intent, pointer cancellation, lost capture and resizing settle safely. Actual single-column layout enables swipe only on iPhone/Android; iPad always uses ellipsis. Keyboard/assistive action access remains available. WEB-SL01–SL04 and WEB-SI01–SI05 cover adaptation, direct movement, cancellation, interrupted settling and early Undo.

Shared catalog validation and eleven LOC tests run in pnpm check. pnpm locales:generate updates deterministic native/web outputs; pnpm locales:check rejects stale, missing or unexpected output. pnpm locales:native-check validates XML and compiles gettext where tools exist, explicitly reporting missing tools. Generated native resources are prepared for future host adapters; they are not evidence of native integration or linguistic review.

## Undo return refinement (decision 223)

Non-swipe Undo fades the restored artwork/name in on the same 300ms timeline as its control morph. Native context-menu desktops receive the artwork fade without a fabricated ellipsis. Settled and interrupted mobile Undo both return the complete artwork/action rail layer; the rail remains exposed during the initial return and closes during its latter phase. A rebuilt layer handles rerendered deleted cards. Live data/focus restores synchronously; visual copies stay inert and are removed on interruption/reduced motion. WEB-UR01/UR02 cover desktop opacity and settled/rerendered mobile rail return.

Generated locale resources and disposable apps/web/quality/web-* binary captures are Git-ignored; source catalogues/generators, reports/manifests and app/design assets remain versioned. See quality/README.md and shared/localization/README.md. Current verification: apps/web/quality/web-undo-return.

## Shared colors and iPhone creation (decision 224)

Decision225 supersedes the temporary top action with the owner-selected bottom-right glass compose button. Empty galleries retain the centered creation tile without a duplicate floating action. Cancel/Rename use neutral hover and stronger pressed fills, without changing shape or layout; keyboard focus remains visible. Light/dark scheme values are authored once in shared/theme and consumed by a typed web theme adapter. Decision225 authorizes softer charcoal night colors and off-white display paper; the light palette remains unchanged. Future native hosts can map semantic colors to their native resources while retaining system materials and accessibility behavior. Current evidence: apps/web/quality/web-header-theme. Apple creation/Back controls approximate the reference with static translucent material and solid accessibility fallbacks; no native material implementation is claimed.

Decision225 final controls: iPhone compose is a56px fixed circle20px from trailing edge and16px plus bottom safe area, with88px plus inset gallery clearance. Reduced transparency/greater contrast uses opaque surfaces for controls and enclosing Apple toolbars; forced colors uses system colors. Material background blur is static, not an animated content blur. Reference: [Apple material guidance](https://developer.apple.com/design/human-interface-guidelines/materials). Browser visuals approximate the supplied Notes reference; production native hosts should use native materials.

Decision226: restored paper and artwork backing blend from the prior deletion surface together with the existing300ms content/morph timeline. Tile opacity stays1; live actions/focus restore immediately. Appearance changes and interruptions settle obsolete visuals. WEB-UP01–UP03 cover both schemes, desktop paths, reduced motion and live theme change. Evidence: apps/web/quality/web-undo-paper.

Decision227 migrates authored theme/locales to typed TypeScript with unchanged values and generated resources. The iPhone compose transition gains a decorative edge while detached from its full-screen endpoint; it does not change artwork geometry or add a permanent canvas frame. WEB-CE acceptance and catalog migration evidence are recorded in apps/web/quality/web-typed-catalogs.

## Continuous action backdrop and tile elevation

Decision229: the Rename/Delete menu starts a single shared scrim using the existing dialog dim color. The same layer stays through the anchored Rename handoff; a transparent browser-dialog backdrop prevents double dimming. Dismissal and Delete fade it, with outside presses consumed. No blur is introduced. The detached drawing/New surface captures source hover elevation, keeps it during travel and fades near the full-screen destination; return samples current presentation and the destination shadow. The steady canvas remains shadowless. Shared colors use primitive → semantic → platform-adapter layers with unchanged resolved values. Decision230 adds native resource generation; native host consumers remain pending.

Decision231: web is the first implementation platform because the owner can develop and assess it most confidently; macOS remains the primary product target. Existing native architecture and shared Rust responsibilities remain. This gallery prototype is the current review surface, not a completed web editor.

WEB-ME01/ME02: source cards retain their existing hover shadow while Rename/Delete is open and until dismissal completes, even when the backdrop removes pointer hover. Rename preserves its existing source emphasis. Evidence: apps/web/quality/web-menu-shadow.

## Selected drawing screen implemented (decision234 / P05-D01)

The selected slim left rail/top settings reference is now implemented as disposable UI over the existing sample/blank artwork. Pen/Select/Eraser/Line/Shapes select presentation modes; relevant integer ranges update local settings and an isolated sample only. Color and settings are visibly unavailable. Default width8, opacity100%, smoothing25%; fixed zoom100%. The screen explicitly discloses non-editable artwork. Normal Tab traversal replaces the former Back-only trap; idle Escape no longer navigates. Local pointer cancellation, stale-event fencing and deliberate-focus preservation are tested.

[Exact browser evidence](../../apps/web/quality/web-drawing-v2/README.md) records106 full-suite passes, production Chrome/WebKit smoke, designer artifact review and independent implementation/security review. No native/design review/engine/persistence approval or acceptance is inferred. [S00B follow-up](../localization-web-readiness.md) records additional language/region/Unicode checks and remaining linguistic/native gaps.
