# Web vector migration acceptance

Maintained verification source for P05-M01–M09, MIG-C1 and MIG-D1. Generated captures/results
belong in ignored .build-cache. No imported donor or historical E01 pass certifies these changes.

## Invariants and scenarios

CT-01 commands/capabilities; CT-02 input/cancel; CT-03 state/queries; CT-04 typed boundary;
CT-06 rendering/resources; CT-07 diagnostics; CT-08 evidence; CT-09 localization;
INV-01–05/08/09/11; SU-03/04/13/14/16/20 apply by feature.
Each leaf maps actual browser test names to the following scenarios and records current gaps.

| Scenario | Required result |
| --- | --- |
| MIG-E01 | Rapid/long actual-sample intake, terminal event ordering, fresh next stroke; no missing committed ink |
| MIG-E02 | Cancel/blur/resize/stale identities; no partial commit, correct fresh interaction |
| MIG-E03 | Pan reveal5%, fractional/reversed pan, zoom/rotate roundtrip; aligned current output |
| MIG-E04 | Undo/Redo, no-op preservation, Back/Resume and complete scene identities |
| MIG-E05 | Malformed boundary, loss/recovery, allocation pressure; retained canonical state/no partial acknowledgement |
| MIG-E06 | Warm/cold/evicted geometry and stale/saturated/lost worker; parity and bounded resource ownership |
| MIG-E07 | Sparse/dense overlap, group union, tile/chunk edges, thin minification and cache parity |
| MIG-E08 | All brush pressure/opacity/material/paper/grid values and filtering; raw data preserved |
| MIG-E09 | Layer protection/order/history and selection/group-transform semantics independent of cache |
| MIG-E10 | Live zero/wide Slice/no-hit/cancel/all samples/source fragments/blend/one Undo |
| MIG-E11 | Combined tools/history/lifecycle/recovery; en/uk/gallery/focus/IME/theme regression |

Use actual application input/control browser E2E. Test-only fault injection may trigger failures
inside that journey but is not a substitute for normal input. Synthetic pen is not physical
Wacom. Keep physical device, IME/assistive-tech and Ukrainian linguistic gaps explicit.
Static types/lint/format/build/generated-boundary checks remain required. No unit suites.
For isolated preview runs, set `LINEFIELD_TEST_PORT` (or `LINEFIELD_FIXTURE_PORT`) in the
runner process before configuration loading, and derive both server and browser origins from
`test-ports.ts`. Overriding only Playwright `use.baseURL` leaves explicit browser contexts on
the default origin. Set `LINEFIELD_E2E_MANIFEST` to the served fixture manifest when using an
isolated output directory; preserve setup failures separately from product results.

## Unchanged approved performance profile v1

| Metric | Absolute gate |
| --- | --- |
| Input/Rust/returned-copy | p95≤4ms, max≤16ms |
| Main rendering | p95≤8ms short,≤16ms long/many |
| Any application main task | <50ms |
| Input→complete preview submission | p95≤33ms short/50ms long-many, max≤100ms |
| View/history→complete submitted+acknowledged | p95≤100ms warm/250ms cold-evicted,max≤500ms |
| Final pan→fresh drawing available | ≤250ms |

Six workload rows:32-sample strokes,65,537-sample stroke+continued drawing,1,024 overlapping
64-sample strokes; each at1024×768 and4096×2048 backing pixels. Five release runs after untimed
warmup,≥100 observations per metric/cache condition. Investigate same-host regression exceeding
both15% and2ms. Preserve exact input prefixes, scene/mapping IDs; incomplete/stale output cannot
count. Record CPU admission/preparation/upload/submission and GPU completion separately.
No browser timing proves physical input-to-photon latency. Readbacks/screenshots outside timing.

M02 early checkpoint is a bounded20-minute feasibility diagnostic after the release build and
interactive preview exist: short/long at both sizes, continued ink/pan reveal/warm-cold Undo.
Stop on decisive correctness/absolute timing failure and repair the bottleneck. It is not a
full p95 acceptance pass. M03/M04 add bounded warm/cold/evicted comparisons; M09 full profile.
No threshold relaxation to obtain green. Missing/flaky/skipped/stale evidence is not pass.

## M03 browser scheduling and lifetime checks

The retained-geometry follow-up implements the adopted
[retention contract](../../docs/interfaces/web-geometry-retention.md). Its new
`retention.fixture.spec.ts` cases are authored and initially unrun; browser passes must be
recorded against the subsequent frozen build. CPU pressure uses actual canonical strokes,
worker preparation/adoption and checked placement until the existing payload/descriptor cap
positively refuses retention. It then covers B streaming, a late A hit, actual LRU victim
selection and later B reuse (MIG-WORKER-04/18). GPU cases exercise real WebGL allocations at
small explicit residual budgets and at4096 allocations, separately from raster correctness.
These are browser boundary/fault cases, not natural input or throughput claims.

