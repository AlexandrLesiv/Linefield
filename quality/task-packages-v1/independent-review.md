# DX-T02 independent implementation and boundary review

Reviewer: `review_task_packages`, 2026-10-19. Independent of the schema, renderer,
pilot data and tests. Base `afb82c5deb4cfa3d3e9a641659a20887b9689b8a`; branch
`codex/dx-t02-task-packages`. Reviewed the working tree identified by all 34 entries
in [tested-source.json](tested-source.json), not an unspecified future revision.

Verdict: no remaining blocking finding for the bounded task-schema, two supplemental
pilots and read-only preview scope. Suitable for owner review. This is not owner
approval of the visual layout, permission to merge or production-engine acceptance.

## Boundaries and scenarios examined

TASK-01–05 exercise the documentation/evidence aspects of CT-08. No shared engine,
native ABI, persistence mechanism or product behavior changes. Product SU scenarios
and native invariants are retained as referenced historical/planned requirements;
this task does not execute or certify them.

Reviewed schema/model agreement, closed objects, supported schema subset, bounded
collections/files, duplicate IDs, path traversal, symlink and nonregular sources,
digest conflicts, missing source files, PR identity/date/merge consistency and the
distinction between historical results, planned tests and verified integration.
Task strings, source text and logs cross into generated HTML/Markdown; reviewed
escaping, CSP, local-only route selection and absence of task command execution.

Challenged consequential sequences beyond valid fixtures: remove a package but keep
its old generated page; render an active Markdown payload; follow a mutable evidence
link after the branch moves; display an unbroken long label on a narrow screen;
retain successful storage cases alongside the unresolved truncation failure.

## Findings, corrections and re-review

| Severity | Trigger / location | Impact and missing coverage | Disposition |
| --- | --- | --- | --- |
| P2 | Package removed/renamed; `scripts/tasks/generate.ts` checked only expected pages | An orphaned task page could remain directly accessible while drift checks passed | `checkInventory` now rejects unexpected generated HTML without deleting original records. TASK-04 orphan-page regression passes. |
| P2 | Task text contains raw HTML or link syntax; `scripts/tasks/markdown.ts` interpolated it | Markdown consumers could interpret active content despite safe HTML preview | Data fields now escape Markdown/HTML syntax. TASK-04 adversarial Markdown regression passes; intended generated headings remain. |
| P2 | Evidence link followed after branch advance/deletion; `presentation.ts` used mutable branch URLs | A link labelled original evidence could resolve to different bytes or disappear | `artifactRevision` separates artifact location from runtime source identity. Preserved records link to immutable revisions; mutable authored/test-source links are labelled. All 15 immutable references independently hash-verified against Git. |
| P2 | Valid long unbroken title at narrow width; `preview-style.ts` lacked general wrapping | Readable task content could force page-wide horizontal overflow | General wrapping added; actual styled hostile-text browser fixture includes a long title at 390px and verifies no overflow. Reviewed the passing runner/result. |

The designer separately found undersized metadata and duplicated typography values;
the final renderer consumes approved shared tokens. Its visual disposition is in
[design-review.md](design-review.md). Re-review found the above technical repairs
preserve the approved scope and do not weaken assertions or required evidence.

## Reproduced and inspected verification

- Independently ran `node --test scripts/tasks/*.test.ts`: 18 passed, zero failures,
  skips or cancellations. Ran `node scripts/tasks/generate.ts --check`: passed.
  `git diff --check` passed.
- Independently checked SHA-256 for every entry in `tested-source.json`: all 34
  current inputs/outputs match. Independently read all 15 immutable artifact locations
  from Git and compared their bytes with the pilot hashes: all match.
- Inspected the root log: 124 tests across the recorded suites, then strict root/web
  types, lint, formatting and source-size checks passed. Did not independently rerun
  the full root suite; focused feature tests were reproduced as stated above.
- Inspected actual browser runner and final eight-scenario report: headless Chrome
  155.0.8059.80, Darwin 27.0.0 arm64, desktop/narrow pages, keyboard disclosure/focus,
  hostile text and closed route boundary. Capture hashes match local files. Did not
  run a competing browser suite or foreground automation. Designer inspected the
  final sampled captures and recorded their exact identities.
- Original task files and prior evidence are not modified by this diff. S02L remains
  blocked, its tests explicitly planned, and its destructive synthetic storage
  finding remains visible beside healthy-case results. P05-S01 remains owner-review;
  hash preservation does not claim fresh execution of its historical browser suite.

## Explicit limits and remaining owner work

The validator proves structural consistency and local byte identity, not approval
authenticity, remote GitHub state, selector discovery, semantic coverage or current
runtime equivalence. Artifact revisions are declared metadata; the inspected pilot
references were independently checked, but automatic Git-object verification is not
claimed. Completion still requires the repository's actual review/integration policy.

The selected root and source files are trusted/quiescent. Lexical, symlink and size
checks are not a hostile concurrent-filesystem sandbox. Public source selection was
reviewed for these pilots; path/hash checks do not detect secrets or authorize
publishing ignored/private data. No new dependency, network fetch, task action API,
credential access or product test hook was added. Local preview serves only generated
pages on loopback; the static pages load no remote assets or scripts.

Wider migration, richer Markdown, automatic test-result adapters, present-day evidence
freshness and execution controls remain separate work. Owner visual acceptance and
parent-first PR integration remain outstanding. Re-review changed source assumptions
or integration conflicts before acceptance; this verdict does not cover later edits.
