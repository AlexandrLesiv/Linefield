# Task tracker v4 — independent review

Reviewer: `review_task_packages`, 2026-10-19. Base
`8258f62848a4aeea701e018cd8083b6d61e3fb5b`; same DX-T02 branch and PR.
Reviewed the working tree represented by all 126 paths in
[tested-source.json](tested-source.json). No production application changes.

Verdict: no remaining blocking technical finding for the owner-requested complete
task inventory and presentation refinements. Owner merge/integration remains separate.

## Scope and state integrity

All 44 current task Markdown files appear once; the two structured packages replace
their corresponding source entries. README and the task template are excluded.
The other 42 pages render source prose with an explicit notice that workflow status
and evidence have not been reconciled into a structured package. The renderer does
not parse an old `Status: done` line into a current completion or approval claim.

Source pages use escaped text, ordinary links and native disclosures. Task filename
filtering restricts IDs; the existing bounded reader rejects symlinks, nonregular
files and path escapes. No raw Markdown HTML, script, remote asset or task command
is executed. Source links identify current repository documents rather than claiming
immutable historical evidence. Existing structured evidence retains its hash and
revision identities. Public source selection remains a review responsibility, not
a secret-scanning capability.

Shorter Review/Blocked labels preserve the actual workflow distinction. The blocked
milestone keeps its limitation visible. Removing redundant document-kind labels
does not remove the document bodies, authority, test links, hashes or provenance.
The scrollbar gutter reserves root layout space; tests compare heading x/width
before and after opening a disclosure rather than relying on a screenshot alone.

## Findings and fixes

| Severity | Trigger / impact | Resolution and re-review |
| --- | --- | --- |
| P2 | Initial `sourceTasks` used parallel reads of up to 1,000 files with an 8 MiB per-file limit. Valid input could allocate several GiB before rendering. No aggregate rejection test existed. | Reads are now sequential, with 256 KiB per source and a 4 MiB accepted aggregate budget. Actual per-file and 17-file aggregate overflow tests reject rather than truncate or drop content. Reproduced the tests and inspected the implementation. |
| P2 | Initial v4 manifest covered scripts/generated pages but omitted direct source-task inputs, including the changed DX-T02 handoff. It could not fully identify generation inputs. | Manifest now includes all 44 source tasks, prior package/schema/token/config inputs and new scripts/outputs. Independently hashed all 126 entries after refresh; every hash matches. No source change or test-result substitution accompanied the manifest correction. |

## Verification

- Independently reproduced all 21 task unit tests, generated drift check and
  whitespace check: passed. Inventory tests verify each source entry appears once,
  package precedence, index/template exclusion, escaped content and capacity failure.
- Inspected the fresh root log: 127 tests plus root/web strict types, lint, format,
  generated checks and source-size gates passed. Full root suite was inspected,
  not independently rerun by this reviewer.
- Inspected the actual browser runner and nine-scenario report: source-page
  navigation/back, closed disclosures, keyboard focus, root gutter and unchanged
  x/width, hostile text and route constraints. All seven local capture hashes match
  the recorded values. Did not run a concurrent browser suite or foreground checks.
- Verified the source inventory contains 44 files and checked diff scope. Existing
  historical quality records and original task records remain unchanged except the
  current DX-T02 handoff updated for this revision. V1/v3 evidence was not rewritten.

## Limits

TASK-04/05 and documentation/evidence aspects of CT-08 are applicable. This is not
wholesale structured migration, automated test discovery, live PR synchronization,
current product verification, or native/assistive-technology acceptance. The browser
evidence uses headless Chrome; it does not establish every browser/OS scrollbar mode.
The trusted-root/concurrent-filesystem and publication-selection limits from earlier
reviews remain. No new application ABI/schema/security mechanism is introduced.

Designer assessment is a separate record. Parent-first owner integration and any
affected post-merge checks remain outstanding. Re-review changed inputs or assumptions;
this verdict describes the exact manifest-identified v4 working tree.