MIG-WORKER-15/27/28 hold the actual FrameCommands disposal after final submission to verify
both tokens stay active and post-cleanup invalidation earns no idle credit. MIG-WORKER-05/16/24
hold actual prepared-page CPU ownership after GPU retirement, including context loss and
cleanup rejection; a replacement attachment receives the single admission wake. The candidate
rejection case holds actual FrameCommands cleanup inside ProgressiveScene, then rejects it and
requires the old owner gate to remain failed even after known host arrays drain. Release cases
borrow an actually adopted worker page across retirement and fail generated page/ticket release
before mutation, or return a rejected ticket code: uncertain canonical ownership stays separately
charged, repeated release is idempotent, and fatal release permits no later editor export.
MIG-WORKER-02/18 (`retention-detail.observation.spec.ts`) uses the actual app route, accepted
zoom/rotation, a positively held display RAF, controlled clock, real worker requests and trusted
strokes. It checks acceptance at240ms restarts the250ms quiet deadline, content does not restart
it, genuine misses request held/final detail, and final Undo/Redo pixels agree. Generated button
activation and scheduling control are explicitly integration evidence, not latency evidence.
Actual-route screenshot parity remains in shared-pages and the existing recovery/cancellation
lanes. Oversized whole-chunk demand, fragmentation/compaction, interrupted multi-page cursor
drain, partial-constructor failures and per-host heap measurements still need focused evidence;
these authored cases do not imply exhaustive coverage or M03 performance acceptance.

Idle retirement counts metadata inspection and each page/ticket release against128 transitions
and2ms. CPU key removal and GPU freed-range insertion avoid whole-list sorting/scanning in
that idle path. Existing non-idle GPU compaction/free-list reconstruction and synchronous
lifecycle/stale CPU cleanup are separate work and inherit no idle-time performance pass.
Exact payload accounting includes pending, retiring and borrowed-retired ownership. Host
metadata is explicitly an estimate: CPU256B/entry +96B/page or borrow record +8B/retiring array
slot +384B owner state; GPU160B/allocation +128B/slab +48B/free range +256B owner state;
the old-generation record adds192B. These conservative formulas are not portable measured
JavaScript object sizes; target-browser heap/high-water verification remains required.

SEC boundary rationale: this refinement adds host lifetime/accounting and bounded cache-policy
metadata only. Existing generated Rust authority, page-size validation, immutable worker copies,
source/coverage/placement queries, session fencing and production fixture exclusion remain.
There is no new ABI, input trust source, persistence, transport or GPU target. Independent source
review and existing adversarial/fatal browser lanes remain required before acceptance.

MIG-QUERY-01/02 (`query.fixture.spec.ts`) are generated browser-boundary E2E under
CT-06, INV-01/04/08/09/11 and MIG-E05/E06. Only frame placement and frame preparation
coverage use the bounded read-query boundary: positively cancelled input followed by
successful, stale and malformed-JS queries preserves `activeCancelled` until an ordinary
command (including typed rejection) or State read resets it. Assert before State reads.
One-live-wrapper refusal and one-use matrix copying remain unchanged. The fixture verifies
incomplete/clipped-outside/retired/wrong-authority proofs, stale pages/frames, source/history
and fresh ordinary resource accounting; existing GPU numerics and fatal getter/destructor
lanes retain numerical/terminal coverage. No allocation-failure or performance pass is
inferred from these boundary cases. Freeze and compare the same workload separately.

The implementation writer owns these actual-route tests under `apps/web/tests/memory`;
CT-02/03/06/07/08, INV-01–05/08 and SU-03/04/13/14/16/20 apply. Observation files run only
against a separately identified `performance-e2e` build. Their hooks are excluded from production.
Record exact build and actual outcomes in the task; this mapping alone is not a pass record.

