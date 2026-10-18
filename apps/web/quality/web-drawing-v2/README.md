# P05-D01 selected drawing screen — 2026-10-18

Scope: owner-authorized decision234 UI-only prototype. Slim left rail, contextual settings, static sample/blank artwork. No editor, persistence, native host, Rust/Wasm, dependency or trust-boundary changes. Preexisting uncommitted gallery/docs/research preserved. Base HEAD fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7; exact working-source/build hashes in manifest.json.

## Frozen interaction contract

Designer reviewed the selected reference before coding. Five selectable preview modes; default Pen. Width integer1–32/default8; opacity0–100/default100; smoothing0–100/default25. Pen has all controls; Line/Shapes width+opacity; Eraser width with opaque sample; Select a localized no-settings message. Width/opacity change only an isolated sample. Smoothing only changes its local value. Settings/color are visibly unavailable and named accordingly. Entry resets state. No panels, save claims, added routes or global letter shortcuts.

Native range keyboard handling is retained. Pointer adjustments cancel on Escape, blur, resize and pointercancel; stale pointer input stays rejected after cancellation. Range-changing keys during an unfinished pointer adjustment are rejected. Fresh keyboard editing works after cancellation even if release was lost. Idle/IME Escape does not navigate. Explicit Back/history still navigate. Chrome stays hidden/inert during travel; entry/exit completion does not steal deliberately moved focus.

## Acceptance mapping

| Scenario | Browser evidence |
| --- | --- |
| WEB-D2-01, CT-01/03, INV-01/08, SU-02 | drawing-shell disposable modes and artwork/history test; desktop captures; production smoke |
| WEB-D2-02, CT-08/09, INV-05/11, SU-07/20 | normal Tab traversal; selected/disabled accessible names; browser WebKit touch test; >=44px target/reach assertions |
| WEB-D2-03, CT-01/03/09, INV-08/11 | width/opacity sample, mode applicability, opaque Eraser regression, reentry defaults |
| WEB-D2-04, CT-02/08, INV-04/05, SU-07/08 | idle/active Escape, IME fixture, native keyboard bounds, held-pointer modifier/keyboard/cancel and late input |
| WEB-D2-05, CT-09, INV-11, SU-20 | desktop en/light uk/dark;320uk;390dark;740×320; enlarged pseudo-RTL/forced colors and LTR; footer/header non-overlap |
| WEB-D2-06, CT-02/03/08, INV-04/05 | blur/resize/cancel signals, lost release, stale focus on both travel directions, inert midpoint captures; retained rapid history/reduced-motion tests |
| WEB-D2-07, CT-03/08, SU-08 | entire retained gallery suite, exact artwork endpoints, Back/Forward/direct/reload, repeated New and source focus restoration |
| WEB-D2-08, CT-07/09, SEC-09/12/13 | literal HTML-like/Unicode names; bounded browser ranges and invalid normalization; contextmenu fixture; independent source/security review |

Input/lifecycle/pseudo-layout injections are labeled in tests. Browser context-menu fixtures check non-interception, not physical long-press UI. No numeric text parser was introduced. Native E2E, physical touch/stylus/VoiceOver, design review approval and proficient Ukrainian linguistic review are not claimed. Locale resources and browser behavior do not establish linguistic review.

## Verification

Final results and exact tool/platform versions are in manifest.json, results.json and production-smoke.json. check.log contains24 shared tests plus strict types/lint/format/200-line checks. build.log names production assets. browser.log is full pnpm web:test output. Full browser suite uses the existing loopback Vite preview source at65142; separate smoke uses built assets at65144 in Chrome and WebKit. No source edits during the final run.

Development failures retained in this record: initial sandbox server bind was blocked; authorized automated escalation enabled headless execution. Initial adaptive test incorrectly inherited Chrome channel for WebKit, fixed to explicit empty channel. Initial full run92/93 had one gallery failure during live source reload; final frozen run supersedes it, with no retries or lowered assertions. Earlier focused run17/17 preceded final mixed-input guard; final full run verifies that guard too.

## Reviews and dispositions

Designer local-runtime-artifact review passed composition, themes, narrow/short layouts, enlarged LTR/RTL/forced colors and travel captures. Repaired clipped width thumb, enlarged Back wrapping and footer collision. Static captures are not interactive playback review. Direct browser review was rejected by automatic approval review because the user prohibited Computer Use requiring approval; that path was stopped and replaced by local artifact review.

Independent reviewer assessed implementation/security separately. Findings repaired: hidden opacity leaking into Eraser; stale exit focus restoration; modifier key reopening a canceled drag; keyboard recovery after lost release; mixed keyboard input prematurely completing an active pointer adjustment; expanded layout overlap. No new sensitive boundary, logging exposure, injection hook, HTML interpolation or dependency was found. Final reviewer disposition is recorded alongside the manifest after evidence inspection.

Final independent verdict: no unresolved actionable findings. Reviewer independently ran check/build successfully, rebuilt identical production assets and verified127 manifest hashes; inspected106 passing browser cases (17drawing-specific), all with zero failures/skips/flaky outcomes/retries. Browser launch in the reviewer's sandbox was unavailable; execution evidence was inspected, not independently rerun. No merge/publication approval is implied.
