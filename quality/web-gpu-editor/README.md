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