| Case / source | Concrete trigger and expected invariant |
| --- | --- |
| MIG-WORKER-11 / promotion.observation.spec.ts and scheduling.observation.spec.ts | End→pan before promotion preserves exact Rust-issued receipt identity; forty completed strokes → warmed Undo/Redo preserves ordered exact pixels with bounded32-command/1MiB ready queue, up to256 commands per2ms submission slice; observe successful refill beyond32 without claiming timing acceptance |
| MIG-WORKER-12 / prefetch.observation.spec.ts | Same-view Back/Resume clears disposable warmth; at least two confirmed delayed worker starts in the new session → Back before results → Resume: worker terminated, no late resurrection, exact source and Undo retained |
| MIG-WORKER-13 / traversal.observation.spec.ts; visibility.fixture.spec.ts |65,537 expected source samples using generated actual-handler setup → wholly offscreen warm frame: positive certified visibility query, zero preparation, exact current acknowledgement, blank/restored pixels and Undo/Redo equivalence. Separate explicitly evicted-index boundary fixture runs the real host producer, observes incomplete cold progress across actual task turns before GPU validation, bounds each query to512 visits/four hulls, then validates/acknowledges blank pixels. Synthetic setup and cache-eviction replay are not physical input or timing evidence |
| MIG-WORKER-14 / pan-fidelity.observation.spec.ts | Settled committed receipt → integer pan → positively validated sealed candidate without global acknowledgement → End with exact current receipt: compare exact shifted interior pixels across transformed (possibly already sealed), sealed and ended states |
| MIG-WORKER-15 / cancellation.observation.spec.ts | Confirmed withheld real worker reply → Undo → matching current receipt acknowledgement within500ms; joined candidate has zero queue/job/copy charges; deliver obsolete reply, then fresh rebranch/Undo/Redo and repeat without resurrecting artwork |
| MIG-WORKER-16 / pending-fatal.fixture.spec.ts | Confirmed pending candidate → real metrics trap or explicitly injected command/getter/destructor exception → immediate worker teardown, Back, late reply, forced GC and Resume: no subsequent canonical-editor export, fatal tombstone retained; positive export/call controls prevent vacuous proof |
| MIG-WORKER-17 / control-work.observation.spec.ts | Begin/End positively change toolbar availability; unchanged accepted append batches issue zero toolbar mutations. Paired phase records preserve request/source identity and monotonic acquisition/Rust-return/state/control/contact times; these measure the batch body or command wrapper, not whole browser dispatch or physical latency |
| MIG-WORKER-18 / shared-pages.observation.spec.ts and shared-coverage.observation.spec.ts | Completed secondary chunks reuse prepared page IDs through warm Undo/Redo with a positive validated completed-frame increase with zero new canonical jobs/worker pages/fallback pages/uploads and exact pixels; broad clipped source → camera beyond retained coverage → Redo requires a positive coverage miss and fresh worker jobs/pages, then reset-view pixels agree. Active source remains on its exact path |
| MIG-WORKER-21 / history-display.observation.spec.ts | Hold the replacement's real worker reply after Undo of B from A+B; sample every submitted default-framebuffer display to retain unaffected A, draw fresh C immediately, then publish A+C and remove C with one Undo |
| MIG-WORKER-23 / history-display.observation.spec.ts | Held historical base follows Rust-certified pan and Escape without a current receipt acknowledgement or complete-overlay claim |
| MIG-WORKER-24 / history-display.observation.spec.ts | Cancel fresh C while history is held; repeated Undo/Redo and latest-target Undo, context loss/restore, late held replies and Back preserve exact completed history without C or B resurrection |
| MIG-WORKER-25 / cold-admission.observation.spec.ts | Same-view Back/Resume over8,193 source samples from bounded synthetic coalesced setup, with positive new-session/same-content identity: positively held first worker replies create no group-only batch; release one useful page, observe original-age admission without current ack, finish and compare exact same-camera pixels. Source setup is not physical pen evidence; forced reply hold is not latency acceptance |
| MIG-WORKER-26 / cold-admission.observation.spec.ts and MIG-WORKER-11 | Empty/small terminal and warmed history paths bypass cold timers; forty-source warm queue reaches capacity and bypasses coalescing, preserving exact pixels and existing queue/submission caps |
| MIG-WORKER-27–28 / cold-lifecycle.observation.spec.ts | Confirmed group-only or useful partial cold queue → Back/context loss: stop wakes the gate, timer/subscription bounds hold, cancelled receipt never publishes, recovery preserves exact source and one Undo |
| MIG-WORKER-29 / capacity-long.observation.spec.ts | Held completed candidate after A+B→UndoB;98,817 accepted actual-handler samples in fresh C exceed the former768-chunk boundary, stable progress and latest distinct ink are positive before release; exact settled/Undo/Redo crop, normal and packed. Generated coalesced setup is not physical pen or timing evidence |
| MIG-WORKER-30 / capacity-handoff.observation.spec.ts | Materialized C→End→D Begin/End→E Begin in one task before RAF: retain C, show E while candidate remains held, Escape removes E without C loss, ordered D reconstruction and exact Undo/Redo; normal and packed |
| MIG-WORKER-31 / capacity-pan.observation.spec.ts | Positively observed sealed candidate during cancellable pan has no ack; Escape restores exact raster. Accepted pan→active E→sealed-prefix consumption positively takes RGB copyback without changing E, then exact canonical End; normal and packed |
| MIG-WORKER-31 / capacity-sealed-end.observation.spec.ts | Positively sealed predecessor excludes C, then generated actual-handler Append/End occurs before the next RAF. Forced budget exhaustion retains C's old front without consume/ack; releasing it completes stable C with exact final/Redo and fresh D. Normal and packed; synthetic race/fault evidence, not latency |
| MIG-WORKER-32 / current-coverage.fixture.spec.ts | Generated typed boundary distinguishes Prefix/LiveSource/DisplayOnly; owner/session/mapping/source and permanent lifetime fences, both combined eight-slot allocation orders and parent-first cleanup. Optional tail exhaustion preserves canonical input and front pixels; slot release permits progress without new input. Injected pre-composite failure retains valid R/S; issued-composite failure discards them and rebuilds without replay. Boundary fixtures, not actual-input or timing evidence |
| MIG-WORKER-32 / capacity-successor.observation.spec.ts | Positively held successor N while predecessor R remains valid; trusted Undo invalidates only N and completes R within the existing 500ms bound without releasing N. Late reply cannot resurrect undone ink; fresh drawing and exact Undo/Redo remain usable. Normal and packed targets |
| MIG-WORKER-34 / visibility.observation.spec.ts | Actual-route ordered short strokes, warm offscreen hierarchy rejection with bounded query counters and no new hull construction; exact restored pixels and history, normal and packed |
| MIG-WORKER-35 / visibility-crossing.observation.spec.ts; visibility.fixture.spec.ts | Actual-route long thick crossing at5%/rotation with normal/packed targets and exact pan/Escape/Undo/Redo; labeled typed-boundary regional extremes, near-quarter-turn angles and varying pressure independently compare index retention against canonical preparation |
| MIG-WORKER-36 / visibility.fixture.spec.ts | Cold/warm ordered split-stroke traversal, simultaneous pinned cursors, optional-cache eviction and admission failure after emitted output preserve exact chunk order with no duplicates. Host/renderer RGBA fixture compares full exact RGB under mid-stroke pressure and positively full two-cursor fallback, asserts two source composites and preserved packed private alpha; actual derived capacity and host-copy cleanup are checked |
| MIG-WORKER-37 / visibility.fixture.spec.ts | Checked adjacent predecessor extension; two cursors/full-slot refusal, wrong owner/session/tuple/request rejection without hijack; current scene continues captured view, parent release/history/metrics permanently retire stale cursors, wrong receipt kinds rejected. Final nonempty reply retires cursor; individual duplicate array getters and one-live-wrapper guard reject without losing canonical source |

