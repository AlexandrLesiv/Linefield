# Structured task records

A task has one stable identity and one readable record that links its scope, PR, tests,
design/architecture sources and review material. The owner requested structured JSON
without a separate HTML task manager. Tasks remain repository documentation; they
cannot execute commands, approve work, merge PRs or synchronize remote state.

## Source organization

A converted task lives under tasks/ID with a task.json manifest. The manifest owns
identity, type, outcome, lifecycle, dependencies, responsibility, authority, acceptance
and linked resources. Authored brief.md can carry concise prose where JSON strings
would be awkward; the owner is choosing whether to retain that companion or use JSON
alone. Neither choice requires generated HTML or a second status database.

Unconverted task Markdown remains readable source until deliberately migrated. Do not
infer its status from a heading, checkbox or folder name. A milestone aggregates
bounded child tasks; each executable leaf owns one branch and one PR.

## Readable information order

1. Task ID, short title, outcome, status and PR link.
2. Scope/non-goals, dependencies, owned paths and implementation authority.
3. Acceptance criteria mapped to app/core/boundary tests by source path and test ID.
4. Architecture and design links to canonical JSON/SQL/specifications; relevant authored
   screenshots or boards are references, not alternate sources of contract truth.
5. Review findings/disposition, remaining decisions and concise next handoff.

Keep full contracts in their canonical files rather than copying them into every task.
Generated diagram exports are local; agents read the shared definitions. Reference
images that are the authored design source remain distinct from disposable test captures.

## Links and evidence

A PR entry identifies repository, number/URL, observed state/time and known revisions.
The observation is dated, not a live claim. The owner reviews and merges on GitHub;
completion requires actual integration verification. A closed-unmerged PR is not Done.

Acceptance entries reference test IDs, layer, source path and selector where available.
Planned/manual cases are labelled honestly. Link validation does not prove tests were
executed, a selector resolves, coverage is complete or the current candidate passes.

Recorded results identify their tested source and limitations. File hashes establish
artifact identity, not current-code freshness. Generated reports/logs/captures remain
local and untracked; unresolved failure fixtures must remain recoverable. A task can
summarize a real run without importing raw output into its authored brief. Missing,
failed, skipped or stale required evidence blocks completion, regardless of valid JSON.

## Validation boundary

Validate manifest shape, stable references, required PR/test linkage and declared
state consistency. No task-defined shell command, arbitrary path escape, private
capture or credential may become an implicit publication input. Structured metadata
is documentation, never execution authority or a security sandbox.

Use the existing task JSON validator and its focused tests. A future migration of all
tasks is a bounded follow-up after the source format is settled. Generated Markdown,
if retained for agent convenience, is a derived reading view and is never edited as
an independent source. No task UI, hosted tracker or live synchronization is required.
