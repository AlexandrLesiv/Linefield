# Browser storage feasibility — 2026-10-19

**Experiment complete; neither candidate is ready for production adoption.** Ordinary SQLite
OPFS worked in Chrome/WebKit. The same-worker SAH alternative passed five healthy lifecycle cases
but **destroyed a synthetic payload after its pool metadata was damaged**. That is an observed
safety finding, not a passing preservation test. No app storage, Rust bridge, production schema,
removal lifecycle or real drawing was implemented or changed.

## Exact results

Base `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus preserved work; Darwin27.0.0 arm64,
Node24.12.0, Playwright1.64.1. JSON timestamps are UTC; runs occurred on2026-10-19 Europe/Kyiv.
Execution used approved headless browsers, no desktop focus or system-security changes.

| Candidate / browser | Result | Evidence |
| --- | --- | --- |
| `opfs`, Chrome155.0.8059.80 | PROBE-01–06, both PROBE-07 control/termination observations and PROBE-08 browser restart passed:9 scoped rows | [attempt06](attempt-06-results.json), [proxy identity](attempt-06-proxy-instrumentation.json) |
| `opfs`, WebKit27.2 | PROBE-01/02 build/pragmas and close/reopen/integrity passed:2 rows; other lanes unrun | [attempt06](attempt-06-results.json) |
| `opfs`, pinned Firefox Playwright1555 | Launch failed before storage tests: “Could not find profile folder”; isolated `/private/tmp` retry failed identically | [diagnostic](firefox-results.json) |
| `opfs-sahpool`, Chrome155.0.8059.80 | SAH-01/02/03/04/06 passed:5 healthy rows; nested Worker construction count0 | [pool results](pool-results.json) |
| `opfs-sahpool`, Chrome155.0.8059.80 | SAH-05 observed payload truncation20480→4096bytes, mapped names empty | [pool results](pool-results.json), [before](synthetic-canary-before.bin), [after](synthetic-canary-after.bin) |

These are separate exact-build runs, not one combined green suite. Every completed report contains
source hashes. All12 latest pool source hashes match current files. Earlier OPFS results predate
the shared helper parameter, server allowlist and profile-path changes used for fallback; their
recorded source hashes identify that earlier build, not fresh coverage of the final combined
fixture. [Attempt history](attempts.md) and [failed fixture report](attempt-05-results.json) remain.
Firefox was initially missing, then installed by the lead through approval; its runtime lane is
blocked. A launcher failure does not establish product incompatibility.

## Meaning and limits

OPFS verified actual SQLite3.54.1, DELETE/FULL/foreign_keys pragmas, committed row close/reopen,
two workers serializing synthetic catalog writes, competing-owner denial, uncommitted rollback
after termination, committed-row survival, and Chrome profile restart. PROBE-06 terminates after
fixture-confirmed COMMIT, **not** a genuine lost reply. Workers share one page; this is not
multi-tab client attachment. Browser JS is runtime-tested/linted, not separately strict-typed.

The reviewed proxy fixture pauses immediately before real flush. The control recorded release,
flush start/completion and commit. After parent termination and successor lock grant, no old-proxy
flush start was observed before successor recovery completed. This does not cover already-issued
browser I/O or an old proxy paused before acquiring a sync handle and resuming after its successor
closes. **STORE-W9 remains unproved.** A bounded no-event observation is not universal fencing.
Baseline proxy loads included the instrumentation prefix unarmed. Original vendor bytes are intact.

The SAH fixture disables proxy VFSs, uses separate fixed directories, and holds a matching Web Lock
through install/unpause/use/close/pause. It explicitly sets clearOnInit:false and
preserveOnInitFailure:true. Healthy cases cover catalog A→B→A, simultaneous different pools,
denial before same-pool initialization, precommit termination and pause-while-open rejection.
They do not establish quota/close/init failure safety or corruption recovery.

## Observed preservation failure

The runner copied a healthy20480-byte synthetic opaque file to evidence **before** changing one
metadata byte. Fresh pool initialization then succeeded with no mapped file names, truncated the
same file to4096bytes and logged “Disassociating file with bad digest.” Its SQLite payload was lost.
The pinned getAssociatedPath/setAssociatedPath code confirms successful initialization can do
this; preserveOnInitFailure only changes a separate failed-initialization cleanup path.

- Before SHA-256: `24cac60e7ba65467e015ac4e01e82b2ea49e316f55a664253f7dd25689fc3039`.
- After SHA-256: `ad7facb2586fc6e966c004d7d1d16b024f5805ff7cb47c7a85dabd8b48892ca7`.

The pool experiment's exit0 means it completed and recorded the finding, **not** safety acceptance.
Never treat preserveOnInitFailure as protecting all existing bytes. No removeVfs, forceReinit,
production cleanup or workaround was added; the canary contains only fixed synthetic data.

## Adoption gates

| Lane | Disposition |
| --- | --- |
| STORE-W1 | Partial: artifact/build, isolated headers/CSP, Chrome/WebKit; Firefox runtime and full dependency/license/advisory audit remain |
| STORE-W2 | Partial: two workers and exclusion; two-tab attachment and stale-writer proof unrun |
| STORE-W3 | Partial: precommit rollback/postconfirmed-commit termination; true lost-reply reconciliation unrun |
| STORE-W4 | SAH corruption finding; quota/I/O/flush faults and catalog reconstruction unrun |
| STORE-W5 | Basic denial only; scope ordering, orphan claims, freezing and generations unrun |
| STORE-W6 | Queue/copy/Wasm/proxy memory and capacity unrun |
| STORE-W7 | Durable localized UI/history/recovery not implemented or executed |
| STORE-W8 | Chrome restart passed; persistent-storage refusal/eviction/power-loss unrun or unproved |
| STORE-W9 | Original proxy fencing unresolved; alternative pool has observed preservation blocker |
| STORE-W10 | Client hosting, rename projection repair and reconstruction unrun |

Next bounded recommendation: review a storage-preservation/admission design before product code.
Resolve either original proxy retirement/pending-handle authority or a non-destructive pool
pre-initialization/quarantine approach with exact byte-preservation fixtures. Selecting the latter
changes VFS/pool lifecycle and needs concrete review; it is not automatic fallback. Do not weaken
preservation or infer production Saved guarantees. No more experiments belong to this slice.

## Provenance and reproduction

Pinned728897-byte `https://sqlite.org/2026/sqlite-wasm-3540100.zip`, SHA3-256
`87e24f6a4588692310b7942dc2fa7c7275bb9ba2e01d553e4115aa4a904a0050`, verified before extraction.
Source identity `2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76`,
Emscripten5.0.1. [Artifact record](artifact.json), original archive and notices are retained.
JS notices identify SQLite portions as public domain and Emscripten glue as MIT/NCSA. This is
notice inspection, not full dependency/advisory audit. Product manifests are unchanged; generated
vendor bytes are excluded from handwritten limits. Owned Node strict types, Oxlint and Oxfmt
passed; largest handwritten file138lines. [Scenarios](scenarios.md) were reviewed before faults;
independent final review is coordinated by the lead.

Commands: `node scripts/probes/browser-storage/acquire.ts`, then ordinary candidate
`node scripts/probes/browser-storage/run.ts`; append `firefox` for its isolated diagnostic.
Alternative: `node scripts/probes/browser-storage/pool-run.ts`. Localhost65149 and headless
permission are required. Profiles are isolated; do not overwrite pinned evidence on casual reruns.

Report SHA-256: pool-results.json `20218cc3508f090acacec7f91c34682d6958db02fb9f5670c2526518bc16308c`;
attempt-06-results.json `13e259f81b88337a3f71bceba45508472a14911ace470b99bfeda4b04b721239`;
firefox-results.json `540217b545c4d7b7799f2f41dd796a29e8e77d2cf12bc11218e7d5f36e319756`.