Indexed visibility changes MIG-WORKER-13's warm mechanism: an immutable cached parent can
reject the entire offscreen prefix without preparing every chunk. The previous≥512 culled
preparation assertion is therefore replaced, not weakened into an unobserved pass. The
original task-yield invariant remains in the explicitly cold host fixture, whose timer
observations must include multiple distinct partial hull counts before completed validation.
Visibility scenarios are authored acceptance mappings until a retained exact-build run passes;
query work counters do not establish frame latency or complete performance acceptance.
| MIG-CONTROL-01 / control-focus.spec.ts and MIG-LIVE-04 | Actual Tab/Shift+Tab leaves disabled idle history and held-recovery view controls; activation/value-changing keys remain blocked without queuing commands |
| MIG-LIVE-02 / pressure.observation.spec.ts |1/2/3/127/128/129 accepted pen points, normal and packed targets: exact live, completed and rebuilt pixels agree; trusted browser pen events do not certify physical Wacom |
| MIG-LIVE-03 / active-display.observation.spec.ts |493px width,5% zoom,−180° rotation and large DPR2 backing: every sampled submitted display retains previously visible accepted regions; positive visible-point/source-count controls and advancing front/stable generations during continuous input; readback is functional evidence only |
| MIG-LIVE-04 / retirement.observation.spec.ts | Hold unsignalled retiring GPU work → resize → trusted fresh Begin: no new target allocation or old-target deletion, no accepted stale-mapping input; view Reset remains disabled and a trusted click is not queued; release fences → current replacement, fresh Reset and input succeed, normal and packed |
| MIG-LIVE-05 / tail-handoff.observation.spec.ts | Positively observed incomplete back tail → EndC → immediate D → Escape, then pan/Escape and Undo/Redo: D cancellation preserves C, secondary scratch never clears C front, exact completed reconstruction; normal and packed |
| MIG-LIVE-06 / retirement-failure.observation.spec.ts | Render records work then throws, terminal fence creation fails: generation remains charged and polling stops; explicit Retry must create a successful completion fence before deletion/replacement, preserving completed artwork |
| MIG-LIVE-07 / tail-pan.observation.spec.ts | Bounded injected live-work budget exhaustion after exact frontN33 → appendN34/End → trusted pan/Escape before canonical promotion: fixed-anchor shifted/restored pixels, positive unfinished-source control and no complete/ack; release fault then exact settled/Redo parity, normal and packed. Functional fault evidence only, not natural multipage timing |
| MIG-LIVE-08 / tail-composite.fixture.spec.ts | Synthetic renderer-boundary RGBA groups in normal/packed targets: retained stable/front self-union, separate translucent D source-over at overlap, D removal preserves C, common pan/cancel alignment and exact canonical source-order pixels. No opacity UI or command-lifecycle claim |
| MIG-WORKER-04 / gpu-budget.spec.ts | Maximum8,388,608 backing pixels → resize → Back: normal13B/pixel targets≤104MiB or packed16B/pixel≤128MiB; geometry including256KiB stream reserve is capped by min(128MiB,192MiB−target payload), and retiring generations block replacement allocation; requested payload is not physical driver residency |
| MIG-WORKER-07 / worker-failure.spec.ts | Confirmed malformed worker reply during actual camera rebuild: reject geometry and preserve completed artwork/history |
| MIG-RECOVERY-02 / recovery.spec.ts | Persistent allocation error: exactly one automatic renderer retry and two attempts after explicit Retry; count renderer attempts separately from optional-format/RGBA allocation attempts, then prove restored source/history |

