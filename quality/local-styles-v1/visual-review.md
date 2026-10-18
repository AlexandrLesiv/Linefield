# P05-S01 visual preservation review

Verdict: **pass for the captured existing interface states**. The local-class refactor preserves
all32 before/after images exactly: zero differing RGBA pixels, without tolerance or masking.
This is a bounded regression review of STYLE-02/03, not approval of new product behavior.

## Identified builds and method

Reviewed2026-10-19 by the scoped UI/UX reviewer. Incoming artifact corresponds to parent
`b0cb531b331371493792355a3baaddca61632709`, using preserved build assets
`index-DCSOpgQJ.js` / `index-z7JnId1S.css`. Current frozen build uses
`index-Diz_-CZy.js` / `index-BjDhnKYu.css`. Exact asset and screenshot SHA256 values,
browser/host details and per-pair comparisons are in [visual-manifest.json](visual-manifest.json).

Headless Chrome155.0.8059.80, macOS Darwin27.0.0 arm64, Node24.12.0. Both built artifacts were
served by separate loopback-only static servers; no foreground automation or external upload.
The default sandbox denied loopback listen; the authorized scoped run succeeded. Both temporary
servers and browser were closed after capture.

Full matrix: desktop1280×900 and touch-emulated mobile390×844; en-US and uk-UA; light and dark;
gallery, open action menu, Rename dialog and direct-route drawing. Each combination used a new
browser context and each state a new page. Device scale1, reduced motion, loaded images/fonts,
settled animation endpoints, identical pointer position and hidden text caret made comparison
repeatable. PNG pixels were decoded and compared channel-for-channel, with no accepted baseline
replacement.64 captures remain local under `.build-cache/s01-visual/`; the compact manifest is
versioned instead of adding another full screenshot collection to the repository.

## Combined behavior and presentation checklist

| Concern | Actual observation | Disposition |
| --- | --- | --- |
| Gallery/adaptation | Desktop grid and mobile single-column collection, mobile New action, card geometry and artwork match incoming captures | Pass for sampled endpoints |
| Action menu | Keyboard activation opens the same anchored menu; focused Rename and destructive Delete appearance match | Pass for sampled open state |
| Rename | Existing menu-to-form action opens the same dialog, selected native field, secondary Cancel and primary Rename styling; mobile light/dark backgrounds match | Pass for sampled open state |
| Drawing | Direct route opens the same slim rail, contextual bar, selected Pen, focus-visible Back, static artwork and prototype disclosure | Pass for sampled initial state |
| Locale/theme | English/Ukrainian chrome and wrapping, light/dark surfaces, unchanged artwork colors and orientation match | Pass for sampled states; no linguistic approval |
| Manual visual inspection | Inspected representative desktop light gallery, dark drawing/Rename, Ukrainian drawing, mobile light menu/Rename, dark Rename and Ukrainian gallery/drawing | No clipping or visual regression introduced in these samples |

The narrow drawing bar preserves its existing horizontal overflow; the capture shows its initial
scroll position, not every setting. Existing static artwork cropping is unchanged. No new control,
palette, geometry, workflow or native appearance was selected by this review.

## Limits and required companion evidence

This capture matrix does not exercise complete normal-motion continuity, hover/press timing,
resize transitions, every gallery row, empty/error/removed states, expanded/RTL/large text,
forced contrast, physical pen/touch/IME, screen readers or other browsers/native hosts.
Use the lead's final full browser suite and source review for behavioral preservation and broader
existing scenarios; do not count these32 image comparisons as32 additional browser test cases.
The incoming artifact is a comparison reference, not a new execution of its historical test run.
No durability, engine correctness, native accessibility or performance claim follows from images.
