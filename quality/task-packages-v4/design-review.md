# Task preview v4 — bounded design review

Reviewer: ui_ux_designer (`task_format_ux`), 2026-10-19.
Scope: owner-requested concise labels, complete task index, stable scrollbar gutter
and modest disclosure refinements on the approved minimal v3 layout. Base revision:
`8258f62848a4aeea701e018cd8083b6d61e3fb5b`; the working v4 captures below identify
the actual reviewed presentation. Prior v1/v3 records remain historical.

Verdict: no blocking design finding in the sampled v4 presentation. Changes preserve
the selected minimal layout and improve scanning without adding execution, editing
or approval controls. Owner PR review/integration remains separate.

## Sampled results

- Inspected the full task index at 1280 and 390 CSS-pixel widths, including an
  original-resolution narrow capture. IDs remain secondary, names readable and
  statuses aligned right on desktop or below the name on narrow screens.
- The index explains Source task once before the list. Unconverted documents are
  labelled as source records rather than assigned inferred completion/readiness.
  Both converted pilots remain visible among the source tasks. File discovery,
  deduplication and exhaustive membership are technical-check responsibilities.
- P05-S01's compact Review label, primary PR link and four closed groups retain
  the approved hierarchy. Scope & design, Verification, Review and Details & history
  are concise without hiding the purpose of each section.
- The expanded narrow Verification capture reads "1 check · 2 records" and retains
  a clear native open marker, strong focus outline, criterion/test information and
  ordinary evidence links. It does not turn recorded evidence into an acceptance
  verdict. Document type suffix removal reduces repeated metadata.
- S02L's Blocked label remains supported by the concrete storage explanation above
  the disclosures; healthy cases do not imply storage adoption or implementation
  approval. No invented action appears in place of its missing PR.
- Root `scrollbar-gutter: stable` is present. The browser runner compares heading
  x-position and width before and after disclosure expansion. That separate runtime
  assertion supports layout stability; a still image alone cannot establish it.

## Capture identity and test distinction

Local capture directory: `.build-cache/task-preview-v4/`. Browser report environment:
Chrome 155.0.8059.80 on Darwin 27.0.0 arm64. The implementer's report records nine
passed TASK-05 scenarios, including source-task navigation. The designer inspected
the selected captures, report and relevant source; did not independently execute
the browser suite or certify the complete source-task discovery algorithm.

| Inspected capture | SHA-256 |
| --- | --- |
| index-1280.png | `ccb4568c6b429785d1340d4ba564d94a4f1f1b1c150d24ea38739e11c1d39959` |
| index-390.png | `e18bf183eecd70ac1e15d06787883de5544d4074b593e8df64f99488a4f8d880` |
| P05-S01-1280.png | `9b05555e7cc9427deeec7735723af3e8de0f4ff8a9930504578b2046dc4cc7ed` |
| P05-S01-expanded-390.png | `e9acd753dd59067ff9e2c0c9e98f914566a256a1587a241bd3436d462a23928e` |
| S02L-390.png | `b0151ecf8adb29fd5ccb2fbcbaa005937798b6d8b163d52a0f7817839a0acfd9` |

## Limits

This is a sampled expert review, not a user study or exhaustive accessibility audit.
No physical assistive technology, zoom, print, forced colors, intermediate widths or
all expanded/source-task documents were visually reviewed. Source titles retain
their original wording/capitalization; this pass does not editorially rewrite the
repository's task taxonomy. The longer index uses ordinary document scrolling and
does not introduce filters or an inferred workflow grouping. English fixed-light
documentation remains separate from product localization and native UI evidence.
