# Task package contract v1

`task.schema.json` is the data-only JSON Schema 2020-12 contract. TypeScript tooling validates
and renders it; task definitions never import code or execute commands. The TypeScript mirror
is `scripts/tasks/model.ts`. Schema changes must update that mirror and conformance tests together.
The schema is a documented subset, not a general-purpose schema engine. The local validator rejects
unsupported keywords, including unsupported keywords in unused alternatives. No remote schema
resolution, custom functions, format extensions or arbitrary regular expressions from task data.

## Ownership and presentation

One executable leaf owns its task package, branch and PR. A milestone aggregates planning and has
no implied executable branch. Definitions use repository-relative paths. Authored narrative remains
Markdown; generated task views are read-only projections, not competing sources. Shared contract and
policy documents remain authoritative at their existing paths, linked with exact SHA-256 identities.
Task-specific documents can live beside the manifest without moving shared or historical evidence.

`authority.refs` contains document IDs, not URLs or invented approval claims. Acceptance entries link
explicit test/evidence IDs; scenario IDs preserve existing cross-task semantics. Those IDs are not a
new scenario registry or proof of automatic test discovery. Test selectors are labels, never executed
by a task viewer. Implemented tests require a source path and selector; planned/manual tests can have
null values. Security classification and authority are declared evidence to review, not automatic
permission grants. Full narrative retains detailed security, design and edge-case review requirements.

## Evidence identity and limits

Each document/evidence record names a path and SHA-256. `loadTask(root, path)` validates the structure,
ID references, PR identity and bounded local files. Every referenced `sourceManifest` path must also
have a hashed document/evidence record. An existing log remains original evidence: migration does not
rewrite old outcomes or fabricate dates, revisions, test discovery or current execution. Null identity
fields mean unknown; `limitations` explains unavailable facts. Distinct evidence IDs retain attempts,
failed runs and later remedies rather than overwriting failures with the latest success.

`artifactRevision` identifies the Git revision containing the referenced document or report bytes;
the renderer uses that full revision for a pinned repository link. Null means an explicitly mutable
authored-source link, not a pinned snapshot. This is separate from evidence `sourceRevision`, which
identifies the runtime source tested by that run and may precede the report's eventual commit. Never
substitute a task base revision or a tested runtime revision for an unknown artifact revision. Local
SHA-256 validation checks checkout bytes; it does not fetch GitHub or prove remote object availability.
Repository-relative path validation is not a publication allowlist: the lead still reviews payloads
and excludes private captures, backups and credentials before publishing.

A passed historical result does not certify the current tree. The viewer must label it as recorded
evidence and disclose whether current-build comparison happened. Existing action-report freshness
only compares inputs before and after that action; it is not present-day or post-merge verification.
This version does not parse every native report, discover all tests, assess semantic sufficiency or
claim a complete acceptance gate. Native and manual execution cannot be inferred from linked source.

PR metadata is a dated observation. The validator checks repository/number/URL agreement, not GitHub
state. A `done` leaf requires an observed merged PR and passing integration evidence whose source
revision matches its merge revision. The evidence still needs human review; structural consistency
does not prove authenticity or complete coverage. Completed milestone aggregation is intentionally
unsupported in v1. Preserve `owner-review` or `integration-pending` until actual integration evidence.

## Bounds and local-file handling

- Manifest: at most 512 KiB; each linked file: at most 8 MiB; one package: at most 32 MiB read.
- Collections: at most 256 items; narrative string: at most 16,000 code points; nested schema: 24 levels.
- Relative paths: at most 500 characters; reject absolute/traversal/encoded URL paths and symlink files
  or ancestors within the selected repository root. Ownership paths name concrete directories/files,
  not shell globs. Test source files must exist even when their contents are not evidence hashes.
- No publishing, network fetch, commands, automatic execution or state-changing API is part of loading.

The root is a trusted caller-selected repository. File checks are for local documentation correctness,
not a sandbox against a hostile process changing parent directories concurrently. Large captures stay
outside v1 loaded evidence; use a small tracked manifest recording local-only artifacts and limitations.
Do not publish private captures, credentials or raw application content through a task package.

Acceptance mapping: TASK-01 structure/owned-schema subset; TASK-02 file/hash/reference preservation;
TASK-03 PR/test/integration linkage. Tests live in `scripts/tasks/validate.test.ts` and file-boundary tests.
