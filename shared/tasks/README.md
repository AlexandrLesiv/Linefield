# Task records

`task.schema.json` defines the structured task record. `scripts/tasks/model.ts` mirrors its types;
`scripts/tasks/check.ts` validates records without starting a UI or executing task commands.

A task has one readable Markdown brief and one optional structured JSON record. The brief explains
what changes, its scope, acceptance and outstanding owner decisions. JSON holds explicit PR identity,
dependencies, requirements, app test selectors and links to current design/contract sources.
These are complementary authored sources, not different versions of the task.

## Links and trust

- PR state is a dated observation, not live GitHub synchronization or owner acceptance.
- Test links identify source and scenarios. Planned tests are not executed results.
- Architecture links should point to shared JSON/SQL definitions; local SVGs are visual exports.
- Screenshots and run logs belong in PR attachments or ignored local output. Do not commit copies.
- Documents identify repository-relative paths and hashes. Update hashes when authored input changes;
  use a revision only when it actually contains those bytes. Do not label edited sources immutable.
- Authority references link explicit scoped requirements. They cannot grant new product approval.

The bounded validator rejects malformed fields, conflicting identities, missing sources and unsafe
paths. Task data is data-only; no imports, executable commands, remote schema resolution or arbitrary
format plugins are evaluated. Validation is not a test result or acceptance verdict.

Agents read task.json and the task brief directly. No HTML tracker, generated Markdown mirror,
duplicate screenshot inventory or separate agent representation is required. Older task documents
can migrate individually without inferring their status, approval or evidence.

Optional `attachments` entries contain a title, kind (screenshot/video/report) and HTTPS URL.
They link review material without copying bytes into Git. URLs are not fetched or treated as
verified evidence by validation. Empty attachments mean none are linked, not that checks passed.