Scene-only source-prefix rejection must abort the candidate, terminate its exclusive worker and
join preparation retirement before rebuilding. Ordinary pan/append preserves a useful receipt.
MIG-WORKER-15 tests withheld actual replies separately from whole-view disposal.
Cold-history latency, secondary immediate geometry uploads, active-pan fidelity, spatial index,
delayed coarsening, contiguous draw batching and complete recency behavior require their own
successful evidence before M03 completion. A warm-refill functional pass does not close them.
The bounded observation snapshot includes copied aggregate cache-role/upload counters. Stroke-count
records reuse existing Rust query results, deduplicate at most256 identities, and carry no raw
coordinates. Nonzero ring drops invalidate pairing. Release assets exclude observation sinks,
phase/count strings and hooks; inspect the actual frozen entry chunk, not stale output siblings.
Cold admission observations aggregate one row per gate exit. A pure group marker waits without
a deadline timer until useful work, completion or cancellation; it never creates a fence solely
to meet a stale deadline. Partial useful work coalesces only while its producer is actually
pending. Full queues, producer task-budget exits and terminal/synchronous work bypass the delay.
The original queue age is not reset by replies. Timer/subscription counts describe the gate,
not physical GPU execution. Artificial held-reply age/overshoot is functional fault evidence.
Rotation at unchanged sufficient detail may remain warm. Cold lifecycle cases clear disposable caches through actual Back/Resume, hold replies before re-entry, and correlate the new session/content/mapping from overlay observations; this lifecycle identity is not an input-latency sample. They retain exact same-camera pixel assertions without introducing finer-detail parity differences.
Functional setup drains assert zero drops before consuming the bounded observation ring;
these drains do not change the separately frozen performance workload or its pacing.

Historical display uses only the existing validated base allocation and a separately named Rust
display transform. The generated-API `Run historical display boundary` fixture rejects wrong
owner/session/mapping, unknown/released receipts, changed metrics and departed sessions; strict
frame transforms, preparation and readiness still reject the obsolete content prefix. This is
synthetic browser boundary evidence, not an actual-route or native E2E claim.

View controls use the existing Rust `canBeginInk` value only because M03 view and ink admission share the same ready/display-usable/idle predicate. M06 layer eligibility must introduce a separate view capability before those predicates diverge. Suspension and mapping transitions synchronize this presentation before awaiting replacement; ordinary usable historical/rebuilding displays remain eligible. MIG-WORKER-07 retains exact reset pixels, and MIG-LIVE-04 proves held unavailable Reset is not queued.

Captured tails use a separate Rust display-only proof. `Run captured tail boundary` covers the
combined8 frame/tail receipt cap in both allocation orders, the fixed2 tail slots, pending-ticket
parent/sequence checks, append before captured terminal issuance, canonical adoption/coverage/
placement/cache rejection, fixed-anchor camera transforms, C End→D Cancel, permanent Undo/Redo
invalidation, released handles, empty completion and metrics invalidation. `Run live prefix
boundary` preserves the canonical128 stable limit and its pending-append proof at1/2/3/127/128/129.
These generated-API browser fixtures are boundary evidence; actual input and pixels remain the
MIG-LIVE cases above. A captured older tail may finish while input continues, but cannot acknowledge
current content. Front replacement is atomic only after all bounded ranges complete; candidate publication uses
validated canonical completed-prefix coverage. No source simplification or parity tolerance changed.

