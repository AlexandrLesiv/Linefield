# Local browser saving

One Rust editor owns completed state, regional samples, settings, history and revision tracking.
`save-app` supplies a separately generated checked ABI. `scheduler.ts` requests bounded capture,
SHA sealing and retirement; `prepare.ts` transfers disposable chunks to the storage worker.
The Rust authority validates exact sealed receipt fields before acknowledging durability.

`createSaving(core)` opens and restores before input/render handlers are installed. The worker
holds one origin Web Lock through SQLite lifetime, inspects pinned SAH metadata before opening
existing data, validates the stored revision/digest chain, and commits opaque incremental batches
atomically. Unknown/corrupt storage refuses admission. No silent reset or generic SQL endpoint.

The current preview deliberately stores one local drawing per browser origin. It has no journal
compaction or gallery/import/export/cloud integration. Limits48MiB/10,000batches and Rust capture
limits are explicit failures: canonical unsaved edits remain in memory and drawing is allowed,
but Retry cannot solve a permanent capacity limit. Reload starts a fresh Undo/Redo session.
See tasks/SAVE-05.md for exact evidence, limitations and review state.

Build: `node scripts/build-vector-editor.ts` compiles save-app, verifies generated boundaries and
copies pinned SQLite3.54.1 runtime assets. If absent, the existing acquisition script downloads
and SHA3-verifies the official archive; copied runtime files are separately SHA256-checked.
Assets stay in ignored public/build directories. Runtime permissions are same-origin OPFS and
Web Locks; supported browser/storage failure is visible before admitting editing.

E2E runners: apps/web/tests/vector-saving*.mjs, with explicit LINEFIELD_PREVIEW_URL pointing to a
separate candidate origin. Faults are injected by test-process worker interception, never by a
shipped command. Drawing responsiveness is distinct from durable completion and physical input.
