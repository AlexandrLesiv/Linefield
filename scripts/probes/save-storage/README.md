# Disposable browser-storage safety checkpoint

Run from repository root after `node scripts/probes/browser-storage/acquire.ts` downloads and
verifies the pinned SQLite3.54.1 artifact into ignored cache:

```
node scripts/probes/save-storage/run.ts
```

Requires installed Chrome and Playwright. LINEFIELD_PLAYWRIGHT_ROOT may name another checkout's
apps/web/package.json for dependency resolution; LINEFIELD_EVIDENCE_DIR selects report output.
The runner creates its own ephemeral loopback origin/browser context; no live preview is used.
It records source hashes, artifact verification, hardware, browser and ten recovery assertions.

This is not production storage. The worker creates only generated fixture databases. Read-only
SAH-pool admission recognizes the pinned metadata layout and requires the expected database.
It refuses bad digests, unknown flags and missing targets before SQLite pool initialization.
The guard is bounded to32 files/1MiB and does not validate arbitrary SQLite file contents.
Web Locks coordinate fixture owners only. SQL strings are trusted fixture code, not input APIs.

The unsafe initialization negative control uses a copy of the damaged canary; truncation of that
copy is expected and asserted. Hash/size preservation is independently checked on the original.
COMMIT completion without a normal reply is reconciled by reopening a simple receipt table;
this is not the production document-incarnation, revision, operation-body and writer-grant contract.
Precommit termination, competing owners and pre-fault request failure are separately exercised.
No claim covers power loss, quota, corrupted SQLite contents, original OPFS proxy retirement,
real drawing load, native saving or end-to-end saving performance. See tasks/SAVE-02.md.