GPU retirement preserves its completion reservation if fence creation fails. Unknown completion
cannot release capacity; a terminal retirement error stops polling and retains its charge until
explicit retry or context loss proves safe retirement. A fully drained discarded frame clears old
GL errors but never advances the validated-output watermark. Normal source reports include the
fixed tail descriptors in Engine overhead and retiring GPU bytes until completion.

MIG-WORKER-22 acceptance remains open while the independent live-coverage checkpoint is reviewed.
The superseded immediate-page path reproduced latest-ink starvation at98,817 accepted samples
while history was held; retain that failure as the regression input. The candidate streams current
LiveSource geometry into independent stable/front/back masks and no longer replays a768-page
ActivePages cache. MIG-WORKER-29 positively checks stable progress beyond98,304 samples and a new
visible terminal segment before releasing the completed candidate. Forced holds establish
correctness only; natural progress, resource peaks, lifecycle faults and performance stay separate.

The isolated memory fixture lane requires fatal engine trap→Back/Resume without later engine
calls, finite complete GPU-contract traversal, and the independent f64 edge/taper expectations.
Fatal observation covers all canonical-editor exports, including generated getters/destructors.
A copy-failed wrapper stays strongly reachable for the terminal module lifetime to prevent its
FinalizationRegistry from calling poisoned Wasm; one outstanding wrapper bounds this retention.
Preparation-module and host/GPU cleanup remain independent. Injected JavaScript boundary faults
are labeled separately from the actual Rust trap; neither is production fault injection.
Read displayed color from the default read framebuffer: publication leaves an internal overlay
mask bound for subsequent work. Preserve all sample positions and coverage tolerances.
Centered page packing keeps each coordinate within the existing signed extent, collects at most
1024 capsules in48KiB fallibly allocated f64 scratch, then packs once into at most24KiB f32.
The scratch and output overlap during packing. Raw samples, per-capsule subdivision and the
quarter-pixel error budget are unchanged. `Run page joins` checks first/last endpoints and every
capsule/page transition with negative coordinates and positive/negative far regions; require a
nonempty multipage control. The1,000,000-page/30-second traversal bound remains unchanged.
These fixture checks do not establish indexed visibility or production latency acceptance.

Numerical boundary corpus includes min/max width/scale/zoom/DPR, far regions/crossings,
large radii/clipping and pressure extrema. Validate total painted-edge error, not only centerline.
Queue/resource tests include repeated Back/Resume, resize, context recovery, cache eviction,
source sharing and coherent streaming. Record actual capacities and peak overlapping generations.

Open the real isolated application for manual review after each usable stage, on a new strict
port; never replace existing preview servers. Designer and independent review use exact build
identity. PR records point to maintained guidance and summarize fresh evidence; generated reports
remain ignored. Only owner merges. M09 adoption requires honest combined evidence and gap report.

## Shared concrete edge sequences

All are high-priority planned browser E2E owned by the assigned leaf implementation writer;
rust_engine owns semantic expectations, designer visible/focus outcomes, independent reviewer
audits execution evidence. Each task reuses this table and adds feature-specific cases.

| Case | Starting state and ordered trigger | Expected visible result and preserved invariant | First leaf |
| --- | --- | --- | --- |
| MIG-X01 | Completed A; begin B → blur → late release → fresh C | B absent/no Undo; A retained; C accepted; INV02–04 | M02 |
| MIG-X02 | Stroke A worker pending → Undo → create B → old A result | A cannot return; B/history branch intact; INV01/08 | M03 |
| MIG-X03 | Geometry cache full → pan to unseen ink → draw new stroke | Complete streaming shows both; no silent omission/quota; INV08 | M02/M03 |
| MIG-X04 | Live Slice → context loss → late completion → Retry | Unfinished cut canceled; committed sources/history restored; no stale cut; INV04/08 | M08 |
| MIG-X05 | Draw/view generationN → resizeN+1 → old acknowledgementN | Old frame cannot markN+1 ready; completed drawing retained; INV01/08 | M02 |
| MIG-X06 | Existing Undo/Redo → fail append/commit reservation → cancel | No partial new operation; completed content/history preserved; INV03/04 | M02/M06 |
| MIG-X07 | Canvas selection plus focused composing text field → Escape/Undo | Field/IME owns action; no canvas cancellation/Undo; INV05 | M02/M07 |

