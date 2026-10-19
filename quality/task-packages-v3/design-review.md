# Minimal task preview v3 — combined design review

Reviewer: ui_ux_designer (`task_format_ux`), 2026-10-19.
Scope: DX-T02 task index and P05-S01/S02L read-only pages, updated within PR #4.
Base revision: `2db0cd6aa528ebcdcc64988048f97422ac12ea3f`; assessment covers the
working v3 renderer and identified captures below. It does not approve future changes.

The owner selected the minimal v3 mockup before implementation. Its versioned
reference is [reference.svg](../../docs/design/task-preview-minimal-v3/reference.svg),
SHA-256 `0a12d10dae49d1c0df7983654fe0121db05919c68af6ca8279030a6388e94fbb`.
Earlier v1 review/evidence remains separate historical evidence.

Verdict: sampled implementation follows the owner-selected minimal direction;
no blocking design finding. Owner PR review/integration and independent technical
review remain separate responsibilities. This is implementation fidelity assessment,
not a new request to approve the already selected mockup.

## Behavior and information hierarchy

- The task list contains names and explicit status only. Task pages lead with a
  compact title/status, short outcome and primary PR link where a PR exists.
- All four primary groups are closed in the default captures: Scope and design,
  Verification, Review findings, Technical details and history. Native disclosures
  retain access to the detailed record rather than replacing it with a short summary.
- Source inspection shows scope/authority/dependencies/documents in the first group,
  acceptance/tests/evidence in Verification, independent reviews in Review findings,
  and PR snapshot/revisions/handoff in Technical details and history. Full semantic
  preservation is also a technical-review concern; this walkthrough is not an audit
  of every document line.
- S02L exposes its concrete storage blocker before the closed sections. It has no
  invented PR action or implementation clearance. P05-S01 remains awaiting review.
- The expanded narrow Verification capture retains criterion/test/evidence links,
  explicit recorded-result limitations, a visible native open marker and a strong
  keyboard-focus outline. The PR link remains navigation, not a merge command.

## Presentation and fidelity

Inspected seven actual headless Chrome captures: index and both pilot tasks at
1280 and 390 CSS-pixel widths, plus expanded Verification with keyboard focus at 390.
The white canvas, 672px desktop reading column, 32px task title, quiet status, short
summary, dark PR link and understated disclosure dividers match the selected mockup's
composition. Native triangle markers differ from its drawn chevrons; this preserves
the intended hierarchy and standard disclosure semantics without custom controls.

The narrow layout keeps readable text and full disclosure labels within its column.
The task index avoids the former dashboard cards and repeated metadata. Shared color,
body/meta typography and relevant dimensions remain sourced from the approved tokens.
The explicit v3 layout refines their use without changing the drawing product UI.

## Captures and verification distinction

Capture environment: Chrome 155.0.8059.80, Darwin 27.0.0 arm64. Local files are under
`.build-cache/task-preview-v3/`. The separate browser report records eight passed
TASK-05 scenarios. The designer inspected captures/report/source; the implementer
executed the browser tests. Static images do not by themselves prove keyboard behavior.

| Capture | SHA-256 |
| --- | --- |
| index-1280.png | `eb56267a14d6859d36b5b7733151ca97044975373f272309559a97119e141e69` |
| index-390.png | `380cabc8eb3faf4854515deaf98eab632189d90551697bcafb9c62bd44432ceb` |
| P05-S01-1280.png | `472cf0f17f0ce86cf956114845bbfdb3b332b60796087f522577bdc717fdbae4` |
| P05-S01-390.png | `e9903db55cc12ed4e841c5a44fff63f363b9d8cbf937ad841b75515cc8fccc5d` |
| S02L-1280.png | `99bc0e8fe826fd2cf0f9d3fe79413bc4ab2d6dddcaacc6214f6e4dda8d100cee` |
| S02L-390.png | `564e280423a4bd25844cc959043c32444d47e530466e014ab6524188e3e90547` |
| P05-S01-expanded-390.png | `356f19680717f41462c710414f839e688214b435a9a810ee66ff36a98feb91d7` |

## Limits

Sampled visual fidelity is not a user study, exhaustive accessibility audit or product
locale/theme certification. No physical assistive technology, browser zoom, forced
colors, intermediate widths, print output or complete matrix of expanded documents
was visually validated. English fixed-light documentation remains the bounded scope.
The reader exposes preserved evidence and dated PR observations; it does not certify
current implementation freshness or approve scope, storage adoption or integration.
