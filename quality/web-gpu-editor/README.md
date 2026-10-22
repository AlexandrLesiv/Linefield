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

The implementation writer owns these actual-route tests under `apps/web/tests/memory`;
CT-02/03/06/07/08, INV-01–05/08 and SU-03/04/13/14/16/20 apply. Observation files run only
against a separately identified `performance-e2e` build. Their hooks are excluded from production.
Record exact build and actual outcomes in the task; this mapping alone is not a pass record.

| Case / source | Concrete trigger and expected invariant |
| --- | --- |
| MIG-WORKER-11 / promotion.observation.spec.ts and scheduling.observation.spec.ts | End→pan before promotion preserves exact Rust-issued receipt identity; forty completed strokes → warmed Undo/Redo preserves ordered exact pixels with bounded32-command/1MiB ready queue, up to256 commands per2ms submission slice; observe successful refill beyond32 without claiming timing acceptance |
| MIG-WORKER-12 / prefetch.observation.spec.ts | At least two confirmed delayed worker starts during frame rebuild → Back before results → Resume: worker terminated, no late resurrection, exact source and Undo retained |
| MIG-WORKER-13 / traversal.observation.spec.ts |65,537 expected source samples using synthetic coalesced stress setup → wholly offscreen frame: observe≥512 culled Rust preparation queries across actual task turns, then exact acknowledgement and recoverable history; synthetic setup is not physical input evidence |
| MIG-WORKER-14 / pan-fidelity.observation.spec.ts | Settled committed receipt → integer pan while geometry worker starts are held → same-camera rebuilt receipt → release: compare exact shifted interior pixels across provisional/accurate/ended states |
| MIG-LIVE-02 / pressure.observation.spec.ts |127/128/129 accepted pen points across chunk boundary: live, completed and rebuilt pixels agree; trusted browser pen events do not certify physical Wacom |
| MIG-WORKER-04 / gpu-budget.spec.ts | Maximum8,388,608 backing pixels, optional and packed formats → resize → Back: mandatory target payload≤64MiB and released owned targets; requested payload is not physical driver residency |
| MIG-WORKER-07 / worker-failure.spec.ts | Confirmed malformed worker reply during actual camera rebuild: reject geometry and preserve completed artwork/history |
| MIG-RECOVERY-02 / recovery.spec.ts | Persistent allocation error: exactly one automatic renderer retry and two attempts after explicit Retry; count renderer attempts separately from optional-format/RGBA allocation attempts, then prove restored source/history |

Current known limits remain explicit: scene-only Undo during a truly stalled worker may retain
the candidate until the bounded worker watchdog; whole-view disposal is a separate case.
Cold-history latency, secondary immediate geometry uploads, active-pan fidelity, spatial index,
delayed coarsening, contiguous draw batching and complete recency behavior require their own
successful evidence before M03 completion. A warm-refill functional pass does not close them.

The isolated memory fixture lane currently has four unresolved failures: fatal engine trap
followed by Back leaves the drawing surface mounted; GPU contract traversal reaches its
1,000,000-page bound; GPU edge error is0.8001525320174778; taper coverage differs by1 at the
first sampled boundary. Boundary matrix, terminal reserve, numerical checks, resource lifetimes,
bounded calibration and cleanup pass in that run. This is not a numerical/recovery lane pass.
Before assigning fixture drift or runtime regression, trace fatal teardown completion, inspect
the repeated page cursor and compare each failed coverage sample with its renderer state and
reference expectation. Preserve the failing inputs and bounds; do not loosen tolerances.

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

Substitution is allowed only with equal observable behavior and documented measured rationale.
A mechanism omitted because its evidence is unfinished remains pending, not silently adopted.
Current limitations: no persistence, per-layer opacity/groups/masks, arbitrary nonuniform
transforms, text/shapes/images, physical paper wear/tilt simulation or post-M09 worker changes.