Live Slice is synchronous semantics in M08; its late completion in MIG-X04 is a disposable
render/preparation result, not authorization of future background editing calculations.

## Retained feature and optimization coverage

This is a completeness checklist, not a pass record. Every row is pending implementation and
fresh Linefield validation until a task records its concrete build/tests. The complete source
manifest in docs/reuse-ledger.md identifies the reference; discarded experiments are excluded.

| Capability / details to retain | Task / scenarios |
| --- | --- |
| Initial/coincident dabs, actual coalesced input, last-pressure changed release position, single pointer, safe terminal capture ordering | M02 / E01–02 |
| Immutable256-sample blocks, raw pressure/style, stable sources/order/group IDs, redo ownership retirement | M02/M06 / E01–04 |
| Corner-aware Hermite, exact endpoints, pressure extrema, no raw simplification; stable source intervals | M02/M08 / E01/E08/E10 |
| Per-brush remembered widths, color/opacity capture including zero-alpha raw/history, pressure response chart/examples/live meter and fixed-width raw retention | M05 / E08 |
| Spacepan, heldR rotation, V/S tools, frozen down-mode, continuous rotation/Shift snap, pointerzoom, explicit resets | M02/M07/M08 / E03/UI04 |
| All layer commands, top-first order, last-layer protection, active hidden/locked guidance, stable rename focus, view-only selection without Undo | M06 / E09/UI05 |
| Lasso partial/whole, concave/self-crossing even-odd, toggle hit set, Lasso more, cache-independent offscreen completeness | M07 / E09/UI06 |
| Pick topmost tapered envelope, Shift toggle, empty clear, active-layer filter; exclude hidden/locked/packed-zero-opacity | M07 / E09 |
| Live group move; corner scale about opposite corner; center rotation/Shift snap; minimum40screenpixel frame; keyboard transform; protected recheck | M07 / E09/UI06 |
| Live Slice every accepted sample, width0–500, zero topology, active-layer filter, diameter/crosshair, original→final one-history transaction | M08 / E10/UI07 |
| Slice cubic-source intersection, tangencies/multiple crossings, zero singlepointnoop, positive width centerline removal; not pixel erasure | M08 / E10 |
| Fragment style/source/layer/order sharing; unchanged-transform siblings union; independently transformed siblings separate group at source paintposition | M08 / E07/E10 |
| Warm/white/none paper, independent notebook/dots at24worldunits with smallzoom fade/area treatment; theme-independent artwork | M05 / E08/UI09 |
| Paper-contact Hard/Soft, deposited-response interpolation/mips, fixed64worldunit grain, object transform resampling, width-derived loading limitation | M05 / E08 |
| MAX self-union then source-over independent groups; no layer-crossinggroups; pencil never treated as opaqueInk | M02/M05/M06/M08 / E07–10 |
| Field/IME shortcuts, blur/hidden/capture/resize/context cancellation; no active-tool autoswitch or autocommit | Every leaf / E02/X01/X04/X07 |
| Existing gallery/navigation/themes/en+uk and persistent session-only notice; BackResume content/history/view/settings/selection | Every leaf / E04/E11/UI01/UI09 |

| Retained performance mechanism | Task / verification |
| --- | --- |
|128-destination chunk neighborhoods/shared endpoints, visible-only preparation, actual capacity and changedtail-only rebuild | M02/M03 / E01/E06 |
|Power-of-two DPR-aware detail, immediate refine/delayed coarsen, useful finer alternative, ULP stablekeys | M03 / E06 and coldzoom |
|World chunk grid, rotated conservative queries, bounded oversized membership, painter-order restoration | M03 / E03/E06 |
|Shared GPU pages/sizeclasses/contiguous batching, deferred validation/fences, recency eviction/pressure compaction, allocation rather than usedbyte accounting | M02/M03 / E05/E06 |
|Broad overlap bounds plus chunk refinement, conservative budget-exhaustion split; layer/order/group safety | M04 / E07 |
|Viewport fallback with scissored clear/composite, whole-group ownership, complete reserved streaming | M02 / E05/E07/X03 |
|Sparse64pixeltiles, fine2segmentrouting,16spanhierarchy, endpointdisc/hullrejection, bounded highzoom selective intersection | M04 / E03/E07 |
|Frozen projector, shared endpoints, repeatedrect reuse, stamped integerlookup/stagedarrays/power2divisors, exactsigned16routes with rangefallback | M04 / E07 plus CPUplanning/memory |
|Dirty256pixelregions, exactintegerpan copy, compatible exactresolution documenttiles; invalidation on fractionalpan/zoom/rotation/content | M04 / E03/E07 |
|Frontmostvisiblelayer translucent/pencil activeoverlay; middlelayer/opaqueInk uses safeorderedpath | M04/M05/M06 / E07–09 |
|Geometry-only worker with copied bounded inputs, queue caps, stale fencing/watchdog, active synchronous path | M03 / E06/X02 |
|Layer appearance versus metadata invalidation; rename/select/lock need not invalidate pixels | M06 / E09 |
|Versioned prebuilt material response and rebuild-on-contextrestore; no synchronous firststroke bake | M05 / E05/E08 and coldreadiness |

