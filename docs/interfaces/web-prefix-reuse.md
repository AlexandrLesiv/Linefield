# M04 unchanged-view completed-prefix reuse

Current first implementation slice,2026-10-23. The lead adopts these shared-engine and
independent-review recommendations under decision243. Source base is the frozen M03 runtime
fbaede9fc86bb7f7cd44bedaa4c76d6d76e16e65. This is an implementation contract, not evidence of
pixel parity or a performance pass. Reconcile the exact reviewed DIAG01 dependency before
combined verification and PR. Later pan-lattice, sparse routing and tile stages remain in M04.

## Authority and narrow admission

Rust alone validates retained Prefix source identity, immutable prefix membership and captured
view/metrics. Host owns physical completed B pixels, staging S, GPU admission and lifetime.
An exact retained Prefix B may seed S only for the same captured view and metrics and exactly
one additional completed source. This preserves the existing bounded predecessor traversal.
Same-prefix and multiple-successor cases use complete reconstruction in this slice. Undo,
rebranch, stale source identity, changed mapping/view and DisplayOnly or LiveSource authority
cannot manufacture reuse. No TypeScript source/order proof or geometry policy is introduced.

Add the named generated `memoryFrameReuse(owner,session,mapping,sourceFrame,targetFrame)`
entry point and immutable `FrameReuseSnapshot`. It contains the existing common outcome,
identity and activeCancelled fields, `reusable:boolean`, a typed `missReason` from
`none|view|same-prefix|successor-count`, and bigint `sourceCount`, `sourceThrough`,
`targetCount`, `targetThrough`. Positive admission requires both current valid Prefix proofs,
target matching the requested current mapping/metrics, identical captured view/metrics and
checked source.count+1==target.count. Equal/multiple-successor or view incompatibility returns
an ordinary successful negative query. Wrong kind/owner/session/handle and stale source/target
authority use existing typed rejection. Do not expose guessed fields on rejection.

Use the narrow read-only query boundary and an engine `&self` method: no source walk, mutation,
allocation, receipt acquisition, resource projection, pixel acknowledgement or activeCancelled
reset. Retain snapshot reservation, LIVE/BUSY/poison checks, checked JsValue arguments, common
identities and one outstanding snapshot/free-before-next-call behavior. Generated declarations
are the host authority. No raster lattice, placement offset, region cursor or geometry-worker
message change belongs to this slice.

## Useful ordinary-End ordering

Attempt the optional seed before an ordinary End fold replaces Prefix B with DisplayOnly.
Require an available unsealed S, a completed validated B in this renderer epoch with matching
physical texture identity, and the renderer's already admitted synchronous slot. Capture the
target Prefix and reserve its candidate ownership before the first copy. No GPU slot may be
held across asynchronous preparation, and no wait may be added before the next pen Begin.
Busy/sealed S, receipt pressure or negative proof leaves the existing complete path unchanged.
Preserve or reserve the receipt capacity needed by the ordinary fold before optional target
capture. Skip the seed if its extra retained target would prevent that fold; optimization
admission must not turn a previously admissible next stroke into a wait.

Copy B to S before the existing fold can overwrite B, within the same ordered GL submission.
Use exact integer texel fetch with distinct sampled/destination texture identities; preserve
packed S alpha and existing live-mask ownership. Do not change canonical blend/AA, paper or
painter order. The copy may write only RGB in packed mode. Rebuild only the single successor
through the existing predecessor-aware FrameCommands path, including its complete per-source
MAX union and one ordered source-over composite. Publish only after all issued readers/writes
validate and the current target remains eligible.
Validation must cover a submission serial containing the copy even if the successor is
invisible and produces zero geometry/composite commands. CPU completion alone is insufficient.

The base and seed temporarily share one host lease on the existing source receipt. A base
replacement transfers its reference rather than releasing a handle still needed by candidate
traversal. Release the Rust handle exactly once after both owners finish. This is not a new
Rust receipt, a cloned source snapshot or a ninth owner. Target ownership and host lease cleanup
must survive synchronous exceptions, stale commands, cancellation and renderer disposal.
The source lease outlives predecessor cursor disposal: releasing a frame also destroys its
visibility cursor. Do not release that receipt while producer cleanup still depends on it.

## Failure and limits

Seed construction is a distinct candidate mode from extension of an existing ready S.
In-place extension may retain its valid predecessor S before any write, as M03 already does.
A B-seeded operation must never reinterpret its source B receipt as ready S after failure,
even when no copy issued. Track copy-issued before the possible write; ambiguous/partial S
uses existing discard/rebuild/recovery, never replaying an append over uncertain pixels.
Any previously valid B remains governed by ordinary display ownership; do not hide a committed
stroke, resurrect cancelled content or claim current readiness from an incomplete candidate.

Keep eight frame/tail receipts, two submission fences, all-reader retirement, 192MiB aggregate,
normal13P/packed16P targets, geometry reservations and existing producer/queue limits. No new
full-size texture, archive, route bank or worker. Count fixed lease/copy metadata and any shader
resource honestly. Context/global failures use mandatory recovery; optional pre-write misses
use complete reconstruction without repeatedly attempting the same rejected candidate.

## Required verification

CT-02/03/04/06/07/08; INV-01/02/04/08/09/11; SU-03/04/13/14/16/20; SEC-03/09/13.
The single M04 writer owns browser fixtures and actual drawing-route E2E, logging/counters,
static/build/generated-boundary/source-size checks. No unit or developer-tool test suite.

- MIG-TILE-02: an ordinary End must produce a positive seed hit with fewer old-prefix commands,
  followed by immediate next stroke and Escape, with unchanged completed source/history.
- MIG-TILE-02: independent normal/packed full-rebuild parity, empty source/prefix, thin/wide and
  translucent overlap; same-prefix/multiple-successor/busy/sealed cases prove complete fallback.
- MIG-TILE-05: eighth-receipt pressure, base replacement while source lease survives, held second
  fence and repeated cleanup; no ninth handle, double release or early retirement.
- MIG-TILE-06: typed boundary rejection and activeCancelled preservation; stale/rebranch/view
  changes, failures before/after copy and during composite, context/Back/resize/cancel, recovery
  and fresh pen. No partial publication and no source B promoted as ready S on failure.

Freeze correctness before the bounded same-host comparison with M03. Report CPU preparation,
copy/replayed work, submission/fence validation and acknowledged update separately. Counters
must prove useful reuse rather than only a faster synthetic path. Existing thresholds and
pixel tolerances remain unchanged; preserve failures and missing evidence explicitly.
