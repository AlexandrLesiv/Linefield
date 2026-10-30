# Web foundation review packet

Prepared2026-10-18 for the bounded existing-component deliverable in [S00A](../../tasks/S00A.md).
Status: lead validation and independent document review passed; owner foundation approval
is pending. This packet consolidates implemented web components and their recorded evidence.
It proposes no new appearance, control, feature, refactor, native implementation or architecture.

Decisions232–234 already select the consistent Linefield visual direction, responsive Web gallery
and slim rail/top-settings prototype. Those authorizations remain valid; this packet does not
reopen them. Follow [foundations](foundations.md) and [workflow](workflow.md). The combined designer
owns behavior and presentation; lead coordinates review; engineers own implementation/tests.

## Identified scope and evidence versions

Base Git revision: `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7`, plus intentional uncommitted work.
The base commit alone does not identify the reviewed implementation. The manifests below bind
the source, resources, tests, captures and builds to their recorded snapshots. SHA256 values
identify the exact referenced files; later changes require explicit reconciliation.

| Artifact | SHA256 |
| --- | --- |
| Gallery source/build manifest | `38b550959c1a3fd2c2512a0850e197d9f21f38f37e6d3830521f452bd0728efd` |
| Drawing v2 manifest | `1d7b6f6e120c0317aa1ea955394839d914a79c7e2ec4f64ba135e6242bb27c59` |
| Localization launch manifest | `9849f072bc553d5414a48d4b43b1142ad60cd5331bc99884fa98897f4ec83a49` |
| Unrun keyboard follow-up manifest | `928522e7193a3d19cdbcce5912836b066f04f925ccffd4ab310c322fe6b4c0b1` |
| [Selected drawing reference](drawing-screen/reference.png) | `5e0bde75591c868d12c0548ce916c746d5d8918ea430c38a19f203da4d341123` |
| [Foundation specification](foundations.md) | `64c4b2152e8216feb01be052bf95a342e7f263a927afb6faf75ff75a8da69f8f` |
| [S00A inventory/status](../../tasks/S00A.md) | `3ea4d27c82985eb33edba967911f9e80f74c0368d33a69d21f5a4c7899bb0b24` |

Current recorded D01 build assets: `index-CpH1NmHN.js` and `index-z7JnId1S.css`; exact bytes are
hashed in its manifest. The lead rechecked all139 manifest entries during this documentation
slice with zero mismatches. That is a freshness check, not another browser run. The older G01
build remains historical baseline evidence, superseded by D01 for current application source.

Recorded host: macOS27.0.1 arm64, Node24.12.0. Browser evidence uses headless Chrome155.0.8059.80;
D01 built-asset smoke also uses Playwright WebKit27.2. These runs do not establish native UI,
physical touch/stylus, screen-reader or latency acceptance.

## Component inventory within review scope

| Existing component family | Source and observable responsibility |
| --- | --- |
| Semantic resources | [Theme adapter](../../apps/web/src/theme.css.ts), [theme authoring](../../shared/theme/README.md), [locale authoring](../../shared/localization/README.md): shared UI roles, artwork/UI separation and en/uk messages; generated native resources are not native consumers |
| Gallery cards/New | [Gallery](../../apps/web/src/gallery.ts), cards styles: responsive collection, literal names, ellipsis actions, disposable blank preview and empty state |
| Menu/Rename | [Menu](../../apps/web/src/menu.ts), [Rename](../../apps/web/src/rename.ts): anchored actions/form, text validation, cancellation and focus return |
| Removed slot/Undo | [Drawing actions](../../apps/web/src/saved-gallery-actions.ts), [Undo motion](../../apps/web/src/undo-motion.ts): same-slot durable recoverable drawing removal and restoration, with accepted state independent of animation |
| Drawing chrome | [Shell](../../apps/web/src/drawing-shell.ts), [layout](../../apps/web/src/canvas.css.ts), [controls](../../apps/web/src/drawing-controls.css.ts): header, five-tool rail, contextual row, disclosure and fixed zoom readout |
| Range/sample | [Range](../../apps/web/src/drawing-range.ts), [icons](../../apps/web/src/drawing-icons.ts): bounded integer local values, isolated sample and selected/disabled/focus semantics |
| Routes/travel | [Navigation](../../apps/web/src/navigation.ts), [routes](../../apps/web/src/routes.ts), [surface motion](../../apps/web/src/surface-motion.ts): validated sample routes, gallery/drawing travel, source geometry and focus restoration |

This inventory records existing responsibilities, not a proposal for a shared widget API or
native code reuse. Width/opacity affect only the isolated sample; smoothing changes only its
local value. Modes are affordances without editing behavior. Color/Settings are unavailable.
New adds no durable drawing. There are no storage/loading/recovery success claims.

## Behavior checklist

“Recorded pass” below refers to the linked historical browser evidence, not execution during
this documentation slice. CT/INV/SU mappings identify design intent; they do not certify an
unimplemented shared Rust command or native conformance layer.

