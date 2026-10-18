# DX00 local action/report contract v1 — 2026-10-18

Scope: S01 background checks and later DX01 thin Zed launchers, authorized by the owner's instruction to work through tasks/. This is a local developer CLI, not an application ABI, browser service, generic workflow engine or dashboard. Existing pnpm commands remain. No installation, network access, foreground task or arbitrary command entry is introduced.

Build-reliability supplied this bounded plan; lead owns integration and independent reviewer assesses it before code. CT-07 tool-job privacy, CT-08 developer actions, INV-09 and partial SU-01/SU-18 apply. These labels do not claim application/native acceptance.

## Fixed interface

`node scripts/action.ts <action-id>` accepts exactly one known ID and no extra arguments. Unknown IDs, shell syntax, output paths, environment/cwd overrides and additional operands reject before child spawn. Script actions use process.execPath; compiler actions resolve the pinned installed platform-native TypeScript binary directly, with no wrapper/fallback. All use fixed argv/repository cwd and shell:false.

| ID | Existing installed entry and fixed arguments |
| --- | --- |
| root-typecheck | Pinned native TypeScript tsc --noEmit |
| web-typecheck | TypeScript tsc --noEmit -p apps/web/tsconfig.json |
| lint | Oxlint --deny-warnings with current scripts/shared/theme/shared/localization/apps/web/src/apps/web/tests targets |
| locales-check | scripts/localization.ts --check |
| theme-resources-check | scripts/theme-resources.ts --check |

Initial runner support is macOS/Linux with Node24. The TypeScript Node wrapper can fall back to a nested process even on these hosts, so it is never launched: resolve its pinned installed native package and spawn its tsc binary directly. Missing/mismatched native packages fail without a fallback. Windows remains outside the first validated host lane. Oxfmt uses child-process workers and is excluded until a separately reviewed descendant-lifecycle adapter exists. Existing direct formatting/check commands remain available.

These check-only actions do not bootstrap missing generated output. Do not wrap check.ts or build/dev/server commands in this first adapter: nested spawnSync/long-lived child trees are not covered. Preserve the original check runner for aggregate diagnostics.

## Execution and privacy

One direct child per invocation. Child-runtime limit120seconds; cancellation/timeout/output ceiling requests termination with a one-second grace before forced kill. Snapshot scans and final metadata add time outside that child limit. Only direct leaf commands are supported; test installed lint entry behavior before claiming cancellation coverage. No global process search/kill, foreground window activation or system settings.

Child environment copies only required PATH/HOME/TMPDIR/TMP/TEMP/SystemRoot/LANG/LC_ALL values and forces NO_COLOR=1. Do not inherit NODE_OPTIONS, credentials or arbitrary environment. Never serialize environment values. Work from repository paths, never the old reference checkout.

Consume stdout/stderr without retaining raw text. Count bytes; a combined1MiB output ceiling terminates the action with output-limit outcome, not a false pass. No source lines, file names, drawing data, paths, credential strings or raw tool output enter the result. Detailed diagnostics remain available through existing direct commands. Caller stdout receives one small JSON result; there is no automatic file sink, retention job, deletion quota or symlink-writing surface.

SIGINT/SIGTERM are cancellation requests; missing executable or spawn error is distinct. The first terminal cause wins; later output/exit events cannot convert cancellation or failure to pass. Handler/timer cleanup occurs on every terminal path. A child that refuses termination must not be described as successfully canceled; supported-host kill behavior is tested with a direct fixture. Unavailable host behavior is reported honestly.

## Result v1

Allowlisted fields: schemaVersion1, unique jobId, actionId, startedAt/finishedAt UTC, monotonic durationMs, outcome (passed/failed/cancelled/timed-out/spawn-failed/output-limit), exitCode/signal, Node/tool version, platform/architecture, revision/dirty state when available, before/after source fingerprint and freshness (fresh/stale/unavailable), stdout/stderr byte counts. Unknown action rejection is a fixed nonzero CLI error without echoing supplied text.

Fingerprint relevant source/configuration/resources before and after; hash sorted relative paths and file bytes. Each scan is bounded to5000files/32MiB/10seconds, reading chunks rather than unbounded files. Oversized/unreadable/symlink input marks fingerprint unavailable. Freshness means endpoint snapshot equality only; it cannot detect edit-and-revert races or guarantee an atomic source snapshot. Freeze source during acceptance runs. Exclude generated build outputs, evidence, credentials and node_modules; include checked generated locale/theme resources where relevant. Reject symlinks rather than following external paths. Revision is read with bounded local Git-metadata file reads (no unmanaged subprocess); dirty state remains explicitly unavailable in this first adapter. Missing optional Git metadata does not invalidate a known source fingerprint or cause a false clean claim. Missing fingerprint data is unavailable and fails CLI acceptance. Successful process exit with stale/unavailable freshness returns nonzero CLI status and is not acceptance. Command outcome remains separately recorded.

Versioned stdout is the report transport. The separate cancelled flag records cancellation accepted through final metadata collection; a cancelled job cannot pass even if its child finished successfully. Finished time and monotonic duration are sampled after revision metadata completes, from the original job start; they exclude serialization/stdout delivery. Finalization then removes cancellation handlers before writing the immutable report. Report serialization/write failure returns nonzero without printing raw error details; no claim of a persisted report. Distinct job IDs permit caller-managed output without overwriting runner-owned artifacts.

Filesystem scan deadlines are cooperative checks between I/O calls, not guaranteed interruption of stalled OS reads. Ancestors inside the repository are checked for symlinks as well as final entries. Source must remain frozen during acceptance; these checks do not provide an adversarial concurrent-filesystem race boundary.

## Required conformance

DX-ACTION-001 invalid/extra/metacharacter input rejects before spawn;002 fixed command/cwd/no shell;003 failed/missing executable;004 timeout/cancellation/forced termination;005 flood output and no raw/secret content;006 changed source yields stale;007 distinct job identity;008 stdout sink failure visible;009 missing generated resources fails without generation. Tests use disposable direct Node child fixtures, not a test hook in the app.

Verify every allowlisted action on actual installed tools; root type/lint/format/200-line gates include new source/tests. Production action arguments stay fixed; test helpers may inject an executable and short timeout only at the internal process adapter boundary. No user-facing arbitrary command flag exists.

DX-ZED-001 follows after runner checks: project-local entries invoke only this Node entry and fixed IDs, avoid editor focus, and expose no native/foreground actions. Verify current official task syntax before writing. No custom extension.

DX-ACTION-010: final timing cannot precede completion of revision metadata; a controlled promise tests
deferred, exactly-once clock sampling and preserved cancellation without timing thresholds.