M04 unchanged-view prefix seed follows [the adopted first-slice contract](../../docs/interfaces/web-prefix-reuse.md).
Pan lattice, sparse routes, region reconstruction and archives remain separate later stages.

| Scenario / authored case | Required positive/negative evidence |
| --- | --- |
| MIG-TILE-02 / prefix-seed.observation.spec.ts | Actual idle End→settle before next Begin→Escape and separate End→next Begin without ack wait→Escape, positive copy/completion/skipped-prefix counters, fewer producer commands than independent view rebuild, exact pixels and Undo/Redo in normal/packed formats |
| MIG-TILE-02 / prefix-seed.fixture.spec.ts query/render/invisible/same/multiple | Generated engine and real worker/GL path; exact full-rebuild RGB parity and fewer instanced draws; empty-prefix proof, invisible successor still waits for copy-covering validation; equal/multiple-prefix misses |
| MIG-TILE-05 / prefix-seed.fixture.spec.ts capacity/render/invisible | Seven occupied receipts reserve the ordinary eighth fold before optional target; borrowed predecessor survives base replacement through cursor cleanup; held fence prevents false readiness |
| MIG-TILE-05/06 / prefix-seed.fixture.spec.ts publication-promote/fold/create/create-release | Actual completed candidate promotion and issued ordinary fold; prior release or incoming-owner creation failure cannot publish; both receipts remain charged or incoming release is acknowledged once; repeated cleanup and generated-boundary poison exclude further exports and block replacement |
| MIG-TILE-06 / prefix-seed.fixture.spec.ts query/before/after/draw/release | Checked identities, activeCancelled latch and one snapshot; actual copy/draw phase faults never promote B as ready S; full reconstruction recovers; failed receipt acknowledgement retains charged uncertainty and blocks replacement |

These new cases are authored and initially unrun. Fixture integration is not actual-route E2E;
each attaches actual browser version and result. Existing M03 sealed/busy, context/Back/resize,
packed live-mask, cleanup and worker-failure lanes remain required regressions. Fixed host lease
metadata and retiring uncertainty are reported; three GL programs are counted separately from
opaque driver storage. No additional texture/fence/receipt allowance or performance pass follows.
Exact reviewed DIAG integration, fresh source review and frozen-build functional evidence precede PR.

GPU wake experiment acceptance (CT-06; existing MIG-WORKER-05/15/16/24/27/28):

| Scenario / authored case | Required behavior and evidence limit |
| --- | --- |
| MIG-GPU-WAKE-01 / gpu-wake.fixture.spec.ts slots, reservation | Actual canonical source, worker preparation and GL rendering; simultaneous consumers share one 4→8→16→32ms task, two-reader cap and reserved slot retain all-reader validation, actual drain resets backoff; exact pixel parity and zero idle tasks |
| MIG-GPU-WAKE-02 / gpu-wake.fixture.spec.ts lifecycle | Controlled hide-before-fire and stale callbacks, repeated show, dormant owner abort and replacement identity; real CPU geometry held after GPU drain has no awaited wake tasks, then replacement renders visibly |
| MIG-GPU-WAKE-03 / gpu-wake.fixture.spec.ts deadline | Controlled clock keeps observations below the existing one-second gap rebase; short hidden interval excluded while 10s of visible no-progress still fails without deleting uncertain readers |

These new cases are authored controlled browser/render-boundary integration, initially unrun;
they are not native background-tab timing or performance acceptance. Each attaches actual
browser version/platform and fixture results. Listener disposal is source-reviewed, not
directly counted by these fixtures. Existing actual-route cancellation, Back/Resume,
worker failure, retirement, context-loss, normal/packed parity and reduced-motion lanes
remain required; these boundary cases do not replace them. Production hook exclusion and
matched same-host timing against32d00e6 remain separate build/evidence gates.

Substitution is allowed only with equal observable behavior and documented measured rationale.
A mechanism omitted because its evidence is unfinished remains pending, not silently adopted.
Current limitations: no persistence, per-layer opacity/groups/masks, arbitrary nonuniform
transforms, text/shapes/images, physical paper wear/tilt simulation or post-M09 worker changes.
