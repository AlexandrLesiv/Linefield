# Handoff snapshot — 2026-10-17

Use /Users/oleksandr/projects/linefield, not the historical native-sketch checkout. Read AGENTS.md, this snapshot, docs/design/live-web-prototype.md, docs/design/shared-resources-plan.md and tasks/P05.md before continuing. Older entries below are dated evidence, not current instructions.

- Develop web first, then macOS; macOS remains the primary product target. Shared Rust document/editing/persistence semantics, Skia/CanvasKit and native host controls remain selected. Concrete engine/storage/binding contracts and native designs still need their specified approval; the current app is a memory-only gallery prototype, not an editable drawing app.
- apps/web uses Vite, strict TypeScript, semantic HTML and Vanilla Extract. Normal entry shows no review controls; /?preview=1 or a valid /?platform=ios exposes them. Selection never changes URL/history. Drawings use /drawing/<id>; New is transient and does not add tiles.
- Preserve centered responsive desktop cards, single-column mobile artwork cards, dashed New tile, overlay scrolling, theme/locale from browser preferences, and no WebKit tap flash. Web uses ellipsis; native desktop previews use pointer-positioned context menus; iPad uses ellipsis; phone previews swipe only in single-column layouts. No long-press or full-swipe deletion. iPhone uses a bottom-right glass compose button with opaque accessibility fallbacks.
- Motion preserves whole-tile/artwork geometry, color and elevation; no animated menu blur. One backdrop starts with Rename/Delete and persists through anchored Rename. Web Delete morphs to Undo; Undo fades restored artwork and morphs to ellipsis. Mobile Delete/Undo slides the entire artwork/action rail; Rename fades a compact form. Latest fix retains source tile shadow while the menu is open and through dismissal/Rename handoff.
- Shared trusted data-only TypeScript catalogs author en/uk localization and primitive → semantic → platform theme layers. Preserve current colors. Web consumes shared resources; locale and color generators emit native resources. Native host consumption/device validation is still pending. See shared resource plan for further sharing candidates and boundaries.
- Verification: previous complete browser run passed 126 cases (web-clean-header). Latest menu-shadow change passed 12 focused cases, root checks (24 catalog/resource tests), web lint/format and production build; independent code review found no issue. Full browser suite was not rerun after adding the three menu-elevation cases. Exact latest hashes/evidence: apps/web/quality/web-menu-shadow/README.md. Latest bundles: index-BSv1zgB7.js and index-s1DoqqA6.css.
- Start/check from root: pnpm install --ignore-scripts --frozen-lockfile; pnpm web:dev (http://127.0.0.1:65142/); pnpm check; pnpm web:build; pnpm web:test. Chrome and pinned Playwright WebKit are required for the full browser suite.
- Working tree has extensive intentional uncommitted/untracked implementation and documentation, based on fa38072da22015a965da145d6635e4e6da8ba8d7. Preserve it; do not reset/clean or recreate the prototype. Before a merge, inspect and organize a reviewed checkpoint and rerun the full suite on that snapshot. No merge/publication is authorized. Generated resources, dependencies, build outputs and disposable browser captures are ignored; authored catalogs, app fixtures, intentional design references and small evidence reports belong in Git.

No implementation task is currently in flight. Continue with the owner's next scoped request; this handoff is not authorization to begin the full editor.

# Current direction: web first, macOS primary — 2026-10-17

Decision231 supersedes macOS-first development sequencing: implement web first because of the owner’s stronger web experience, then macOS; macOS remains the primary product target and iPhone/iPad the next native priority. P05 no longer depends on macOS S08. Shared Rust semantics, Skia/CanvasKit, native controls and contract/review boundaries remain. Active instructions, platform roadmap and tasks reflect this order; dated approvals/history remain unchanged. Normal web entry now omits the entire review-controls section, including Reset samples and Browser simulation; explicit preview links retain it.126browser tests,24catalog tests, sourcechecks/build and independent design/code review pass. Evidence:apps/web/quality/web-clean-header. Preview http://127.0.0.1:65142/. Existing memory-only prototype is not yet a drawing editor. Earlierentries historical.

# Current native theme resources and opt-in preview controls — 2026-10-17

Decision230:29 deterministic ignored native theme outputs (Apple namedcolors, Android day/night, WinUI Light/Dark, GTK namedcolors) share23semanticroles with the web. Generation/stale checks and missing-only bootstrap are installed; source colors unchanged. Normal web entry omits platformpicker; ?preview=1 orvalid?platform optsin without selector URL/history changes.126browser tests,24catalog/resource tests, sourcegates/build and actualXML/Androidresourcecompile pass; independent code/design review passed. Evidence:quality/theme-resources and apps/web/quality/web-preview-controls. Apple/WinUIcompile,GTKruntime and nativeappconsumers remain pending. Preview http://127.0.0.1:65142/. Earlierentries historical.

# Current layered theme and action elevation — 2026-10-17

Decision229: shared primitive palette → semantic light/dark roles → web adapter, preserving all44 prior color values. One backdrop begins with Rename/Delete and stays through Rename; native context-menu retargeting remains intact. Hover shadow persists while drawing/New tiles expand and fades near full-screen.123 browser tests,20 catalog tests, source checks and production build pass; independent design/code review passed. Initial right-click regression and repair retained in apps/web/quality/web-theme-layers. Native theme adapters and device acceptance remain pending. Preview http://127.0.0.1:65142/. Earlier entries historical.

# Current touch feedback and app-local evidence — 2026-10-17

Decision228: WebKit tap highlight disabled explicitly including native selects; keyboard focus/pressed feedback retained. New drawing gets the same soft fine-pointer hover shadow as drawing cards. All13 browser evidence folders moved to apps/web/quality with original176files preserved; active links/capturepaths/ignores updated, shared rootquality remains.115browser tests (including actual headlessWebKit),18catalog tests, sourcechecks and productionbuild pass; independentreview passed. Evidence:apps/web/quality/web-touch-feedback. Preview http://127.0.0.1:65142/. Earlierentries historical.

# Current typed catalogs and compose perimeter — 2026-10-17

Decision227: authored locales/theme now use trusted data-only TypeScript with runtime validation and unchanged generated resource bytes. iPhone compose expansion/collapse has a decorative perimeter while moving, with borderless steady canvas and interruption/reduced-motion cleanup.112 browser tests,14 locale/authoring tests,4 theme tests, source gates, clean-output bootstrap and production build pass; independent review and sampled designer review passed. See apps/web/quality/web-typed-catalogs for exact source/build evidence. Native theme generators/host integration remain pending. Preview http://127.0.0.1:65142/. Earlier entries historical.

# Current Undo paper continuity — 2026-10-17

Decision226: desktop Undo blends deletion surface to themed paper over300ms with matched artwork/title backing, preserving opaque shell and immediate focus. Theme changes/interruption settle presentation; mobile slide unchanged. Final frozen107/107 browser tests,12locale tests,4theme tests, type/lint/format/size checks and production build pass. Independent17-case review and designer finalcaptures passed. Evidence:apps/web/quality/web-undo-paper. Cross-platform reduced-transparency policy documented; shared source/web theme integrated, native themegeneration/consumption pending. TypeScript authoring proposal documented; JSON restriction relaxed but no formatmigration performed. Preview http://127.0.0.1:65142/. Earlier entries historical.

# Current shared theme and Apple compose — 2026-10-17

Decisions224–225: owner-selected bottom-right glass compose replaces temporary topNew on iPhone. Dialog hover/pressed feedback, semantic shared theme catalog, softer charcoal night surfaces/off-white display paper and opaque accessibility fallbacks are implemented. Final101 browser tests,12locale tests,4theme tests, type/lint/format/size checks and production build pass. Independent review resolved the reduced-transparency toolbar precedence issue and reported no remaining findings; combined designer accepted final captures. Exact-source/build evidence: apps/web/quality/web-header-theme. Preview http://127.0.0.1:65142/. Browser approximation only; native material/device validation remains pending. Earlier entries are historical.

# Current Undo return and artifact policy — 2026-10-17

Decision223: desktop Undo fades artwork/title with an opaque card/focus surface. Settled mobile Undo returns both artwork and action rail, then closes the rail; early Undo and rerender fallback remain continuous. Generated locales and apps/web/quality/web-* image/video captures are Git-ignored, while authored catalogues/generators, reports/hashes, app assets and design references remain versioned. Commands regenerate missing locale outputs; existing stale outputs still fail check. 86 browser tests, 12 locale tests, code checks and production build pass. Evidence: apps/web/quality/web-undo-return. Preview http://127.0.0.1:65142/. Memory-only browser prototype; native implementation/device testing remains pending. Earlier entries are historical.

# Current direct swipe and shared locales — 2026-10-17

Decision 222: Delete preserves the full visible card/action rail; swipe follows the active finger and handles interruption/cancellation. iPad always uses ellipsis; iPhone/Android swipe only with one actual grid column, otherwise ellipsis. Shared en/uk catalog generates web, Apple, Android, Windows and Linux resources with validation. All 82 browser tests, 11 localization tests, strict checks and production build pass; independent review passed 22 focused browser cases. Eight XML and four gettext actual/synthetic resources validated. Exact-source evidence: apps/web/quality/web-shared-locales-swipe. Review http://127.0.0.1:65142/. Native resource integration/device E2E and linguistic review remain pending; memory-only browser prototype. Earlier entries are historical.

# Current paths and mobile motion — 2026-10-17

Decision 221: preview platform changes no longer alter URL/history; drawings use /drawing/<id> with direct entry/reload/Back support. Mobile Delete slides artwork away to reveal same-slot Undo, Undo slides it back, and Rename retracts swipe actions and fades a compact anchored form in/out. All 73 browser tests, strict checks and production build pass. Fresh independent review found no actionable issues. Exact-source evidence: apps/web/quality/web-mobile-routes. Review http://127.0.0.1:65142/; memory-only prototype with no actual editing/native implementation. Earlier entries are historical.

# Current blank-preview and Undo fixes — 2026-10-17

Decision 220: New opens a transient blank preview without adding gallery entries; Web Undo morphs back to the restored ellipsis and safely takes over unfinished Delete motion. 63 browser tests, strict checks and production build pass. Fresh independent review passed 8 scoped cases and 2 native-preview gesture regressions with no findings. Exact-source evidence: apps/web/quality/web-preview-undo. Mobile Delete push-out and Rename fade-form are proposals pending owner review, not implemented. Review at http://127.0.0.1:65142/. Samples remain memory-only.

# Current platform-action refinement — 2026-10-17

Decision219: centered three-column desktop gallery with420px cap; Delete menu morphs into same-slot Undo with one opaque visual handoff; native mobile previews use swipe-only actions; native desktop context menu follows the pointer; ellipsis is Web-only; animated menu blur removed. All55 browser tests, strict checks and production build pass. Fresh review findings corrected and independently reverified. Exact-source evidence: apps/web/quality/web-platform-actions. Review at http://127.0.0.1:65142/; samples remain memory-only. Earlier entries are historical.

# Current return-motion fixes — 2026-10-17

Decision 218: Rename dismisses on outside press and morphs back to its live ellipsis after Cancel, Escape or successful Save. New drawing color, plus/name and dashed border transition gradually in both directions. All 44 browser tests, strict tooling checks and production build pass. Exact-source evidence: apps/web/quality/web-return-motion. Review at http://127.0.0.1:65142/; samples remain memory-only. Earlier entries are historical.

# Current continuity fixes — 2026-10-17

Decision 217: compact document-plus/New iPhone toolbar, Rename anchored near its source menu with keyboard/viewport clamping, and independently measured artwork geometry within whole-card transitions. 34 browser tests, strict tooling checks and production build pass. Current exact-source evidence: apps/web/quality/web-continuity. Review remains at http://127.0.0.1:65142/; samples are memory-only. Earlier iteration evidence below is historical.

# Current feedback fixes — 2026-10-17

Decision 216: iPhone/narrow iPad creation is now an attached bottom toolbar; the custom scrollbar overlays content with no reserved width. Hover uses a soft shadow; committed Delete fades the full menu and crossfades artwork into same-slot Undo. Preview remains http://127.0.0.1:65142/. 25/25 browser tests, tooling checks and production build pass; fresh independent and combined designer reviews found no blockers. Current verification: apps/web/quality/web-feedback. Samples remain memory-only; native implementation is not included. Earlier iteration evidence below is historical.

# Current refinement — 2026-10-17

Decision 215: apps/web now uses Vanilla Extract typed styles, en/uk JSON catalogues with semantic IDs, bounded auto-fill/minmax gallery tracks and stable scrollbar gutters. Web uses overflow only; native-platform previews retain gestures. Rename morphs directly from menu; Android corners are consistent and New has a subtle dashed border. Same http://127.0.0.1:65142/ preview. 18 browser tests plus tooling/build checks pass; independent and designer reviews complete. See apps/web/quality/web-refinements. All changes remain uncommitted and samples memory-only.

# Current: Vite live gallery prototype — 2026-10-17

Owner decision 214 replaces the gallery experiments with apps/web. Read docs/design/live-web-prototype.md and apps/web/README.md. Run pnpm web:dev and open http://127.0.0.1:65142/. Monochrome, mobile artwork cards, platform selector, full-viewport whole-tile transitions and anchored menu morph are current. Browser/OS controls theme and viewport. Sample mutations are memory-only. Native/Figma, drawing engine and persistence remain gated. Original v3 watch references are in docs/design/references. Old gallery-v1–v4 directories and their server were removed at owner request. Current tests/review evidence: apps/web/quality/web-prototype. No commit/push/merge requested.

## Historical work log

The entries below describe superseded experiments, not current deliverables or executable instructions. Their old local links/ports are retired.

# Current prototype repairs — 2026-10-17

Native Gallery v4 owner feedback repaired at the existing localhost65141/gallery-v4/ URL.
Read docs/design/gallery-v4/repairs.md and repair-evidence.json for current hashes, tests and limits.
Watch sizing/paging, swipe actions, menu state, blank/New/Back animation, Monochrome palettes,
FAB/New feedback and native scrollbar styling are updated. Seven focused and twelve regression
suites pass; three independent findings fixed/retested; combined designer reviewed stills.
Native/Figma approval and application implementation remain pending. No commit/push/merge.

# Current agent configuration — 2026-10-17

Decision 213 restores one ui_ux_designer; the separate UX/UI role files are retired.
Read docs/design/roles.md and .codex/agents/ui_ux_designer.toml. One designer owns the
feature flow, native visuals, adaptive Figma, motion and integrated design review.
Engineers, fresh reviewer and owner Figma approval retain their responsibilities.
Older split-role entries below are historical. Runtime discovery in a new Linefield-scoped
session remains unverified; no existing running agent was renamed. Gallery v4 work below
remains the current design deliverable, with Figma/native verification still pending.

# Current: Native Gallery v4 — 2026-10-17

Owner authorized recommended redesign plus Compose Material 3 Android plan (211–212).
Review docs/design/gallery-v4/index.html and docs/design/native-gallery-v4-plan.md.
Run node scripts/serve-design.ts; open http://127.0.0.1:65141/gallery-v4/.
Ten platform Light/Night pairs use the live renderer; controls vary platform, viewport, input,
four neutral palettes, contrast, motion and scenarios. Tablet windows/orientations are explicit.
12 browser behavior suites passed; 25 captures; four independent review findings fixed/retested.
Evidence/source hashes: docs/design/gallery-v4/review-evidence.json. No native UI claims.
Plan/agent/task references now use Android Compose Material 3; shared Rust commands unchanged.
Deletion UX now stages removal with per-item Undo; concrete durable staging/finalization contract
must be reviewed before real file deletion. Historical approved DBML snapshots unchanged.
Next: owner visual feedback, editable adaptive en/uk Figma and native component feasibility,
then identified design approval before application implementation. Work remains uncommitted;
no push/merge/runtime app. Older entries below describe historical stages.

# Gallery exploration 02 delivered — 2026-10-17\n\nOwner authorized six complete Procreate-led variants after reviewing the improvement plan.\nSee docs/design/gallery-v2/README.md and review-evidence.json. Review at\nhttp://127.0.0.1:65140/gallery-v2/ (ephemeral loopback server). Each variant includes all nine\nplatforms in Light/Night, equal fixtures/content coverage, state/motion boards and a semi-interactive\nWeb gallery. 108 base PNGs + 54 state boards + 30 extras. No v2 SVG exports.\nUX/UI and fresh reviewer participated; corrected findings and verification limits are recorded.\nAwait owner preference, adaptive Figma/native feasibility and identified approval. No app code,\ncommit, push or merge. Older pending-production notes below are historical and superseded.\n\n# Gallery visual preference — 2026-10-17

Owner prefers Procreate's uncluttered gallery. Treat artwork-first, restrained chrome as the
primary direction for all six alternatives; retain full New tile, native platform patterns,
light/night pairs, watch paging and semi-interactive Web. Not a final design approval.
Read docs/design/gallery-improvement-plan.md and gallery-competitor-screens.md.

# Gallery redesign requirements and research — 2026-10-17

Owner found v1 insufficiently native and varied. Read docs/design/gallery-improvement-plan.md.
Next design package: six complete variant pages, each all nine hosts and Light/Night pairs,
identical fixtures and coverage; PNG only, no SVG deliverables needed. First square New tile
on editors; one drawing per snapped watch page. Include state/motion examples and semi-interactive
Web prototype per variant with disposable samples and external review controls.
Competitor screenshot research and UX/UI synthesis completed: eight official visual references,
observations separated from inferred rationale. See docs/design/gallery-competitor-screens.md
and http://127.0.0.1:65139/references/index.html (ephemeral local server). All eight images
loaded in the browser. New variant PNGs and semi-interactive Web prototypes remain to be produced;
the current handoff is the revised plan and source-reference board. Current v1 files remain historical, not newly approved.
No new application implementation or Figma approval. The plan remains for owner review before the redesigned artifact batch.

# Gallery design exploration delivered — 2026-10-17

User committed plan at fa38072, then authorized competitor/UX/UI collaboration and gallery
screen designs. Decision210. See docs/design/gallery-v1/README.md and review-evidence.json.
Delivered27baseconcepts (3directions ×9hosts),6macOSlocale/stateextras,33SVG/PNGpairs,
4comparison sheets and overview.png. Local review index at http://127.0.0.1:65139/
(loopback ephemeralserver); persistent files under docs/design/gallery-v1/.
A Quiet Studio, B Structured Workshop, C Warm Archive. Watch/Wear/TV viewonly.
Research/UX/UI completed scoped work; fresh independent review findings resolved.
All5review-page sources formatted/under200lines; lint/syntax and all9browserselectors pass.
Await owner preference/traitselection. These are NOT approved Figma or appimplementation.
Next deepen selected foundation/gallery into editable adaptiveFigma, en/uk, states/motion,
with native feasibility and identified owner approval. Otherhost deepstates stillpending.
All work is uncommitted after user's plancommit; no push/merge/applicationcode.

# S02 v3 approved — 2026-10-17

Owner approved hosted Version8 and the exact six-file reviewed schema/defaults snapshot
(decision209). See docs/reviews/S02-v3-approval-2026-10-17.md and quality/S02-v3-review.json.
Original DBML/schema notes retain pending wording as immutable reviewed evidence; approval
metadata supersedes that status. All6 hashes checked unchanged. No status republication.
Next: native visual foundations S00A, gallery-first S02L, then canvas/selection UX/Figma.
Exact revised ABI/ownership, numeric precision evidence and native feasibility still require
engineering work; implementation remains unstarted. Routine defaults are delegated.
Older pending-approval notes below are historical.

# S02 v3 ready for owner review — 2026-10-17

Private dbdocs project now shows Version8: S02 v3 regional coordinates, PENDING OWNER REVIEW.
URL: https://dbdocs.io/AlexandrLesiv/Linefield-S02-proposal-v1
Source: docs/database/review.dbml; defaults/constraints/cases: docs/database/schema-v3.md.
All four official DBML validations and structural/parity/history checks passed.
Fresh independent review closed logging-correlation and stale-layout findings; no remaining
actionable findings in scope. See quality/S02-v3-review.json for exact reviewed hashes/results.
Browser verified Version8, 14tables/122fields, diagram and private invited-only access.
No implementation or numerical span evidence. Await owner schema review; do not infer approval.

# S02 v3 DBML handoff — 2026-10-17

Owner delegated recommended defaults and wants DBML review (decision208).
Current drawing/catalog/jobs/review DBML is v3 pending review, with regional samples,
stroke placement AND saved viewport center. 14 tables/122 columns/8 same-file relationships.
Read docs/database/schema-v3.md and quality/S02-v3-review.json for selected defaults, checks
and publication status. Historical local v2 sources are preserved under docs/database/history/s02-v2;
original approval/reviewer hashes remain untouched.
No exact numerical span claimed, app implementation, migrations or ABI compilation.
Do not resume preference questionnaires; prepare evidence/contracts within delegated scope.

# RC11-A selected — 2026-10-17

Decision207 selects X-right/Y-down in document and normalized canvas coordinates.
Canvas-local origin is top-left; document origin stays fixed while panning; Rust maps
through the canonical viewport center. Hosts convert native event/view conventions;
region/local Y share direction and RTL never mirrors artwork.
All RC1–RC11 directions are selected. Older pending notes below are historical.
Next: consolidated revised DBML/exact typed interfaces/ownership/transform/rendering/
selection test packet, with an evidence-backed stroke-span proposal. No app code,
schema publication or executable precision evidence is implied by recording this choice.

# Next question issued — RC11 orientation (2026-10-17)

RC9-A and RC10-A remain selected. RC11 now asks whether shared document/canvas coordinates
use X-right/Y-down (A recommended) or document Y-up with normalized canvas Y-down (B).
See the final section of docs/reviews/engineering-budgets-v1.md. Pending owner answer; the
earlier blank RC11 is not approval. Scoped read-only Rust review found no existing selection.
After this choice, prepare the consolidated concrete packet and evidence-based span proposal;
do not create filler questions or pull feature-specific input/handle UX out of its design review.

# RC9/RC10 selected — 2026-10-17

Owner selected RC9-A (flat region/local sample and placement columns) and RC10-A
(distinct canvas/world types, Rust-owned viewport and pointer transform calculations).
See decisions 205–206 and the second batch in docs/reviews/engineering-budgets-v1.md.
RC11 was submitted blank; no RC11 question is defined in that packet, so do not infer an
answer or invent a missing choice. Older pending RC9/RC10 notes below are historical.
Next deliverable remains the consolidated revised DBML/exact typed-interface/ownership/
normalization/transform/render-and-selection conformance packet. Exact supported per-stroke
span needs numerical evidence; direction approval is not compiled ABI, unseen schema,
runtime implementation or publication authority. Preserve S02 v2 approval history.

# Edge-case workflow update — 2026-10-17

Decision204 adds explicit edge-case design/implementation review in docs/quality.md, task
template section6 and all existing role instructions. No new permanent agent or model change.
Implementers own cases/tests, UX/UI failure states, reviewer independent challenge, lead
readiness, build reliability future evidence validation. Automated field validation is planned
in S01, not installed. RC9/RC10 were subsequently selected in decisions 205–206; see current status above.

# Pending second region batch — 2026-10-17

After RC7/RC8 approval, owner asked for next batch. Proposed RC9 flat region/local sample
and placement column delta; RC10 distinct canvas/world DTOs with Rust viewport ownership
and pointer-driven move/scale boundaries. Neither approved yet. These accept semantic
proposals for the final visualized DBML/exact ABI packet, not unseen layout or code.
Exact per-stroke numerical span remains pending evidence. Read engineering-budgets-v1.md
final section. No schema mutation/publication, compiled binding or runtime test performed.

# All region policy choices recorded — 2026-10-17

Owner selected RC7-A and RC8-A (decisions 202–203): finite f64 local coordinates [0,65536),
Rust checked carry/borrow and canonical +0; first original sample as immutable source anchor,
stored region/local placement anchor and positive cumulative scale. Original points unchanged;
source anchor is not the UI scaling pivot. All RC1–RC8 settled through decision203.
Next deliverable: one concrete revised DBML/typed-interface/normalization/anchored-transform/
cross-region rendering and selection test packet for owner review. Exact per-stroke span
requires precision evidence; no arbitrary number or achieved accuracy claim.
Preserve S02 v2 historical approval snapshots. No revised schema publication, runtime code,
executable precision probe or foreground tests performed by recording these decisions.
Older pending-choice notes below are superseded; do not re-ask RC1–RC8.

# Pending region batch 1 — 2026-10-17

Owner requested all remaining independent questions and dependencies. Read-only Rust review
identified RC7 local interval ([0,65536) vs centered) and RC8 anchored transform (first sample
vs original-bounds center as immutable source). Both pending. See final questionnaire in
docs/reviews/engineering-budgets-v1.md. RC1–RC6 remain settled through decision201.
Second review depends on these choices plus precision evidence: exact per-stroke span,
complete schema/typed-interface amendment and rendering/selection conformance/limitations.
Do not invent more preference questions for ordinary field naming/validation; prepare one
concrete packet. No executable probes, runtime implementation or schema publication this turn.

# Coordinate policy batch completed — 2026-10-17

Owner selected RC5-A and RC6-A (decisions 200–201). All RC1–RC6 policy choices are settled:
i64 region X/Y; 65,536-unit regions; per-sample region/local positions; Rust normalization;
tested per-stroke precision envelope; native canvas-local samples mapped by Rust using a
captured mapping generation. Region size is not a cap on whole-canvas or per-stroke span.
Exact stroke-span number remains to be proposed with precision evidence.
Next: one concrete anchored-transform/DBML/typed-interface/normalization and conformance
packet for owner review. Preserve historical S02 v2 approval hashes; do not silently implement
old global-coordinate fields or invent approval of replacement columns/signatures.
No application implementation, published schema update or foreground/device tests this turn.
Older pending RC notes below are superseded; do not re-ask these choices.

# Next review — RC5/RC6, 2026-10-17

RC1–RC4 are recorded as decisions 196–199. Scoped read-only rust_engine review finished.
Two pending choices: RC5 tested per-stroke precision envelope versus full-address-space
individual strokes; RC6 Rust mapping of canvas-local pointer samples versus host-generated
region positions. See engineering-budgets-v1.md final section. Neither selected yet.
Then produce one anchored-transform/DBML/typed-ABI/normalization/test packet for owner review.
Do not implement or publish changed schema from these direction choices alone.

# Current region selections — 2026-10-17

Owner selected RC1-A/RC2-A/RC3-A/RC4-A (decisions 196–199): i64 region X/Y,
65,536-unit square regions, region+local position per sample/one row per sample,
and shared Rust canonical normalization. No schema/ABI/runtime implementation yet.
Lead has requested a scoped read-only rust_engine assessment of remaining material
transform/arithmetic choices for the revised concrete packet. Do not reopen selected
zoom/width/scale/history/budget policies. Old global-coordinate S02 approval is history
for affected fields; preserve its snapshot hashes and unrelated behavior.

# Latest selections — 2026-10-17

Owner selected EB6-B, EB12-A, WV1-A (decisions 193–195). Region/chunk-addressed coordinates
plus local offsets require a concrete revised DBML/typed ABI/normalization/transform proposal.
Do not implement obsolete global-f64-only affected contracts or rewrite the S02 v2 approval snapshot.
Platform resource table is approved as provisional starting caps, with actual-device validation
and complete subordinate accounting still required. WatchOS uses advance Keep on Watch image
downloads and native offline display; phone presence is unnecessary to open completed downloads.
Exact image package/detail/storage/revocation contract and identified Figma remain pending.
Wear OS renderer/acquisition remains separately open. No runtime code, device tests or publication.
Next: prepare one coordinated coordinate-contract proposal (lead/Rust + database/rendering review),
then ask only the material unresolved representation choices. Watch details may wait for P08.
Older pending-choice notes below are historical.

# Next owner batch — 2026-10-17

Present EB6 revised (pageless f64/view-relative rendering versus chunk-addressed redesign),
EB12 (provisional platform budget table versus defer non-macOS numbers), WV1 (advance offline
image downloads versus native watch renderer research versus defer). All remain pending.
Watch proposal A now prioritizes background preparation before opening; explicit offline
downloads are persistent managed data, not evictable cache. Phone presence is unnecessary
for an already downloaded revision. No implementation/Figma/foreground authorization.

# Latest budget responses and open questions — 2026-10-17

Recorded decisions 188–192: EB7-A scale 1/64–64; EB8 base width 1–512;
EB9-A nested caches plus platform-specific profile planning; EB10-A PNG caps; EB11-A gallery.
EB6 is NOT selected: owner asks for an infinite canvas/Concepts comparison. Review proposes
pageless f64/view-relative rendering with a measured finite precision envelope; no new schema.
Non-macOS numeric budgets and watch cached-image delivery are proposals, not approvals.
Owner asks how phone-rendered watch previews work; explain images versus native vector files,
offline cache and higher-resolution regions, no continuous video/background guarantee.
See final sections of docs/reviews/engineering-budgets-v1.md. No app code or device tests.

# Pending engineering batch — 2026-10-17

EB6–EB11 are proposed in docs/reviews/engineering-budgets-v1.md: coordinate envelope,
cumulative stroke scale, base width, cache nesting, PNG raster budget, gallery thumbnails.
None selected; await the owner's batch answers. EB1–EB5 remain settled by decisions 183–187.
These proposed budgets do not authorize app implementation or new export controls.

# Current engineering choices — 2026-10-17

Owner selected EB1-B 10%–800%, EB2-A ≤0.25 native-point derived-geometry error,
EB3-A provisional software timing targets, EB4 Apple Silicon only/latest stable macOS,
and EB5-A Chromium/Firefox/Safari-WebKit SQLite/storage feasibility. See decisions 183–187
and docs/reviews/engineering-budgets-v1.md. No Intel or older-macOS support lane required.
Pin exact stable OS/toolchain at implementation; no beta requirement or automatic baseline drift.
Remaining: coordinate/width/transform bounds, cache accounting, export/thumbnail budgets,
actual feasibility/test evidence and identified Figma approval. Historical unanswered EB notes
below are superseded. No application code, foreground session or measured pass is implied.

# Current EB1 research — 2026-10-17

Owner rejected the proposed 1.5625%–6400% zoom range and requested Concepts/Prodrafts research.
See docs/reviews/engineering-budgets-v1.md, focused EB1 evidence and revised choices:
A proposes 5%–1000%; B proposes 10%–800%; C defers endpoints to an authorized prototype check.
No replacement is selected. Concepts confirms bounded zoom but no verified numerical endpoints;
Prodrafts historical iPad reports say 3%–1000%, current version/platform limits remain unverified.
Other geometry bounds and EB2–EB5 remain unanswered. No application code or foreground tests.

# Next review batch — 2026-10-16

Owner declined the file-event/SQLite-inbox alternative comparison; retain decision 182. Next unanswered batch is EB1–EB5 in docs/reviews/engineering-budgets-v1.md: geometry envelope, derived-geometry accuracy, provisional software timing targets, older-macOS support timing, and browser validation breadth. EB5 validates the selected transport rather than reopening it. No answers inferred. Subsequent engineering cap details require one consolidated proposal; input gestures/control sizes remain with feature-specific UX/Figma.

# Current IPC selection — 2026-10-16

Owner delegated safe platform IPC defaults and asked about store compatibility. Decision 182 records docs/architecture/platform-ipc-defaults.md and docs/distribution/ipc-compatibility.md. IPC1=A: sandboxed discovery-only SMAppService helper on macOS; no helper installed/registered. Windows pipes + standard JSON-RPC, Linux D-Bus, in-process mobile plus conditional private Android AIDL, web worker-owned Web Locks and structured-clone messaging, viewer restrictions preserved. This is a selected architecture, not measured optimal performance or store certification. Existing primitive feasibility evidence remains limited. Exact production adapter/security/consent/packaging tests and Figma remain gates. Budget recommendations EB1–EB5 are still unanswered.

# Current feasibility handoff — 2026-10-16

Owner authorized native IPC/file-access checks after approving S02 v2. Read docs/architecture/native-feasibility-v1.md, docs/reviews/engineering-budgets-v1.md and quality/S02-feasibility-v1.json. Background disposable native/browser probes only; no application implementation. Native primitives passed including App Sandbox, but independent app-peer discovery/production authentication and persistent user-selected file grants remain gaps. Chromium API checks passed; WebKit OPFS error unresolved, Firefox not run. EB1–EB5 new numeric/support recommendations require owner answers. Approved resource caps/Undo policy remain unchanged. Ask before native panels/foreground tests.

# Latest concrete packet — 2026-10-16

Owner APPROVED the consolidated S02 v2 proposal on 2026-10-16 (decision 181): schema (14 tables/116 columns/8 refs), typed signatures, recovery flows, provisional starting limits and test plan. Read docs/reviews/S02-v2-approval-2026-10-16.md and S02-consolidated-v2.md. Exact approved snapshot hashes, independent review and publication evidence: quality/S02-v2-review.json. No app implementation/migrations/generated ABI or runtime tests. Next: separately authorized native IPC/file-grant feasibility work and identified Figma designs; S02/S02M remain open for required evidence. Do not reopen settled choices or treat old question-history notes as current.

# Current continuation status — 2026-10-16

Decisions 177–180 close the current policy batch: DB17-B uses SQLite FULL with fullfsync=OFF and checkpoint_fullfsync=OFF on macOS, without claiming identical cross-platform durability. DB20-A validates whole-stroke mutation state; DB21-A starts a fresh Undo/Redo session after coordinator recovery only after reconciling/preserving pending work; DB22-A permits proven-independent commands and pauses dependent/uncertain ones. Exact schema/ABI/budgets and UI remain review items.

All DB1–DB22 policy questions are answered; DB16-C intentionally defers cloud retention. Next: consolidate the concrete schema/interfaces/recovery/budget/test packet listed in tasks/S02M.md for owner review. Do not invent another batch absent a concrete unresolved issue. DBML/hosted Version 5 have not yet been amended for incarnation/generic receipts; the approved historical table snapshot is not approval of unseen amendments. Application implementation remains unauthorized. No runtime tests were run for these documentation decisions.

## Historical continuation notes — superseded where inconsistent with the status above

Current review queue: DB18-A/DB19-A recorded as 175–176. DB17 is a portability question, not a selection. Four remaining currently identified policy questions: DB17 and prepared batch DB20–DB22 (docs/reviews/S02-db-batch-6.md). Present that existing batch next rather than inventing duplicate numbers. After answers, consolidate exact contracts/budgets/schema and review; new material feasibility issues may need targeted follow-up. Documentation only; hosted schema unchanged.

Latest: DB15-A / decision 173 selects bounded durable outcomes for relevant editing commands, atomic with their drawing changes; no full history/client journal/persistent Undo. Missing receipts remain Unknown. Concrete receipt schema/retention/export scrubbing require review. DB16-C / decision 174 defers cloud conflict-copy retention to the cloud milestone without weakening preservation-first decision 166. DB17–DB19 remain pending in docs/reviews/S02-db-batch-5.md. New independent batch DB20–DB22 is in docs/reviews/S02-db-batch-6.md; recommendations are unanswered. Documentation only, no DBML or hosted changes.

Review queue: DB15–DB16 remain unanswered (docs/reviews/S02-db-batch-4.md). Independent DB17–DB19 are prepared in docs/reviews/S02-db-batch-5.md at the owner’s request for parallel review. No new decisions recorded; documentation only. After answers, consolidate exact configuration/budgets/recovery/schema/interface packet.

Latest: DB11–DB14 selected A (decisions 169–172): bounded client-memory retention until durable acknowledgement; orderly save/disconnect/exclusive takeover rather than live transfer; client-scoped conditional Undo; object/property preconditions rather than interaction reservations. No client recovery journal or persistent Undo selected. Uncertain outcomes require reconciliation, not blind replay. All-holder failure before persistence can lose unsaved work. Next unanswered batch DB15–DB16: docs/reviews/S02-db-batch-4.md. Documentation only; hosted schema unchanged.

Latest: DB10-A / decision 168 selects coordinator hosting in the first app process that opens the drawing and obtains authority; no standalone service. DB9-A and preservation-first remain selected. Owner requests batched questions. Next unanswered batch DB11–DB14 is in docs/reviews/S02-db-batch-3.md; do not preselect recommendations. Documentation only.

Latest decision 167 / DB9-A: database incarnation plus existing scoped content/metadata revisions selected. See docs/architecture/storage-transitions-v1.md. Concrete schema encoding/ABI and replacement fencing remain pending; no implementation or hosted schema update. Next owner choice: coordinator hosting/ownership/takeover (DB10). Decision 166 preservation-first policy remains.

Decision 166 (2026-10-16): prioritize preventing data loss over automatically reconciling every edit. Preserve conflicting work and resolve explicitly. Local incremental coordination (163) and platform adapters (164) remain selected. Initial future cloud sync preserves both whole-document versions; automatic semantic merging and object-level conflict review are deferred. Concrete preservation/retention/failure contracts and identified Figma approval remain required; no application implementation authorized.

Latest scope (163–165): simultaneous incremental local editing through one authoritative Rust coordinator/multiple clients; platform communication adapters with concrete feasibility pending. Future cloud sync initially warns on divergent versions and offers explicit conditional replacement; automatic merging deferred. Read docs/architecture/incremental-collaboration.md and tasks/S02M.md. No app/schema/cloud implementation approved. DB7/DB8 remain selected; old exclusive-client/rename-only drafts are incomplete.

Latest answers: DB7 A / DB8 A recorded as decisions 161–162 (caller-owned outputs, macOS readiness pipe). DB5 remains a question about ETag-style conditional saves and possible overwrite; DB6 asks about NSXPC/platform equivalents. Read docs/reviews/S02-db5-db6-followup.md before seeking those remaining choices. Do not mark ownership, new token fields or overwrite UI approved.

Latest tooling change: owner requested removal of tools/dbdiagram and root Node.js/TypeScript/pnpm setup. Root package/lock/config and scripts/check.ts are installed; use pnpm install --frozen-lockfile, pnpm check and pnpm db:validate. CLI usage moved to docs/database/cli.md; credentials unchanged. Application implementation remains unauthorized. See quality/root-tooling.md. This supersedes older standalone-tool/no-runner notes below.

Latest owner answers: DB1 A, DB2 A, DB3 A, DB4 B (2026-10-16), recorded as decisions 156–159 and docs/reviews/S02-db-batch-1.md. Selected conservative three-database recovery, persistent activity counter, multiple bounded rename receipts and Rust localized default-name creation. No native formatting round trip. Next: ownership/coordination and ABI/wake review, then bounds/remaining DTOs. S02 remains open and implementation unauthorized. This supersedes older unresolved D1/D6/D7/D8 notes below.

Latest approval: owner approved the displayed DBML table structure (hosted Version 3) on 2026-10-16. See docs/reviews/S02-table-structure-approval-2026-10-16.md. S02 is NOT closed: ABI extension, rename transport/probe, ownership/recovery and operational limits remain pending. No implementation authorization. Owner requested removal of local rendered diagrams; use hosted dbdocs plus DBML/layout/source hashes.

Latest diagram update: owner completed CLI login; grouped DBML and retrieved editable review.dbdiagram published to the existing private dbdocs project. See docs/database/diagram-presentation.md. Current plan blocks colored Table Groups (paid); no upgrade. User prefers dbdocs, no separate local diagram deliverable. Schema definitions unchanged; strict credential isolation remains unconfigured.

Latest owner update (2026-10-16): decision 154 requires English (en) and Ukrainian (uk) on every implemented host, OS/per-app selected at launch (browser preferences on web), no in-app switch. Read updated i18n plan, tests and S00B. docs/design/color-representations.md separates picker models from canonical sRGB and proposes future P3/OKLCH work; dictionary explains UUID BLOBs and timestamps. No schema fields/ABI/app code changed; private dbdocs v1 and its source manifest remain historical, unmodified.

Latest tooling update: owner requested project-local CLI and database-designer CLI use. tools/dbdiagram pins dbdiagram 0.6.3. Read docs/database/cli-security.md before any CLI invocation: upstream validates without authentication but attempts credential lookup and telemetry. No strict isolation/CLI auth exists; prepare commands for owner or externally constrained runner. Private dbdocs Version 1 is published and verified, with hosted visual review (local images subsequently removed at owner request); owner schema/ABI decisions remain pending. No app implementation authorized.

Current S02 update (2026-10-16): concrete database/interface proposal is under docs/reviews/S02-database-interfaces-v1.md. It is NOT approved or implemented. DBML files are under docs/database; ABI signatures under docs/interfaces. Catalog authority-loss recovery and authenticated cross-process rendezvous remain material decisions. Owner approved private dbdocs publication; consult quality/S02-contract-review.md for actual publication/review status. Earlier append-history statements that no schema has been proposed are superseded.

# Exact stopping point

Current handoff (2026-10-16): decisions 151–152 defer new input mappings to feature design.
Read the [input inventory](input/inventory.md): UX proposes applicable keyboard/pen/native menu/OS
behavior with each feature and sends it with Figma for owner approval before implementation.
Do not resume the P/V/global-bindings questionnaire. watchOS/tvOS/Wear OS/Android TV are view-only.
S00G [distribution research](distribution/README.md) remains available; no code/Figma/runtime evidence.
The [historical review](../quality/input-distribution-review.md) applies only to its recorded hashes.

Linefield was scaffolded at the owner's request on 2026-10-16. This is documentation and folder structure only. No application code, build manifests, dependencies, runnable app or remote repository exists. Nothing is merged or published.

Read AGENTS.md, docs/decisions.md, tasks/README.md and docs/successor/README.md. Name/path and multiplatform apps/ scaffolding are selected. Platform portability must be designed now; macOS features are implemented first, other hosts afterward. Read docs/platforms.md and the P01–P12 backlog. Other proposals remain under review. Next action is S00: obtain owner review of remaining architecture/format/scope choices and prepare an identified Figma handoff before new UI implementation. S01's documentation foundation is present; executable tooling/build work is not started.

Do not proceed into code because this scaffold exists. Wait for the owner's implementation instruction, then work only within approved decisions. Concrete ABI/schema/thread choices require the S02 review before implementation. No foreground desktop reservation is active.

Reference old source read-only at /Users/oleksandr/projects/native-sketch, commit 3b580873ded3fea63d0220a53d7c5ece66c5d897. No legacy file compatibility, old task-board inheritance or path dependency. Detailed proposal and acceptance criteria are local under docs/successor/.

Suggested next-chat prompt:

“Continue planning Linefield at /Users/oleksandr/projects/linefield. Read AGENTS.md and docs/RESUME.md. Review the remaining decisions with me before implementation; the current scaffold contains no app code. Keep the old Native Sketch repository read-only.”

Latest documentation update: contract catalog CT-01–CT-09, invariants INV-01–INV-11 and shared
E2E scenario plan are added, with task/agent responsibilities. Read docs/contracts.md,
docs/testing/shared-e2e.md and docs/architecture-decisions-audit.md. No actual contracts/tests
have been implemented. Remaining decisions are explicit; no new implementation authority.

Latest direction: owner chose Zed tasks, no custom Zed extension. Read docs/tooling.md, docs/logging.md, docs/design/workflow.md and docs/developer-experience.md plus DX00–DX02. Node/Vite/Oxc and reusable reporting are planned; zx optional. No scripts, task JSON, Figma designs, dependencies or GUI were implemented.

Latest planning additions: apps/android-tv (Google TV included) and apps/android-xr with P10/P11. Start visual design with S00A and docs/design/foundations.md: choose shared visual principles/semantic roles and native mappings, then adaptive macOS components/screens. No Figma file created or approved; no app code added.

Latest requirement: i18n from day one. Read docs/internationalization.md, docs/testing/internationalization.md and S00B alongside S00A/S02. CT-09/INV-11/SU-20 cover readiness. English initial/source/fallback language is now selected; additional translations and concrete resources still need review; no translations, catalogs, app code or new language-selector UI created.

Latest planning work: competitor_researcher role and S00C handoff are documented. Read
docs/research/README.md and docs/planning-review.md. Research report, recommendation approval,
Figma and implementation remain pending. The walkthrough separates pre-design decisions from
pre-code contracts and deferred platform/distribution work; suggestions are not approvals.

Latest request: motion/transitions and navigation are planned in docs/design/motion.md,
docs/navigation.md, docs/testing/navigation-motion.md and S00D. Designer must deliver interactive
platform-specific prototypes and reduced-motion behavior. Browser URL examples/native mappings
are proposed; first macOS custom chooser, route identity/guards and exact motion still need
review. No router, URL registration, Figma artifact or app code exists.

Latest owner choices: English initial app/source/fallback, Wear OS target (apps/wearos/P12),
and split UX/UI roles. Read docs/design/roles.md; configured files are ux_designer.toml and
ui_designer.toml, replacing the combined role. Runtime discovery is unverified. UX leads behavior/
routes, UI visual/adaptive/motion design, lead coordinates. Wear toolkit/viewer/source policy
still needs review. No app code, new Figma artifact or translation catalogs were created.

Decision-by-decision review is underway. Owner selected A for decision 1/R02 on 2026-10-16:
one document in one window for the macOS preview, independent session ownership, no tabs/
multiwindow yet. Decision 2/R09 is also selected: B, four focused Rust crates (engine, services,
renderer, native integration), with an independent pure engine. Both recorded in decisions.md.
Decision 3/R10 is selected: A, main-thread macOS editor/Skia with bounded background storage/
logging and an early performance checkpoint. Decision 4/R11 is selected: C, SQLite document,
superseding ZIP/JSON. Decision 5/R06: owner selected autosave to the document; docs/autosave.md supersedes
explicit Save plus recovery-copy defaults. Decision 6: owner selected app-managed drafts with later naming/location; see docs/autosave.md. Draft retention/restoration/publication remains pending. Owner requested database specialist responsibilities and visual schema approval. database_designer is configured; docs/database-design.md and S02 require rendered ER diagrams, dictionary, persistence sequence and exact-version owner approval. Runtime discovery is unverified; no schema proposed or implemented yet. SQLite schema/journaling/backup, ABI and scheduling capacities remain pending separately.
Continue one choice per exchange; Figma and implementation not started.

Database visualization selected on 2026-10-16: owner chose DBML with dbdiagram. Follow
docs/database-design.md and database_designer instructions: version schema and layout in Git,
present a rendered proposal and record exact-version owner approval before implementation.
docs/database-visualization-options.md retains alternatives as history; no new comparison required.
dbdocs hosting and optional SQLite extraction/check tools remain separate. No tools installed,
schema uploaded or SQLite conversion support assumed; concrete schema and setup still pending.

Latest decision 7 (2026-10-16): owner chose Procreate-like app-managed gallery/library and requested
its setup before canvas. Added S02L (first product UI, prerequisite of S04), SU-21 and LIBRARY
scenario IDs. Unnamed drawings persist in the library; normal entry is gallery, one window/editor.
Design/contracts/Figma remain pending; no implementation authorized or produced. Deletion is now resolved by decision 8 below; resolve restart exceptions and native-file
import/export-copy identity next. Earlier recents-
only/optional-gallery proposals and mandatory draft-to-file publication are superseded.

Decision 8: owner chose B, permanent library-document deletion after explicit confirmation.
No Recently Deleted, restore or system Trash. Updated S02L and autosave policy; cancellation
preserves content. S02 still reviews storage ordering, pending-write/stale-result handling and
crash/failure semantics. No implementation. External import semantics are now resolved in decision 9 below.

Decision 9: owner selected A for external native files: independent import into the library,
new identity, no automatic source write-through. Added FILE-IMPORT-COPY-001 and S02/S06 duties.
Future cloud sync is separate and unimplemented. Export details, undo lifetime, concrete ABI and
persistence budgets remain open. Continue one architectural decision at a time; no code/Figma yet.

Decision 10: owner chose A, session-only Undo/Redo. Clear on accepted gallery return/session end;
reopen/restart preserves artwork with empty stacks. Autosave/dialogs/focus alone do not clear it;
cancelled/failed navigation retains history. Updated contracts/tasks and HISTORY-SESSION-001.
No implementation. Next architecture discussion: concrete Rust–Swift binding approach (R09),
then persistence scheduling/budgets; other library naming/export/restore choices remain open.

Decision 11: owner selected B for autosave cadence: brief bounded batching, maximum pending age
and flush before accepted editor exit. Updated autosave/S02/S06 and AUTOSAVE-BATCH-001. Exact
numbers, storage durability and overload policy remain pending. No implementation. Next substantive
architecture review: Rust–Swift binding contract direction; continue one owner decision at a time.

Decision 12: owner chose A, named typed entry points feeding the shared Rust command dispatcher.
Bounded sample batches; no duplicate editing/save/Undo behavior. Future web/AI adapters share
commands/queries without requiring identical C signatures. Exact ABI/generator/ownership and
future AI permissions/transport remain unapproved. No implementation; documentation only.
Remaining direction choices include caching, SQLite journal/durability and resource targets,
plus pending product/design details. Do not reopen selected boundary shape without new evidence.

Decision 13: owner chose A, vector geometry/path caching first with viewport culling. Bounded,
disposable caches; no initial custom raster-tile cache. Updated CT-06/INV-08, S02/S04/S07 and
rendering_performance instructions. Numeric budgets/algorithms pending; no implementation or
benchmark run. Future tiles require measured justification and owner review.

Decision 14: owner selected logical canvas units. Updated format/contracts/S02/objectives; exact
100%-zoom conversion, finite f64 representation and numeric limits remain concrete review work.
No physical measurement features or code added. Continue remaining architecture decisions,
including save-failure behavior, concrete storage/ABI contracts and library/design details.

Decision 15: owner selected continued editing temporarily within limits on local autosave failure.
Persistent failure indicator, bounded retries/work/memory and safe mutation pause; retain accepted
edits and inspection/retry access. Exit remains guarded. Added AUTOSAVE-FAILURE-BOUNDS-001 and
contracts/S02/S06 requirements. Exact limits, gesture headroom, exit wording and resume rules await
review. Future cloud upload failures stay separate. No code or Figma artifacts implemented.

Decision 16: owner selected A for the initial drawing experience: solid round pressure-sensitive
pen (width only), constant-width fallback, tilt ignored, existing-style width/color controls,
fixed light artwork background and system-themed native chrome. S02 still reviews pressure/
smoothing details with Cintiq feedback; predictions never become saved input. Documentation only;
no Figma or implementation approval. Continue with R05 selection/navigation behavior next.

Decision 17: owner selected A for explicit Select mode and proposed selection/navigation
behavior, recorded in decisions.md and R05. Nearest stroke with topmost tie-break; drag move;
opposite-corner uniform scale includes width and prevents flipping; Space-drag/scroll pan,
pinch/menu zoom, Escape/focus-loss cancellation and one-operation Undo. Exact tolerances and
Figma remain pending. Continue with remaining library/file workflow choices; documentation only.

Decision 18: owner corrected C to B, native document + PNG export for the macOS preview.
SVG/PDF remain deferred. Native snapshot exchange belongs to S06; S07E PNG is now required for
S08 acceptance. Export contracts (bounds/resolution/background/resource limits) and identified
Figma remain pending. No code or design artifact was created. Continue remaining library workflow
choices one at a time; previous optional-PNG/SVG proposals are superseded by decision 18.

Decision 19: owner chose A, always launch into the gallery, including after crash recovery.
No last-editor restoration or special Continue action. Report recovery problems honestly and
preserve access to unaffected drawings; reopened documents have empty Undo history. Updated
S02L/navigation acceptance; explicit external-file import routing remains separate. No code.

Decision 20: owner selected A, gallery sorted most recently edited first, without sorting
controls. Accepted content edits affect recency; opening/export/autosave completion do not.
S02 reviews ordering metadata, tie-breaks and creation/import/clock behavior. Documentation only.

Decision 21: owner selected A, current Apple Silicon Mac/installed macOS, mouse/keyboard and
Cintiq/Pro Pen 3 as the preview verification baseline. Actual inventory/minimum deployment OS
and performance thresholds remain engineering review work. Other configurations are unverified,
not deliberately excluded. No desktop reservation. Major product direction choices are now
recorded; remaining detailed UX (names/export settings) belongs in design proposals, and S02
must prepare database, ABI and operational/resource review packets before implementation.

Decision 22: owner selected separate SQLite catalog plus one SQLite file per drawing. Catalog
serves gallery metadata/availability; artwork stays in independent documents and thumbnails are
disposable. S02/S02L now use this layout. Next database decision: authoritative metadata versus
catalog copies, followed by the concrete visualized schema/lifecycle review. No implementation.

Decision 23: owner chose A, document-owned portable metadata with queryable catalog copies;
catalog owns local location/availability. Rename updates document then catalog; reconciliation
repairs stale entries. Reconstruction does not promise recovery of catalog-only settings or
missing files. S02 reviews revision/metadata semantics and failure tests; no implementation.

Decision 24: owner selected one database row per sample, with separate stroke-level properties.
No packed binary sample codec/comparison prototype is required. S02 reviews exact schema,
ordering/association/pressure fields, transaction consistency and bounds. Input remains in memory;
completed edits autosave asynchronously, not per sample. Documentation only; no implementation.

Decision 25: owner selected original sample points plus a separately stored current stroke
transformation (translation + positive uniform scale). Move/scale does not rewrite sample rows;
scale includes width. Shared rendering/hit-testing/culling/PNG semantics and round-trip/Undo/
cancel tests are required. Exact composition/numeric/schema contracts remain S02 review work.
Session-only history and no rotation/nonuniform scaling remain unchanged. Documentation only.

Decision 26: owner selected automatic supported lossless Linefield document upgrades with a
consistent recovery copy made first. Failure preserves original recoverability; unsupported
newer files remain untouched. Imported originals stay unchanged. Retention, concrete migration/
rollback/publication and catalog upgrade policy remain S02 review items. No implementation.

Decision 27: owner selected A, Saved only after a matching revision commits with reviewed
durable disk synchronization. Queue/submission/weaker commit is not Saved; failures/newer edits
remain pending. Storage stays off input callbacks. SQLite journal mode, concrete flush settings
and tests remain S02 review work. No code, performance claim or desktop reservation.

Decision 28: owner selected A, WAL for local macOS catalog and per-drawing SQLite databases,
retaining durable disk-synchronized Saved acknowledgements. Checkpoint/growth/sidecar/connection
contracts and effective settings need S02 review. Snapshot export/recovery is independent of live
sidecars; other platforms/cloud need separate feasibility. No implementation or measurements.

Decision 29: owner selected rusqlite and raised browser/Wasm compatibility. Recorded native
selection with isolated storage backend and early browser feasibility requirements. Current
upstream offers sqlite-wasm-rs integration, but OPFS/VFS/worker, quotas/locking, journal mode and
Saved semantics need review and actual probes after authorization. No dependency installed;
no native or browser prototype run. Do not claim web compatibility proven or choose a new browser
runtime/topology silently. See database-design.md for verified upstream sources.

Owner reconfirmed rusqlite after the browser storage/WAL explanation. Consolidated remaining
review areas in architecture-decisions-audit.md: concrete persistence, typed boundary, numeric/
input, operational quality limits, foundation/portability; plus required Figma approval.
Selected choices are not reopened. Continue one material choice at a time, using concrete
specialist proposals; no application implementation or browser probe authorized yet.

Decision 30: owner chose A, change-driven native reads after Rust command/change summaries;
no polling timer or pushed-state callback model. Async results return to main-thread Rust
validation then the same UI-update path. Canvas invalidation and one-time native effects are
separate; Swift is presentation-only. Exact DTO/query/queue/effect ownership remains S02 review.
No implementation. Continue typed-boundary choices one at a time.

Decision 31: owner selected hybrid UI state transfer. Small complete snapshots for affected
control groups; bounded queries plus typed changes for large collections. Preserve decision 30
change-driven reads/no pushed-state callbacks. Require version/query identity, atomic changes,
explicit deletion/clear and bounded resync after gaps/overflow, including sorted page boundaries.
One-time effects stay separate; canvas stays Rust-owned. Documentation only; concrete ABI pending.

Decision 32: owner chose A for UI boundary ownership: input borrowed only during calls, retained
data copied by Rust, native-owned copies of bounded UI results. No long-lived UI-result leases;
Rust geometry stays internal. S02 reviews output capacities/allocations and failure-safe delivery
without losing effects or replaying commands. Concrete ABI remains pending; no implementation.

Decision 33: owner chose A, finite f64 document/sample coordinates and transformation
calculations, with viewport-relative rendering conversion. Logical units remain selected;
coordinate/zoom/scale bounds and tolerances still need S02 review. Other field precisions are
not implied. No implementation or numeric performance evidence. Next input review: pressure
mapping and any basic smoothing; both remain concrete proposals until approved.

Decision 34: owner selected A, linear pressure response from reviewed minimum to selected
brush width (maximum untransformed width); mouse/no-pressure fallback uses selected width.
Opacity unchanged, tilt ignored, no curve UI. Minimum/normalization/contact/zero behavior and
basic smoothing remain S02 review work; Cintiq verification is pending. No implementation.

Decision 35: owner chose A, no initial movement filtering; continuous geometry from actual
samples with round joins/caps and separate edge antialiasing. Exact interpolation/accuracy/
corner/degenerate/contact rules remain S02 work. Later filtering needs device evidence/review.
No stabilization control or implementation. Continue remaining concrete contract/design choices.

Decision 36: owner chose A, PNG exports all committed artwork bounds including stroke widths/
transforms plus a small margin. No viewport export or crop tool. Exact margin/resolution/
background, empty drawings and resource limits remain reviewed contracts; no silent cropping.
Updated S07E acceptance. Next PNG choice: background, then resolution. Documentation only.

Decision 37: owner chose A, PNG includes the fixed light canvas background, independent of
system theme. Opaque output/margins, no transparency option/background picker. Exact background
color/color-space and tolerances remain design/contracts; next export choice is resolution.
Updated S07E tests; documentation only.

Decision 38: owner chose A, fixed PNG pixels-per-logical-unit scale, independent of editor zoom/
display density. Combined with decisions 36/37: all artwork plus margin, opaque light background.
No size field/presets/DPI/crop/viewport/transparency controls. Exact multiplier/rounding/limits
remain concrete contract items. Oversized requests fail clearly, without silent downscaling.
PNG product direction is settled; implementation and Figma remain unstarted.

Decision 39: owner chose A, retire oldest whole Undo operations within a reviewed memory
budget and continue editing. Current artwork/revision/save state must not change on eviction.
Exact accounting, Undo/Redo interactions and oversized-operation admission remain S02 review;
no silent non-undoable edits or added history controls. Session-only history remains selected.
Updated tests/contracts; documentation only.

Decision 40: owner chose A, retain latest pre-upgrade recovery copy per drawing. Older copy
is removed only after new copy and upgraded document validate; failed upgrades preserve required
recovery material. Temporary/staging exceptions need bounded crash-safe accounting. Insufficient
space aborts upgrade without sacrificing prior protection. No implementation or cleanup run.

Decision 41: owner chose A, isolate unexpectedly failed editor sessions where safely possible;
disable mutation and prevent tainted autosaves, preserve unaffected functions when safe and
recover only from validated saved content in a fresh session. Unsaved loss is reported honestly.
Ordinary save errors keep decision 15's policy. Fatal/uncontainable faults need relaunch. S02
still reviews in-flight work/teardown/ABI safety and Figma recovery states; no implementation.

Decision 42: owner selected UUIDv4 portable document/stroke identity plus local integer SQLite
keys and ordered sample indices. Commands/external references use stable identity; local keys
are database-scoped and never ordering fields. Sample rows need no UUID. Exact types/constraints/
random-source/interop and independent-import stroke identity remain S02 review. No implementation.

Decision 43: owner chose A, fresh UUIDv4 for document and all strokes on independent native
import. Remap references in staged copy, preserve artwork and source bytes; repeated imports
stay independent. Ordinary save/reopen/schema upgrades preserve identity. S02/S06 mapping,
validation and interruption tests remain planned, not implemented.

Decision 44: owner selected A, duplicate library display names allowed. UUIDs remain identity;
no name-based merge/overwrite/unique constraint or forced import suffix. Storage uses internal
identity. Export filename collisions remain separate. S02/S02L/S06 tests include same-name
selection/rename/import/delete and catalog reconstruction. Default/empty-name rules still need
review; documentation only.

Decision 45: owner chose B, automatic numbered names for newly created drawings (Untitled,
Untitled 2 in English; first-name correction recorded below), without a naming dialog. Names remain editable; duplicate rename/import
labels are still allowed. No forced import suffix or automatic renumbering of existing items.
Number allocation/reuse, counter persistence/rebuild and localized template contracts remain
review items. Updated S02L, database design and contracts; documentation only.

Decision 46: owner chose A, increasing default-name numbers without gap reuse. Deleting or
renaming does not free a number; ordinary restart preserves progress. Duplicates remain allowed,
with no renumbering or use of labels as identity. Concrete allocation/retry, sequence scope,
catalog rebuild/recovery and overflow remain S02 contract work. Documentation only.

Owner correction to decisions 45-46: first default name is Untitled (no 1), followed by
Untitled 2, Untitled 3, etc. No gap reuse/reset after deleting or renaming the first drawing.
Examples and S02L acceptance updated. Stroke appearance storage A/B is still pending.

Decision 47: owner selected per-stroke appearance properties, resolving the previous pending
style-storage A/B question. Each stroke owns its color/base width/approved pen parameters;
no shared style-record table. Current settings changes leave existing strokes unchanged.
Exact fields/color encoding and active-stroke setting capture remain concrete S02 review items.
Updated database/contracts/S02/S04/S06/S07E acceptance; documentation only.

Decision 48: owner selected sRGB for the initial release, with other color spaces documented
as possible future extensions. Explicit document color semantics, color-managed presentation
and sRGB PNG output; do not reinterpret old values when adding another space. Exact channel/
alpha/conversion/metadata contracts remain S02 work. Wide-gamut/HDR implementation is not approved.
Updated format, database, contracts and S02/S04/S07E acceptance. Documentation only.

Decision 49: owner selected explicit loss-confirmed exit after local save failure, with Retry,
Stay (default) and Leave Without Unsaved Changes. Only unpersisted work may be abandoned;
committed content is not reverted or deleted. Bind consent to current state and coordinate
queued/in-flight writes before releasing a session. Updated autosave/navigation/contracts/S02/
S06 test requirements. Exact lifecycle contracts and Figma remain pending; documentation only.

Decision 50: owner requires blocking style changes during active strokes. Disable native style
controls/actions and reject commands centrally in Rust; do not queue changes, alter settings,
cancel/split the stroke or add history. Restore availability after end/cancel subject to existing
state guards. Pressure variation remains normal. Updated contracts/S02/S04/design guidance;
documentation only, no implementation or Figma approval.

Decision 51: owner chose latest completed artwork for native/PNG exports, including unsaved
completed edits. Capture a consistent snapshot; later edits do not change it. Export does not
mark the library saved or clear its save failure. Capture timing, bounded ownership/construction
and active-gesture availability remain review items. Updated contracts/formats/S02/S06/S07E;
documentation only.

Decision 52: owner selected disabled native/PNG export during an active stroke or move/scale.
Rust rejects requests centrally; native controls/shortcuts reflect availability. No queued export,
auto-commit/cancel or history change. End/cancel restores eligibility subject to other guards;
already captured snapshots remain stable. Active-gesture availability is resolved; panel/capture
ordering remains S02 contract work. Documentation only.

Decision 53: owner chose blank PNG export for empty drawings at predefined dimensions, rather
than disabling it. Exact dimensions are the next review item. Use opaque fixed light sRGB
background, independent of viewport/display; no export-size UI or finite page is introduced.
Nonempty artwork keeps its existing bounds/scale policy and active gestures still block export.
Updated contracts/formats/S02/S07E; documentation only.

Decision 54: owner selected 1920 x 1080 pixels for empty-drawing blank PNG export, resolving
decision 53's pending dimensions. Exact output size, with no extra margin or display/zoom/scale
multiplication. Opaque fixed light sRGB background; nonempty exports keep existing bounds/scale.
Updated format/contracts/S02/S07E. Documentation only.

Decision 55: owner approved cbindgen-generated C headers and a thin handwritten Swift wrapper
for macOS. Rust remains the interface source and behavior owner; Swift handles reviewed native
presentation/lifetimes. No handwritten C application logic, custom packets or UniFFI. Concrete
signatures/ownership/error contracts still need S02 review; exact compatible version/generation
checks belong to S01. Other platform adapters remain separately reviewed. Documentation only.

Decision 56: owner chose Command-S/Save as an immediate request to persist completed edits via
the shared Rust command and existing worker, bypassing batching delay. No filename dialog or
separate save path. Retry recoverable failures, coalesce repeated requests, retain asynchronous
revision-aware durability and leave unfinished gestures/history intact. Updated autosave/contracts/
S02/S06. Documentation only.

Decision 57: owner selected restoration of each drawing's last position/zoom from device-local
library metadata. Missing/invalid view falls back to fit artwork or the empty default. Launch
still enters gallery; no selection/Undo restoration. Pan/zoom does not affect artwork revisions,
recency/history/exports. S02 reviews fields, bounded persistence and failure/rebuild semantics.
Updated database/contracts/navigation/S02/S02L requirements; documentation only.

Decision 58: owner chose per-drawing, device-local current pen color/width, restored on switch,
reopen and ordinary restart. Separate from stroke properties, artwork revisions/recency/history
and exports; active-stroke style changes remain blocked. Missing/invalid settings need reviewed
defaults; no tool/selection restoration or sync is implied. Updated database/contracts/S02/S04/
S06. Documentation only. Continue each choice confirmation with the next unresolved decision,
as the owner requested; avoid reopening settled choices.

Decision 59 broadens decision 58 to extensible per-tool settings, stored per drawing/device.
Stable tool identity plus Rust-owned typed validation/defaults; initial pen color/width only,
without hardcoding the architecture to those fields. Future tools require their own approval.
Concrete settings/schema representation and migrations still need review; no arbitrary property
bag or new protocol selected. Tool preferences must not be needed to render saved artwork.
Import completion navigation A/B remains unanswered; continue that question next.

Decision 60: owner chose automatic opening of the imported native-document copy after successful
import, resolving the pending A/B question. Honor current-session interaction/save/exit guards;
failed import/open retains the current session. Distinguish published import from open/navigation
outcome; do not silently delete a valid already-published item. Source preservation/new identity
and normal gallery launch remain unchanged. Updated navigation/contracts/S02/S06; documentation only.

Decision 61: owner selected restoration of the last active tool per drawing/device, alongside
independent tool settings. Initial editor supports Pen/Select; new/missing/invalid/unavailable
local tool metadata falls back to Pen. No selection/gesture/Undo restoration or artwork/export
mutation. Future viewer capabilities still override preferences. Updated database/contracts/
S02/S06/navigation; documentation only.

Decision 62: owner chose gallery thumbnails that fit all artwork with a small margin, independent
of editor pan/zoom. Opening still restores last viewport. Full transformed stroke extents, no
transient overlays; thumbnails remain disposable. Exact size/margin/revision/generation and visual
states need Figma/S02 review. Updated contracts/database/S02/S02L/design guidance; documentation only.

Decision 63: owner chose explicit native save-workflow confirmation before native/PNG export
replaces an existing external file. Prepare/validate output first; preserve old bytes on failure
before replacement. No silent overwrite or forced suffix. Concrete staging/durability/race handling
requires S02 review; live internal storage is not an export target. Updated formats/contracts/
S02/S06/S07E; documentation only.

Decision 64: owner chose a one-second maximum deliberate autosave batching delay from the oldest
completed unsaved edit. New edits do not reset the deadline; manual Save/normal exit bypasses it.
This is request scheduling, not a disk completion/durability promise. Retain bounded ordered work
and honest overdue/failure state. Updated autosave/contracts/S02/S06; documentation only.

Decision 65: owner selected rotating local JSON Lines diagnostic files, one structured event
per line. Separate from drawing/catalog storage; preserve shared redacted correlation, bounded
background drain, failure isolation and no uploads. Exact event schema/sink and retention/size
budgets remain S02 review. Updated logging/contracts/tooling/S02/S07; documentation only.

Decision 66: owner chose up to seven days AND 20 MiB (20,971,520 logical bytes) total app-log
retention, active plus rotated files, oldest-first cleanup. Excludes drawings/recovery/test
artifacts. Cleanup runs while app is active/next launch, no daemon. S02 reviews accounting,
cadence/clock/failure details; logging cannot block edits or grow without bounds. Documentation only.

Decision 67: owner selected .linefield as the native SQLite drawing extension. Internal content/
version validation is still required; suffix is not proof of validity. PNG remains .png. Exact
schema/application ID, OS associations and panel suffix edge cases remain S02/S06 review. Updated
format/contracts/S02/S06; documentation only, no file association registered.

Decision 68: owner selected explicit columns in tool-specific relational tables for device-local
settings. No generic JSON/BLOB/EAV or one wide nullable table. Preserve typed Rust settings and
per-drawing/device ownership; future tools extend reviewed schema through migrations. Concrete
DBML/keys/types/constraints/defaults still require review. Updated database/contracts/S02/S06;
documentation only.

Decision 69 records requested versioned tool metadata after the owner's proposal for a separate
tool-name/16-byte-ID table with references and on-demand joins. Versioning is required; concrete
registry/schema/key proposal remains for visual review. Keep stable tool identity, localized
presentation separate, typed settings/commands and portable artwork independence. Document/stroke
UUID TEXT-versus-binary choice remains unanswered; do not treat the tool question as its answer.

Decision 70: owner approved stable 16-byte tool UUID + readable tool key in tools, explicit
contract versions in tool_versions, and typed per-tool settings references as the DBML direction.
Concrete keys/columns/version types/seed IDs/migrations still need visual review; no implementation.
Keep native localization, Rust behavior authority and self-contained artwork. Document/stroke UUID
storage encoding remains unresolved; return to that choice next.

Decision 71 supersedes decisions 69-70: keep tools lookup, remove tool_versions/per-tool version
fields. Top-level drawing format version governs artwork; separate local catalog keeps a schema
migration version only. Store tool/document/stroke UUIDs as standard 16-byte binary values;
existing UUID generation, local integer keys and ordered samples are unchanged. Active schema/
contract/tasks updated, old decision entries marked superseded. Concrete DBML still pending.

Decision 72: owner selected SQLite STRICT for owned drawing/catalog tables. Verify compatible
SQLite >=3.37 in native and future browser builds, without silent fallback. Retain explicit SQL
constraints and Rust domain validation; UUIDs remain 16-byte BLOBs. Updated database/contracts/
formats/S02/S06 requirements. No runtime installed or tests executed; documentation only.

Decision 73: owner selected cancel-on-focus-loss for unfinished strokes and required the same
behavior for every tool. Cancel active interaction/restore its prior state, remove previews and
create no history/partial saved result; preserve completed actions/history/save acknowledgements.
Shared cancellation is mandatory for future tools, with native mapping and stale-event tests.
Updated contracts/S02/S04/S05/shared E2E/design/AGENTS; documentation only.

Decision 74: owner selected document Undo/Redo unavailable during every active tool interaction.
Rust rejects without queuing, cancelling/committing the gesture or changing history. Recompute
availability after end/cancel; native text/IME Undo remains separate. Updated contracts/S02/S05/
shared E2E/AGENTS. Documentation only. Next unresolved interaction choice is switching tools
while an interaction is active; do not infer it from history/style/export guards.

Decision 75: owner chose blocking tool switches during any unfinished interaction. Shared Rust
rejects without queuing/cancelling/committing or activating another tool's preferences; last-active
metadata stays unchanged. End/cancel restores eligibility under other guards; a fresh request is
required. Updated contracts/S02/S05/shared E2E/AGENTS. Next: explicit cancellation shortcut across
all tools; Escape currently has selected transform/selection behavior only. Documentation only.

Decision 76: owner approved Escape to cancel any active canvas tool interaction through shared
Rust, otherwise clear selection, otherwise do nothing. Current tool stays selected; no Undo or
partial save, and stale/held input cannot restart a cancelled gesture. Native dialogs/fields/IME
keep Escape priority. Updated contracts/S02/S04/S05/shared E2E/AGENTS; documentation only.

Decision 77: owner chose blocked canvas pan/zoom during active stroke/move/scale for the first
macOS preview, without queued deltas or forced edit completion/cancellation. Idle/selected-object
navigation remains available; pan/zoom must not block itself. S02 reviews origins/momentum/ordering.
System resize/display remap during active edits is still an open policy. Updated contracts/S02/
S04/S05/shared E2E/AGENTS; documentation only.

Decision 78: owner selected cancellation of unfinished tool interactions before accepting a
changed canvas coordinate mapping caused by resize/display changes. Use shared cancellation,
preserve completed work/history and valid saves; no partial commit or blocked window resize.
Reject stale old-mapping input; require fresh begin. Movement without a mapping change does not
itself require cancellation. Resolves decision 77's open resize policy. Updated contracts/S02/
S04/S05/shared E2E/AGENTS; documentation only. Exact 100%-zoom unit mapping remains for review.

Decision 79: owner selected one canvas unit per native UI point at 100% zoom, AppKit points on
macOS. Backing scale affects raster pixels only; no geometry/revision change or physical-size
promise. Future hosts use reviewed logical UI units. Updated decisions/contracts/objectives/S02/
S04/shared E2E; documentation only. PNG's fixed numeric pixels-per-unit multiplier remains open;
empty PNG remains exactly 1920 by 1080.

Decision 80: owner selected B, one PNG pixel per logical canvas unit for nonempty drawings.
Resolves the numeric multiplier from decisions 38/79; viewport/window/backing scale are irrelevant.
Preserve full artwork bounds plus reviewed margin, opaque light sRGB, bounded resource admission
and no silent downscaling. Empty PNG stays exactly 1920 by 1080. Updated decisions/contracts/
formats/S02/S07E/shared E2E; documentation only. Margin and rounding remain unresolved.

Decision 81: owner selected A, fixed 16 logical canvas units of PNG margin on each side outside
full visible artwork bounds. Nominally 16 pixels per side at the approved export scale; no viewport
or proportional scaling. Empty PNG stays 1920 by 1080 without padding; thumbnail margins unchanged.
Updated decisions/contracts/formats/S02/S07E/shared E2E. Documentation only. Integer rounding,
resource limits and exact fixed light background color remain for review.

Decision 82: owner selected A, automatically rebuild a missing/confirmed-corrupt catalog from
validated managed-library drawings. Preserve damaged catalog and unvalidated files; report recovery
and unresolved items. Catalog-only preferences can be lost. Updated database/contracts/S02/S02L/
S06/shared E2E and decisions. Concrete safe rebuild/classification/publication/retention and
lifecycle reconciliation remain for review. Documentation only. Background color remains unchosen;
continue architectural choices one by one with alternatives, as the owner reconfirmed.

Decision 83: owner selected A, retain unavailable drawings in a healthy catalog/gallery with
identity/known metadata, explanation and retry. Never create a blank replacement or silently remove
the entry. Validate identity on retry, reject stale results and preserve the accepted session on
failed open. Updated database/contracts/S02/S02L/S06/shared E2E and decisions. Documentation only;
concrete availability schema and Figma states still need approval. No locate-file feature implied.

Decision 84: owner selected A, preserve all distinct same-document-ID drawing files discovered
in recovery, report unresolved conflict and continue unrelated recovery. No timestamp/scan-order
winner, merge or automatic identity reassignment. Duplicate names remain allowed. Updated decisions,
database/contracts/S02/S02L/S06/shared E2E; documentation only. Concrete candidate references,
publication order and any later resolution commands need review; no resolution UI approved.

Decision 85: owner selected A, automatically resume confirmed deletion after restart only from
valid durable intent recorded before destructive work. Exact storage/schema/sequence still needs
review; missing files/corruption are not permission. Updated contracts/database/tasks/shared tests.
Also corrected two stale successor architecture examples to match decisions 56/75/78 (Save has no
panel; tool switching rejects, invalidating remap cancels). Documentation only.

Owner now requests batches of independent numbered questions, with partial answers/clarification
allowed. Pending batch B01-Q1..Q10 is recorded in docs/planning-review.md; none is approved yet.
Record each chosen option separately and keep omissions/clarifications open. Continue review
without implementing code. The earlier exact background-color question remains unanswered.

Pending batch 2 (B02-Q11..Q18) added to docs/planning-review.md at the owner's request while
batch 1 is being reviewed. Topics: static/dynamic Rust linkage, host/core compatibility, consistent
small UI queries, collection-gap resync, native-effect acceptance, work priority, bounded completion
delivery and export admission. All are proposals, not approvals; B01-Q1..Q10 also remain pending.
Accept partial numbered answers and clarification without inferring unanswered choices. No code,
concrete ABI implementation or change to approved initial thread ownership is authorized.

Batch 1 answers recorded on 2026-10-16: Q1 A ->86 incremental SQL; Q2 A ->87 sample FK cascade;
Q3 A ->88 memory-only derived bounds; Q4 A ->89 bounded automatic transient retries plus manual;
Q5 A ->90 durable-revision thumbnails; Q6 A + owner clarification ->91 on-demand gallery pages,
no loading layout shifts on any platform; Q7 A ->92 visible/near-visible thumbnail priority;
Q8 A ->93 actual-only initial input; Q10 A ->94 shared validity with host-specific capacity.
Updated plans/contracts/tasks/tests/design foundations/AGENTS; documentation only, fence checks
are not runtime evidence. Exact schema/ABI/budgets/Figma still require review.

Q9 remains pending: expanded pros/cons of automatic wait-with-cancel versus explicit quit prompt
are in docs/planning-review.md. Batch 2 Q11-18 is wholly unanswered. New batch 3 Q19-24 is pending:
invalid input-batch handling, pressure minimum, stored color precision, selection distance,
transform stacking order and PNG rounding. Do not infer answers across batches. Background color
remains unchosen. Continue numbered batches and permit partial answers/clarification.

Batch 2 answered using local positions 1-8; mapped explicitly to global Q11-18. Recorded decisions
95-101 for Q11-17 A: static macOS linkage, lockstep host/core builds, coherent small UI reads,
bounded collection resync, acknowledged native effects, prioritized/fair worker scheduling and
sliced completion delivery. Decision 102 records Q18 B: small bounded FIFO export queue, not
parallel workers; exact count/bytes/capture/admission/destination rules still require review.
Updated architecture/contracts/tasks/test requirements and batch status; documentation only.

Batch 4 Q25-30 is now pending in docs/planning-review.md: visual baseline scope, performance
comparison gates, generated-test cadence, native E2E video, test-artifact retention and dependency
update organization. Batch 1 Q9 still awaits a choice, now covering active AND queued exports;
batch 3 Q19-24 remains wholly pending. Use explicit batch/global numbers or map local numbering
within a named batch; never apply an answer to another batch. No implementation or native tests.

Recorded B01-Q9 A as decision 103: normal Quit finishes active/queued exports with clear status
and safe explicit cancellation; unsaved-edit guards remain separate. Batch 1 is now fully answered.
Recorded batch 3 Q19 A ->104 malformed-current-input cancellation; Q20 A ->105 10% minimum
linear pressure; Q21 B ->106 normalized floating-point sRGB document channels; Q22 A ->107
visible-shape selection; Q23 A ->108 preserved transform stacking order; Q24 A ->109 padded
PNG origin and upward-rounded dimensions. Exact numerical/schema/Figma contracts remain reviewed.

Batch 4 Q25-30 remains wholly pending. New batch 5 Q31-35 is pending in planning-review.md:
exclusive managed-library process ownership, migration timing, recovery-copy restoration semantics,
source-change import behavior and PNG channel depth. No answers inferred; PNG depth is separate
from approved floating-point native color. Background color remains unanswered. Documentation
only, Markdown fence checks passed; no code, native tests or concrete schema implementation.

Batch 4 answered: Q25 B ->110 broad suitable-step visual baselines; Q26 A ->111 absolute plus
same-host relative performance gates; Q27 A ->112 short bounded seeded generated/fuzz commit
checks plus milestone campaigns; Q28 A ->113 targeted video; Q29 A ->114 eligible-successful
artifact pruning with protected evidence; Q30 A ->115 separate unrelated dependency upgrades.
Updated quality/tooling/tasks/testing/AGENTS and review status. These are documentation policies,
not installed checks, scheduled jobs, artifact deletion or measured passes; exact budgets pending.

Batch 5 Q31-35 remains wholly unanswered. New batch 6 Q36-41 is pending: export snapshot timing,
same-destination requests, failed-job queue behavior, crash persistence, navigation during export
and initial total queue count. Global IDs are preserved; no answers inferred. No implementation.

Batch 5 recorded: Q31 B ->116 multiple processes editing distinct drawings with coordinated
catalog/per-document ownership; Q32 B ->117 proactive bounded background upgrades; Q33 A ->118
explicit restore-as-independent-copy preserving original; Q34 A ->119 coherent captured-source
import. Q35 was duplicated B/A in the message; async clarification explicitly chose A (8-bit PNG),
recorded as120. Native colors remain floating point. No ambiguity remains for batch 5.

Updated architecture/database/contracts/tasks/tests/AGENTS and batch status, documentation only.
Concrete multi-process mechanisms, migration scheduling, schema/ABI/Figma and code remain unapproved.
Batch 6 Q36-41 is wholly pending. New batch 7 Q42-47 is pending in planning-review.md: contested
open, active-drawing upgrades, maintenance coordinator, ownership loss, catalog notification source
and deletion while another process owns the drawing. No answers inferred or runtime checks run.

Batch 6 recorded: Q36 A ->121 capture at accepted Export before panel; Q37 B ->122 same-target
jobs permitted with serialized valid replacement; Q38 A ->123 continue safe unrelated jobs after
failure; Q39 B ->124 durable job intent/source recovery; Q40 A ->125 exports outlive editor
navigation; Q41 A ->126 three accepted active/waiting/reserved jobs. Concrete durability/schema,
privacy/claims/resource contracts still need review. Count scope across processes is not inferred.

Batch 7 Q42-47 remains pending. New batch 8 Q48-54 is pending in planning-review.md: job DB
location, snapshot persistence timing, automatic/confirmed restart resume, changed destinations,
terminal snapshot retention, deletion with outstanding exports and per-library/per-process cap.
Updated plans/contracts/tasks/testing/AGENTS only; no job database, runtime or tests implemented.

Batch 7 recorded on 2026-10-16: Q42 activate verified owning window first, in-use fallback ->127;
Q43 A defer busy upgrades ->128; Q45 A pause on lost ownership ->129; Q46 A platform advisory
notifications plus catalog validation ->130; Q47 A refuse busy deletion ->131. Q44 is NOT answered:
owner asked whether only B is portable. Clarification in planning-review.md recommends A as one
logical resumable maintenance owner, with platform lifecycle adapters; no always-on process needed.

Batch 8 Q48-54 remains entirely pending. New batch 9 Q55-58 is entirely pending: library-wide versus
instance default-name sequence, import placement in gallery, rename while owned elsewhere and edge
whitespace in names. Exact alternatives are in planning-review.md. Concrete contracts/schema/Figma
remain for review. Updated decisions/plans/tasks/agent rules/testing requirements only; no code,
DBML/runtime/native tests or implementation authorization. Markdown fence balance checked only.

Batch 8 recorded on 2026-10-16: Q48 A ->132 separate job DB/snapshot area; Q49 A ->133 persist
after destination confirmation; Q50 A ->134 automatic verified-safe resume; Q51 A ->135 pause for
changed-target consent; Q52 A ->136 terminal snapshot cleanup; Q53 A ->137 deletion confirms and
coordinates pending-export cancellation; Q54 B ->138 THREE JOBS PER PROCESS plus shared resource
bounds. Exact orphan-job admission/accounting, schema/claims/durability/security remain reviewed.

Still pending Q44 and batch 9 Q55-58. New batch 10 Q59-61 asks local managed-library location,
app-level encryption scope and App Sandbox timing. All alternatives in planning-review.md; no
answers inferred. Estimate 10-15 remaining policy answers including current eight, then concrete
review packets rather than endless small questions. Figma/schema/ABI/budgets review is still required.
Updated documentation/agent requirements only, checked Markdown fence balance; no implementation,
security setting changes, dependencies or runtime/native tests.

Recorded Q44 A ->139 single logical resumable maintenance coordinator; Q55 A ->140 library-wide
Untitled sequence; Q56 A ->141 import initially at gallery top with honest source timestamps;
Q57 B ->142 coordinated rename via verified owning editor/shared Rust dispatcher with durable
confirmation; Q58 A ->143 trim outer whitespace in user-entered names. Concrete cross-process
request transport/trust/conflict/timeout contract is NOT approved by Q57; advisory catalog signals
remain distinct from mutation authority. Updated task/contract/schema/test/agent requirements.

Batches 7, 8 and 9 are fully answered. Only issued pending questions are batch 10 Q59-61: managed
library location, app-level encryption and sandbox timing. Remaining estimate now 5-10 policy
answers including those three, followed by concrete review packets, not endless micro-decisions.
No new batch needed while these are pending. Documentation-only; fence balance checked; no code,
Figma/schema implementation, platform permission changes or runtime/native tests.

Recorded Q59 A with future cloud planning ->144: fixed local library; provider-independent identity,
local persistence/cloud adapter separation, offline behavior and distinct durable/sync status. No
live SQLite file mirroring, selected cloud provider/protocol or implementation. Q61 A ->145 App
Sandbox from first runnable preview, early entitlement/access/multiprocess probes, no silent bypass.

Q60 is the only issued unanswered question. Owner asked how to handle encryption safely. Sourced
clarification in planning-review.md distinguishes OS/sandbox protection, optional SQLCipher-style local
encryption/key management, complete copy/cache coverage and later cloud E2EE/trust/key recovery.
Recommendation remains A for local preview; B if independent encrypted-file protection is required
now. Neither selected. Do not infer encryption approval or introduce a new framework. Updated docs,
tasks/agent instructions only; Markdown fence balance checked, no code, system settings or tests run.

Owner added a required follow-on agenda after remaining current policy questions: S00E thorough
day-zero security/threat model and whether a separate security agent is warranted; S00F platform
keyboard/gesture/input-device matrix with shared Rust behavior/proposed typed binding profiles and
native event/IME/OS boundaries; S00G official current store rules/channel matrix and role ownership.
Created documentation-only task briefs and linked them from task board/planning/agent/design rules.
These reviews precede freezing affected Figma/contracts; no new roles/transport/schema/store choices
are approved. Do not execute broad review prematurely or claim compliance research complete.

Q60 remains the only issued unanswered question (encryption A vs B). The new request did not answer
it. Respond with agenda confirmation and provisional responsibility split; after current decisions
perform the requested reviews, asking material follow-up decisions in consolidated packets. No code,
agent configuration changes, account/permission changes, publishing or runtime tests were performed.

Owner answered Q60: go without encryption -> decision146, A for the initial preview. No SQLCipher,
app password/master-key/recovery workflow; retain SQLite, App Sandbox, OS protections and redaction.
Future cloud security remains a separate reviewed design. All issued numbered Q1-61 are answered;
prior 5-10/3-8 remaining estimates are superseded, not a quota to fill with extra questions.

Current request asks what remains. Respond with outstanding review packets and distinguish them
from unanswered numbered questions: S00E security/role recommendation, S00F platform input/shared
Rust bindings, S00G current store requirements/roles, S02 concrete DBML/ABI/coordination/budgets/
platform probes, and Figma foundations/flows. R01 product emphasis and R07 language selection detail
are still proposed UX decisions; do not silently mark them approved. Next is requested S00E/F/G
review preparation, not application implementation. Documentation updated; fence balance checked;
no tests/code/dependencies/security settings or agent configurations changed.

Latest user approved OS-selected language at launch ->147 and clarified Concepts-like, open-source,
cross-platform editable vector sketching, MacBook first/future touch readiness ->148. Do not claim
future touch MacBooks exist or select license/full Concepts parity. Updated objectives/i18n/tasks.

User authorized S00E security review now. Lead wrote docs/security/day-zero-review.md and
security/gates-and-response.md after primary-source research and read-only rust_engine/macOS specialist
input. Highest-risk boundaries: hostile SQLite schema, stale persistence owners, authorized cross-process
rename, restarted export target/consent, export/delete admission and private plaintext copies.
Includes diagram, prioritized risk register, CT-linked proposed scenarios, gates/tool candidates,
response plan and role recommendation (existing implementers + scoped independent review; no new
permanent security implementer/config). Concrete protocols/schema/thresholds still need owner review.
Fresh reviewer security_packet_reviewer is assessing the proposal; final assessment pending here.
All Linefield files are uncommitted and no HEAD exists; use exact document hashes for review evidence.
No native tests/security scanners/penetration test/permissions/code performed. S00F/S00G still queued.

S00E review complete at architecture-proposal level: docs/security/review-record.md records exact
hashes and fresh reviewer disposition (no blocking packet issues). P3 stale task-status note fixed
and independently confirmed. Two specialist reviews read-only, lead sole writer. Only link/fence/hash
checks ran; no application/security runtime evidence. Owner concrete approvals and S00F/S00G remain.

Owner approved editable vector sketching app wording ->149 and ongoing security workflow ->150:
existing engineers implement controls/tests, explicit independent security reviews at sensitive design/
change milestones, no new permanent implementation agent. Dedicated security-review role may be
proposed later, particularly before cloud. Updated README/objectives, AGENTS, docs/security/development-
workflow.md and all 12 existing role instruction files. No model/concurrency changes or new roles.
Original hashed S00E review files remain unchanged; new workflow is separate. Concrete mechanisms
and implementation still need approvals; no scanner/CI/runtime checks installed. S00F input and S00G
store review remain next queued work. Configuration edits do not prove live role reload.

User asked how the four security steps enter daily workflow. Added tasks/_template.md and
quality/security-review-template.md, linked from task board/quality/workflow/AGENTS; S01 owns future
record validation. Impact -> sensitive-design assessment/owner approval -> negative tests/evidence
-> independent actual-change review. Existing tasks adopt fields before activation, no fabricated
classification/approval. Workflow is mandatory instructions; automated enforcement is not installed.

Independent security_workflow_review assessed decision150 role instructions and follow-on templates:
no blocking findings, all 12 role TOMLs parsed, current exact hashes in quality/security-workflow-review.md.
Lead checked template/workflow links/fences. No runtime gates installed; live agent reload unverified.

User requested explicit follow-through for automated gates and keeping the threat model current.
Expanded development-workflow stage matrix, structured action evidence/exception rules, stable SEC
threat-delta fields/triggers/owners and snapshot preservation. Added task/reviewer record fields and
S01/AGENTS/9 existing role notes. No runtime gates/CI/scanners installed; original S00E hashes preserved.
Later workflow/template files changed after prior independent snapshot; retain that historical record
and obtain follow-up assessment for this addendum rather than claim old hashes cover it.

Automated-gate/threat-upkeep addendum independently assessed: no substantive blockers. Minor S01
path line-wrap repaired to clickable link. Current workflow hash recorded in quality/security-workflow-
review.md; original S00E hashes unchanged. Security index and threat-change template now exist.

Current research handoff: S00G [channel strategy](distribution/channel-strategy.md) is prepared for owner review, alongside dated platform requirement registers. Recommended public channels are not selected; local macOS preview remains the only chosen distribution stage. No account, signing, package, store submission or implementation action.

Latest workflow addition: docs/owner-responsibilities.md centralizes owner decisions; eleven existing
agent roles have explicit distribution/milestone duties. The instruction-only project skill
.agents/skills/linefield-review/SKILL.md coordinates on-demand architecture assessments through
docs/workflow/milestone-review.md. No milestone review has run merely from adding the skill; no
channel choices, application code, executable runner, recurring automation or release actions added.
