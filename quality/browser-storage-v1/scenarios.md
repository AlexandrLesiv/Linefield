# Synthetic browser storage experiment — scenario contract

CT-03/04/05/08, INV-01/06/07/09, SU-09–13/21; STORE-W1–W10 from the storage proposal.
Owner authorized this disposable fixture, not product persistence. Implementer owns cases/results.
All data are generated integers and fixed synthetic names in a disposable origin/profile.

| Case | Trigger / starting state | Expected outcome / invariant | Coverage limit |
| --- | --- | --- | --- |
| PROBE-01 | Load pinned SQLite in isolated worker | Actual OPFS open; requested DELETE/FULL/FK pragmas verified; build identity captured | Capability check, no app bridge |
| PROBE-02 | Commit one synthetic row, close/reopen worker | Exact row survives and integrity_check is ok | Not power-loss proof |
| PROBE-03 | Two workers request catalog lock and insert disjoint IDs | Both batches survive; no duplicates; Web Locks serializes | No client attachment implementation |
| PROBE-04 | One worker holds drawing lock; second requests ifAvailable | Second rejected; first retains authority | No product lock protocol |
| PROBE-05 | Terminate owner after BEGIN/INSERT, before COMMIT | Successor gets lock; old uncommitted row absent; integrity ok | Deterministic precommit point, not during flush |
| PROBE-06 | Terminate owner after fixture-confirmed COMMIT | Successor finds one exact operation row | Does not test a genuinely lost COMMIT reply; that remains unrun |
| PROBE-07-CONTROL | Arm served-only proxy barrier after setup; COMMIT reaches pre-flush barrier; release | Mark actual flush start/completion and exact committed row | Proves the injected barrier is live |
| PROBE-07 | Reach same pre-flush barrier; terminate owner; acquire successor lock; release old proxy gate | Successor sees no old row, integrity ok; no old-proxy flush-start observed before successor completes | Before flush API submission, not interruption of queued OS I/O; cannot prove STORE-W9 |
| PROBE-08 | Close and relaunch browser with same isolated profile | Committed marker survives actual browser restart | Profile only, no OS crash/eviction |

PROBE-01/02 run per available installed Chromium/Firefox/WebKit. Remaining contention/fault/restart
cases target Chromium first; no inference of cross-engine parity. Unsupported or missing engines
are UNRUN/unsupported, never passes. Captured stderr is bounded and fixture-only. No real drawings,
private page navigation, global settings, foreground automation, production logs or app code.

Quota/flush fault injection, corruption/reconstruction, freezing, bridge/copy memory accounting,
localized durable UI, client hosting and actual delayed proxy flush are not implemented by this
experiment. These remain explicit STORE-W4–W7/W9/W10 gaps for adoption review.

The independent reviewer approved the served-only single-site pre-flush instrumentation before
execution with a positive control, unique channel, original/served digests, reached/released/
real-flush markers, bounded waits and guaranteed fixture cleanup. No production fault hook exists.

## Lead-assigned bounded alternative (not adoption)

Same pinned artifact, `opfs-sahpool`, proxy VFS disabled, matching Web Lock held throughout
install/unpause/use/close/pause; three handles per fixed synthetic pool; clearOnInit:false and
preserveOnInitFailure:true. No removeVfs or forceReinit. Independently reviewed before code.

| Case | Trigger | Required observation / limit |
| --- | --- | --- |
| SAH-01 | Catalog pool A→B→A close/pause/unpause | Exact marker and integrity persist; no nested worker construction |
| SAH-02 | Different drawing directories live concurrently | Both independent markers survive; no shared pool contention |
| SAH-03 | Second writer requests held pool lock | Admission denied before pool initialization; current marker unchanged |
| SAH-04 | Terminate owner with uncommitted row | Successor admission/reopen observes rollback and integrity |
| SAH-05 | Corrupt one synthetic pool metadata byte after capturing exact raw canary | Record raw before/after bytes, mapped-file disappearance and payload preservation or destruction; finding is not a safety pass |
| SAH-06 | Pause pool while its database remains open | Rejection preserves lock/data; normal close/pause still succeeds |

SAH-05 deliberately tests the pinned source's known destructive bad-digest path in isolated
synthetic files only. Copy the canary to evidence before mutation. No real app file is touched.
Successful healthy cases do not approve opaque-pool recovery or corruption policy.