| Check / mapping | Observable outcome | Evidence and remaining gap |
| --- | --- | --- |
| One Web pattern; WEB-ONE01/02, SEC-WEB-QUERY-01 | Old platform/preview queries cannot change pattern or capability; ellipsis at every size; browser context behavior remains unintercepted | Recorded G01 pass; physical long-press UI not certified |
| Gallery actions; WEB-ONE04, CT-03/08 | Rename applies literal text; Cancel preserves prior name; Delete retains same-slot Undo; restoring/removing samples does not wait for visual completion | Recorded G01 and retained D01 browser pass; no durable deletion/recovery acceptance |
| Navigation; WEB-D2-06/07, CT-02/03/08 | Explicit Back/history, known direct/reload routes and rapid traversal preserve accepted route, artwork endpoints and intended source focus; stale completion cannot steal deliberately moved focus | Recorded D01 pass; production hosting outside the tested Vite/built-preview setup and native navigation remain separate |
| Local modes/properties; WEB-D2-01/03, INV-01/08/11 | Entry resets Pen/width8/opacity100/smoothing25; mode applicability is explicit; width1–32 and percentages0–100; artwork and route unchanged | Recorded D01 pass; real editing, persistence and engine semantics excluded |
| Input/interruption; WEB-D2-02/04/06, INV-04/05 | Native range keys, local pointer cancellation, idle Escape no-op, composing Escape priority; chrome inert during travel | Recorded D01 pass includes labeled lifecycle/IME fixtures; physical IME and assistive input unrun |
| Locale/content; WEB-D2-05/08, CT-09, INV-11, SU-20 | Browser-selected en/uk with English fallback; independent regional display; Unicode names remain literal and artwork orientation unchanged | D01 plus9 localization cases recorded pass; injected preference lists are fixtures, linguistic approval pending |
| Extended keyboard coverage; WEB-D2-02/03/05, I18N-UK-002 | Full narrow Tab/Shift+Tab traversal, Space/Enter activation and updated localized accessible percentages | Two cases authored/discovered and statically reviewed; execution UNRUN after server listen EPERM |

## Visual checklist

| Check / mapping | Identified reviewed states | Evidence and limit |
| --- | --- | --- |
| Common composition; DS-01/02, WEB-D2-01 | Selected slim rail/top contextual settings, optical icons, active Pen and unavailable affordances; no wheel | Selected reference plus D01 desktop captures; existing screen authorization does not approve unseen components |
| Adaptive layout; DS-03, WEB-ONE03, WEB-D2-05 | Gallery639/640 and959/960 boundaries; drawing1440×1000,1280×900,320×700,390×844 and740×320; intentional row/rail scrolling and title ellipsis | Recorded browser assertions and designer artifact review; no universal minimum/maximum or native-window claim |
| Theme/artwork separation; DS-04, INV-08/11 | Light/en, dark/uk, unchanged sample colors/geometry and theme-aware chrome | D01 desktop/narrow captures and retained theme/artwork tests |
| Focus/targets/large text; DS-02/04, WEB-D2-02/05 | Selected/disabled states, ≥44CSSpx targets, enlarged LTR and pseudo-RTL/forced colors; repaired Back/footer collisions | Recorded D01 assertions and artifact review; full sequential keyboard follow-up remains UNRUN; no screen-reader claim |
| Locale layout; DS-04, CT-09 | Real en/uk, mixed-script names and enlarged pseudo-layout | Recorded D01/localization evidence; full-catalog pseudo-expansion and proficient terminology review pending |
| Motion presentation; WEB-D2-06/07, CT-02/08 | Entry/exit midpoint chrome hidden; retained artwork/shell endpoints, interrupted/reduced-motion expectations | Browser motion tests plus designer static-artifact review; screenshots alone are not an interactive playback walkthrough |

Capture links and exact hashes: D01 evidence
and its manifest; G01 reviewed captures.
The captured image files are ignored local evidence and must remain available for visual review;
the text packet alone is not a substitute if those files are missing.

## Evidence accounting and unresolved readiness

- G01:88 full passes before final cleanup,30 overlapping focused passes after it,89 final
  discovered cases. Do not describe these as118 unique passes or a final full-suite rerun.
- D01:106 full browser passes, zero failures/skips/flaky/retries;24 shared tests and required
  static/build checks passed; Chrome/WebKit built-asset smoke passed. Designer artifact and
  independent implementation/security reviews are recorded in the evidence packet.
- Localization follow-up:9 passes on unchanged application source. No combined115-case run
  is claimed. [Readiness/glossary](../localization-web-readiness.md) records remaining linguistic,
  native-resource, physical IME/AX and full-catalog layout gaps.
- Keyboard follow-up:2 discovered cases, static reviews/checks only, browser execution UNRUN.
  Configured local server failed `listen EPERM` on127.0.0.1:65142 before any case began.
  Native foreground checks require an explicit current reservation.
- Complete native component mappings, physical input/AX and per-host locale execution are absent.
  Native durable library/loading/recovery and shared command availability require their own
  concrete contracts, identified designs and implementation authorization.

## Narrow future owner review scope

On owner return, the lead may present this identified packet as the existing web subset of
S00A: component responsibilities, common visual/interaction intent and its evidence limits.
No decision is requested during the away window. Owner disposition/date/conditions remain
pending, and DS-05 is not marked complete by this document or by designer/reviewer agreement.

A later approval must identify its scope explicitly. It cannot approve the two unrun tests,
translation quality, native controls, durability, future screens/tools or architecture merely
by accepting this inventory. Preserve already-selected web screens. Any new native/product
slice needs its own detailed behavior/visual packet and applicable approval rather than a
reopened gallery/wheel selection exercise.

Documentation security impact: no runtime or trust-boundary change, external upload, private
data handling, dependency or production source change. This packet introduces no new tests or
claims of newly executed runtime checks. Lead and independent reviewer verified all seven embedded
artifact hashes and all139 D01 manifest entries.29 local links and whitespace checks passed.
Independent document review has no unresolved finding; the original implementation reviews remain
evidence for their own frozen snapshots. Actual fresh verification belongs to the implementing task.
