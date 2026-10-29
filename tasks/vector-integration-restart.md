# Approved vector editor integration restart

Owner direction 2026-10-29 supersedes the discarded M01–M09 migration and its derived renderer contracts. PR17–20 are closed. The restart reverts merged PR16 on its own branch; main and unrelated dirty work remain untouched. The resulting tree before new work matches pre-migration 3eaaff8 exactly.

Reference: complete handoff source-app, manifest 474873d88d00f498105fc2fbb8eed754cc01ba93f6a3f9bcde7dfd78a853ca1d, all77 files verified. Do not substitute vector-canvas-lab HEAD. Preserve the approved rendering lifecycle, analytic AA, paper material, blending, retained geometry, sparse coverage and caches. Do not introduce the discarded viewport-bitmap/staged-frame navigation strategy.

Execution order:
1. Establish a separately built, unmodified reference baseline and reproducible workloads. Preserve any existing preview/session. Record source identity and current measurements; inherited donor results are provenance only.
2. Integrate the complete editor with Linefield gallery/session, themes, localization and controls. Rust owns raw samples, editing, history and authoritative geometry; preserve regional coordinate precision. Adapt boundaries and module ownership incrementally, comparing each adaptation to the baseline. Do not redesign rendering to satisfy an incidental abstraction.
3. Verify all LFV01–18 feature and rendering acceptance, especially visible coverage during rapid zoom/rotation/pan, with both pencils, layers, selection and live Slice. Compare raw data and image parity as well as timing.
4. Independently evaluate material worker/prebuilt asset, extended geometry preparation, visibility/overlap/tile planning, lasso/Slice calculations and OffscreenCanvas rendering. Establish a baseline before each variant. Keep queues bounded, reject stale jobs and retain synchronous recovery. Adopt only measured useful variants that preserve correctness; remove rejected shipping paths.
5. Repeat combined acceptance, open a separate interactive preview, update the handoff with adopted/rejected/blocked decisions and measured conditions. No merge without owner action.

Measurements: cold/warm, sparse/dense opaque/translucent Ink/Hard/Soft, Retina rapid zoom and continuous rotation, pending-job edits, all layer/edit tools. Report median/tail frame times, correct-image delay, input responsiveness, main-thread stalls, worker turnaround, reliable GPU timings, memory and transfers. Never exchange quality, accepted input or blending for speed. No claim that moving CPU work speeds up the GPU.

Retired work snapshots are local ignored recovery material, not integration dependencies. Prior checks and performance outcomes do not certify this restart. The earlier AGENTS instructions were revoked by the owner; direct current instructions and actual repository constraints govern.

## 2026-10-29 route-level checkpoint

The complete approved donor renderer and Rust core now build from source under apps/vector-editor and are hosted as a persistent same-origin embedded editor from the Linefield temporary drawing route. Preview: http://127.0.0.1:65281/ (New drawing). Reference remains on 65280. Back/Resume retains the same editor instance. This is an intermediate manual comparison surface, not completed architectural integration or adoption.

Full production build and both TypeScript checks passed. Initial browser smoke verified three brush commits, Back/Resume retaining document/camera and no uncaught errors. Current checks are in apps/web/tests/vector-integration-smoke.mjs; evidence is local .build-cache/restart. No performance parity claim yet.

Remaining: replace the isolation boundary with the final host adapter; map shared authoritative editing/geometry and regional precision without changing rendering behavior; localized/themed Linefield controls; complete feature/image/performance comparison; independently evaluate the five worker variants. Donor f32 coordinates and its diagnostic global are not final shipping contracts. No new worker experiment adopted.

## 2026-10-29 checked boundary checkpoint

Generated the 66 scalar browser ABI signatures from the existing Rust exports, with a build-time stale-generation check. Main and derived-geometry worker now share one loader that verifies memory, exported functions and argument counts once during startup; hot editing/rendering calls remain direct. Incompatible modules report a visible startup error without preventing return to the gallery. This checks export shape, not argument ranges, buffer ownership or regional coordinate semantics; those remain required. No renderer/shader/cache/geometry algorithms changed.

The rebuilt Wasm SHA-256 remains efdc8c44a74e2bf43ea5064f8fc0df6cdbeedda7656c78055282d584e81862ea, identical to 65281. New isolated preview is 65282; 65280 and 65281 remain untouched. Build/type checks and browser brush/pan/history/retention checks run against 65282. Failure-path coverage uses a valid incompatible Wasm module. This is still intermediate architecture, not M01–M09 completion or performance adoption.

## 2026-10-29 reference acceptance checkpoint

Added reproducible actual-browser reference comparison and adapted the three approved handoff browser fixtures (formatting and one unused assignment only). Against isolated 65282 at DPR 2 / 1440×1000 outer viewport, the approved 22 pencil behavior, 8 pencil rendering/recovery and 30 editing checks for each of Ink/Hard/Soft passed: 120 checks total. These cover paper grain, minified continuity, raw pressure, context recovery, live Slice, fragment movement, protected layers and renderer/cache parity. This is not all LFV01–18 acceptance and is not a hardware latency result.

The new reference comparison passed exact canvas PNG hashes and raw sample/camera equality for three overlapping translucent brushes, pan, zoom, Undo and Redo against untouched 65280, with matching 2880×1632 canvas backing stores. The first fractional-coordinate run failed because browser mouse injection into the iframe rounded 11 Soft Pencil input coordinates differently by about 0.00003; the failed evidence is retained in .build-cache/restart/parity. The comparison now uses integer CSS coordinates to deliver identical accepted inputs, not an image tolerance. Passing evidence: .build-cache/restart/parity-integer and approved-acceptance. No production renderer changes in this checkpoint.

Next: move the unchanged donor engine into shared crate ownership, maintaining its optimization profile and proving image/raw parity at each boundary adaptation; then regional coordinates/typed ownership and integrated localized controls. Full performance workload baselines and five separate worker experiments are still pending.

## 2026-10-29 shared engine relocation checkpoint

Moved the complete unchanged Rust implementation from the web application directory into the workspace crate crates/vector-engine (`linefield-vector-engine`, library `vector_core`). All six Rust source modules remain byte-identical to the approved donor; inherited native test source moved with them but no Rust behavioral tests were run under the E2E-only policy. Both native and Wasm cargo checks pass. The workspace uses a dedicated vector-editor profile preserving donor optimization level 3/LTO, separate from the existing size-focused engine profile. The generated browser contract now reads the shared source.

Preview 65283 uses its own frozen build; previous previews remain untouched. Rebuilt Wasm hash is f2c0b7ea0ee3d29aaec9922f327fc30101b728c640eabe317e316093c79e203e (package/path/profile relocation changes the binary). Exact image/raw reference comparison and all 120 browser acceptance checks pass again. Both TypeScript checks, scoped lint and diff checks pass. Evidence: .build-cache/restart/shared-engine-parity and shared-engine-acceptance. No new performance claim.

This establishes shared crate location/build ownership, not final coordinate/ownership semantics. Regional precision and checked arguments/buffers remain pending, as do replacing the temporary embedded UI, localized/themed controls, performance baselines and the five worker experiments. The inherited native adapter mentions a header absent from the donor handoff; it is not a completed native integration contract.

## 2026-10-29 bounded performance baseline

Added a reproducible browser benchmark comparing untouched reference 65280 with shared-engine preview 65283, alternating order across three repeats each. Apple M2 Pro / 12 logical CPUs / 16 GiB, macOS Darwin 27, Chrome 156.0.8078.48 headless, ANGLE Metal, DPR 2, matching 2880×1632 backing stores. The workload uses 24 mixed opaque/translucent Ink/Hard/Soft strokes and 3,096 accepted raw samples, continuous pan, 5–1600% zoom changes, continuous rotation and Undo/Redo. Raw data survives the camera/history phases; no uncaught errors. Existing previews and production source unchanged.

Median across three runs of per-phase CPU rendering median / p95 (milliseconds):

| Phase | Reference | Integrated |
| --- | --- | --- |
| Mixed drawing | 0.6 / 2.8 | 0.8 / 3.3 |
| Continuous pan | 0.6 / 1.3 | 0.4 / 0.9 |
| Rapid zoom | 2.1 / 7.4 | 2.2 / 7.3 |
| Continuous rotation | 0.9 / 1.2 | 1.0 / 1.4 |
| History (two render samples/run only) | 1.6 / 1.6 | 1.5 / 1.5 |

Observed rAF cadence was approximately 16.7 ms; no long tasks were observed during these phases. This small workload establishes a baseline, not statistical equivalence or large-document acceptance. Integrated readiness was 927.3 ms versus 273.8 ms for standalone: the integrated measurement includes gallery navigation, click and shell transition and must not be attributed to engine loading. Wasm memory was 1,245,184 bytes on both sides; full cache/material counters are retained in the evidence.

Evidence: .build-cache/restart/performance-baseline/results.json and performance-baseline.log. Historical evidence field `correctImageWaitMs` actually measured renderPending settlement, NOT correctness/readback/display; the runner now names it `renderSettledWaitMs` to prevent overclaiming. The zoom proxy was approximately 164 ms on both sides while rAF remained responsive. Physical mouse/Wacom latency, actual displayed-correct-image time, sparse/large dense workloads, GPU duration and worker transfer/turnaround remain unmeasured. GPU queries were disabled. No optimization decision is justified solely by these figures.

## 2026-10-29 derived-buffer ownership checkpoint

The existing geometry worker now gets scratch/input and output float capacities from two generated Rust exports instead of duplicated browser numeric limits. The transport validates request identity, input array type/capacity, finite nonnegative tolerance and bounded output before copying/transferring; unknown response IDs retire the worker through the existing fallback. Raw document data stays in the main owning Rust engine. No new worker feature, scheduling change or rendering optimization was introduced. Ownership and scratch lifetime are documented in crates/vector-engine/README.md.

New isolated preview: 65284. Older previews untouched. Browser fault injection into the actual geometry worker proves malformed input triggers worker retirement and usable synchronous drawing/Undo/Redo. Exact reference pixels/raw samples and all 120 approved browser checks pass on the new preview. Native cargo check, Wasm build, generated-boundary check, TypeScript and scoped lint pass. Evidence: .build-cache/restart/owned-buffers-parity and owned-buffers-acceptance.

This closes only the derived-geometry message bounds/ownership subsection. Other command argument contracts, regional numerical semantics, integrated localized UI and the full performance matrix remain pending. No new worker experiment is considered adopted.

## 2026-10-29 host theme checkpoint

The integrated editor controls now consume Linefield shared semantic theme tokens, including live OS light/dark changes and visible keyboard focus. Artwork colors, paper materials, rendering/caching, camera and history are untouched. This adapts control colors only; the donor layout and English labels remain temporary, and localization/final Linefield controls are still pending. Preview 65285 is separate; all earlier preview builds remain frozen.

Theme E2E checks verify token equality with the parent gallery, live mode changes, unchanged raw data/view/backing dimensions and usable Undo. Visual review caught low-contrast background selectors in dark mode; their selector specificity was fixed and the theme check repeated. Screenshots: .build-cache/restart/theme-dark.png and theme-light.png. TypeScript/build/scoped lint pass. All 120 approved browser checks pass on the themed integration.

Reference parity now hashes actual WebGL RGBA readback, while retaining PNG screenshots for diagnostics. Previously canvas element screenshots included host controls layered above it, which cannot serve as artwork parity once controls are adapted. No drawing pixels are masked and no tolerance is added: exact RGBA hashes and raw samples pass across the bounded brush/pan/zoom/history workload. Readback is confined to the test runner, never production rendering. Evidence: .build-cache/restart/theme-parity and theme-acceptance.

## 2026-10-29 localization first batch

Added 50 English/Ukrainian semantic messages through the existing shared localization generator, not a separate engine catalogue. Primary drawing tools, brush/material choices, paper/grid choices, width/color/opacity labels, no-save disclosure, layer actions and dynamic layer/selection/Slice/pressure feedback now use the host formatter with typed arguments. Locale choice and document language match the gallery. User layer names and canonical engine state are not translated or rewritten. Build now generates resources before the vector host typecheck.

Separate preview: 65286. E2E checks pass for both en-US and uk-UA: translated labels, document language, drawing, layer hide and Undo. Visual inspection confirms usable Ukrainian primary controls. Exact artwork readback/raw reference comparison and all 120 approved browser checks pass. Shared catalogue generation/check, both host TypeScript checks and scoped lint pass. Existing shadowed locals in two touched donor modules were renamed without changing expressions. Evidence: .build-cache/restart/locale-parity, locale-acceptance and locale-uk-UA.png.

Localization is NOT complete: static panel explanations, tooltips/accessibility descriptions, navigation help, default engine-generated layer names and diagnostics remain English. These must be handled before claiming complete localization. Final UI adaptation, regional coordinate semantics and the five worker experiments remain pending.

## 2026-10-29 localized panels and accessibility

Added 39 shared English/Ukrainian messages for pressure explanation/chart labels, layer headings/help, selection/Slice options, tooltips, accessible labels and navigation gestures. The integrated editor identifies itself as Linefield. Binding changes only copy and attributes; input listeners, geometry, rendering and history remain unchanged. New preview 65287 is isolated from earlier builds.

Both language browser paths pass, including pressure-panel explanations and accessible selection labels. Exact artwork-buffer/raw reference parity and all 120 approved browser checks pass. Shared generation/check, TypeScript, scoped lint and diff checks pass. Evidence: .build-cache/restart/panel-parity and panel-acceptance.

Remaining copy is the developer metrics/failure detail and default engine-created layer names; existing/user-authored names must never be translated as if they were UI labels. The final host component layout, session architecture, regional coordinate authority and performance/worker work are still not complete.

## 2026-10-29 shared camera mapping checkpoint

Moved inverse view-to-document mapping, anchored zoom, anchored rotation and angle normalization into shared Rust f64 functions. The browser Camera is now a thin checked scratch-result adapter, recreating its borrowed view after Wasm memory growth. The donor's GPU bounding/projection helpers moved unchanged into ViewProjection; tile rendering uses that disposable projection without duplicating input mapping. The host still acquires local pointer coordinates and retains presentation state. This is not yet regional document storage: accepted stroke coordinates remain donor f32.

New frozen preview 65288. Native/Wasm build, generated 73-function boundary check, TypeScript and scoped lint pass. All 120 approved browser checks pass. The earlier brush/pan/zoom/history reference comparison remains pixel/raw exact. Added drawing after rotation to exercise inverse mapping: pixels and raw samples are exact, but the final camera translation differs from browser Math trig by about 1e-13 (Rust libm roundoff). The exact-state failure is retained in .build-cache/restart/camera-rotated-parity. The runner continues reporting exact state separately and checks camera values within four scaled f64 epsilon; raw data and image hashes remain strictly equal. No image tolerance or accepted-sample change was introduced.

Repeated bounded benchmark (three runs/side, same M2 Pro/Chrome/DPR2 setup) shows median-of-run CPU render median/p95: pan 0.6/1.3 ms on both; rotation 0.9/1.4 ms on both; zoom reference 2.3/8.0 versus integrated 2.3/7.4 ms. rAF p95 is 16.7–16.8 ms. This small workload shows no material camera-adapter regression, not proof for large documents or physical latency. Evidence: camera-acceptance, camera-performance, camera-parity and camera-rotated-roundoff under .build-cache/restart.

## 2026-10-29 startup retry and session lifecycle

Added localized Retry only when the owning engine fails to load, before input can create a drawing. An established session is never reloaded for a renderer/resource failure. The generic error listener now starts after successful engine loading so it cannot overwrite the startup Retry UI. Browser fault injection verifies an incompatible Wasm download, visible localized failure, successful Retry, drawing and return to gallery. Initial failure-path run caught the overwritten Retry message; it was fixed and rechecked.

Expanded actual-app lifecycle E2E coverage verifies retained layer state, raw samples, camera and same engine instance across Back/Resume; gallery shortcuts cannot mutate the hidden session; leaving mid-stroke cancels that gesture without polluting the retained history. These checks pass. Build, TypeScript, scoped lint and diff checks pass. No renderer/numerical changes in this checkpoint, so the previously passed full renderer/parity suites were not redundantly rerun. New isolated preview 65289; earlier previews unchanged.

Integration remains incomplete, especially regional coordinate precision and final component/session factoring. No worker research variant adopted.

## 2026-10-29 coordinate precision audit and next numerical work

Ran a browser-level audit through normal pan/zoom and pointer-event handlers, in separate fresh reference and integration documents. At 1600% zoom, 65 distinct intended X positions were drawn near four document origins. Both versions behaved identically:

| Document X origin | Distinct stored X values / 65 | Maximum screen-space error |
| --- | --- | --- |
| 0 | 65 | about 0 |
| 65,536 | 65 | about 0 |
| 1,048,576 | 33 | about 1 CSS px |
| 4,294,967,296 | 1 | about 264 CSS px |

This is a retained donor limitation, not a new regression or an acceptance pass. Rust camera f64 arithmetic alone does not repair the owning engine's f32 raw storage. The audit preserves expected versus actual coordinates and browser errors in .build-cache/restart/coordinate-audit/results.json. Do not hide this by restricting camera motion, changing quality thresholds or calling the integrated editor regionally precise. Current previews remain unchanged.

Required implementation sequence before regional acceptance:
1. Canonical samples, immutable source anchors and placements must use signed i64 region plus normalized finite f64 local coordinates (region size 65,536), with checked carry/borrow in Rust. Pressure remains independently preserved. Expose typed region/local values; never silently flatten full addresses into JavaScript numbers. Account for the increased canonical storage cost explicitly.
2. Derive bounded render coordinates relative to an explicit nearby origin in Rust, before f32 narrowing. Keep the donor's chunk/detail/cache/blending lifecycle. Include the origin in derived geometry/placement identity and reuse validity; carry actual source geometry through Slice and transforms without rewriting original samples. This cannot be implemented safely by only changing Point from f32 to f64.
3. Match viewport/camera and selection/Slice queries to the same relative origin and generation. Host code acquires screen input and renders provided projections; it must not become the regional arithmetic authority. Paper/grain origin must stay stable across rebase.
4. Run near-origin exact image checks, boundary-crossing/negative-address/overflow browser scenarios, far-origin continuity and roundtrip checks, and repeated performance/memory comparison before adopting. Do not silently narrow the approved prototype's 5–1600% view range to older schema defaults.

No storage migration or native application is introduced by this sequence. This numerical work is still pending, and the audit is deliberately not represented as a completed M01 gate.

## 2026-10-29 denser-document and sample-heavy baseline

Extended the browser comparison runner with bounded, recorded stroke/sample counts and an explicit assertion that every requested stroke and accepted sample reached the owning engine. Ran three alternating-order repeats per side against frozen reference 65280 and integration 65289. No application or preview changed. Environment remains M2 Pro / Chrome 156 / DPR 2 / 2880×1632 backing store, GPU duration queries off.

Two additional workloads: 256 overlapping mixed opaque/translucent strokes × 129 samples (33,024 accepted samples), and 24 mixed strokes × 4,097 samples (98,328 accepted samples). The latter increases sample density along the same shape; it is not evidence for a long geographically distributed stroke. Both include drawing, continuous pan, rapid 5–1600% zoom, continuous rotation and Undo/Redo. All twelve page runs completed without uncaught errors; camera/history preserved raw data and all requested samples were present.

Median across three repeats of per-run CPU render median / p95, in milliseconds:

| Workload / phase | Reference | Integrated |
| --- | --- | --- |
| 256 strokes: drawing | 2.6 / 4.1 | 2.5 / 4.0 |
| 256 strokes: pan | 1.9 / 3.0 | 2.0 / 2.8 |
| 256 strokes: zoom | 9.3 / 14.4 | 8.8 / 14.5 |
| 256 strokes: rotation | 4.4 / 5.5 | 4.3 / 5.0 |
| 256 strokes: history | 5.5 / 5.5 | 5.6 / 5.6 |
| 4,097 samples/stroke: drawing | 1.6 / 4.9 | 0.9 / 3.4 |
| 4,097 samples/stroke: pan | 0.8 / 1.7 | 0.8 / 1.7 |
| 4,097 samples/stroke: zoom | 8.2 / 11.5 | 8.1 / 11.1 |
| 4,097 samples/stroke: rotation | 2.8 / 3.2 | 2.7 / 3.6 |
| 4,097 samples/stroke: history | 3.2 / 3.2 | 3.1 / 3.1 |

Observed rAF p95 stayed at 16.7–16.8 ms; no phase long tasks were recorded. History contains only two render samples per run, not a meaningful tail distribution. Main owning Wasm memory was identical across sides: 1,966,080 bytes for the 256-stroke scene and 2,424,832 bytes for the sample-heavy scene. This excludes JS, worker, GPU and driver allocations; detailed material/cache counters remain in the results. Timings show no clear integration regression in these bounded scenes, not a claimed optimization or GPU speedup. The lower sample-heavy drawing time is not assigned to an architectural improvement.

Evidence: .build-cache/restart/performance-dense-256/results.json and performance-long-4097/results.json, with adjacent log files. Reproduce with LINEFIELD_STROKES=256, or LINEFIELD_STROKES=24 LINEFIELD_SAMPLES_PER_STROKE=4097, plus LINEFIELD_PREVIEW_URL and a fresh LINEFIELD_EVIDENCE_DIR. These timings do not prove displayed-image correctness or physical input latency; existing image-parity evidence covers its separate bounded workload. Sparse distant regions, broader large-document cases, displayed-correct-image timing and the five worker experiments remain pending. Regional coordinate authority and final host factoring remain implementation gaps.

## 2026-10-29 separated-region correctness and deployment identity

Expanded the exact-reference image runner to four separated groups of Ink/Hard/Soft strokes. It compares six positions while the pan pointer remains held, then 5%, 1600%, 10%, 400% and 100% zoom, rotated drawing and history: 18 artwork captures and 13 final strokes. On 65289, all artwork hashes and raw samples match the untouched reference exactly; camera differs only within the previously documented f64 roundoff allowance. This establishes coverage without requiring mouseup, not a frame-latency guarantee: captures deliberately wait for render settlement and instrument readback. The first attempt timed out on a precise zoom target because CDP narrows wheel deltas; its evidence remains in parity-separated-regions. The passing runner delivers identical f64 WheelEvents through normal application handlers, without relaxing image/raw comparisons. Evidence: parity-separated-wheel.

Added a generated scalar-ABI fingerprint shared by Rust and host/worker loaders. Export name/arity alone did not detect f32-to-f64 or other same-arity signature mismatches. The fingerprint includes original Rust signature types; eight words are compared once during loading. No hot input/render calls are wrapped, and no renderer algorithm or resource policy changes. This is shape/deployment checking, not authentication or complete semantic/argument validation.

Separate frozen preview 65290 is available and queued to open in Codex. Existing previews remain untouched. Native cargo check, Wasm/production builds, both TypeScript checks, generated-boundary checks and scoped lint pass. Browser fault injection verifies both missing exports and same-arity wrong fingerprints produce visible startup failure; Retry restores drawing and gallery navigation. Actual geometry-worker failure recovery also passes. The expanded separated-region comparison passes all 18 exact artwork hashes and raw sample equality on 65290; evidence is fingerprint-separated-parity. Regional precision, final host/session factoring and worker research remain incomplete.

## 2026-10-29 regional arithmetic foundation

Added fresh shared Rust one-axis address normalization and displacement arithmetic using signed-i64 regions and f64 local coordinates, region size 65,536. Checked i128 carry/borrow rejects overflow; invalid operations preserve the prior result. Large displacement is split before combining its local part, preserving representable local fractions that a flattened global f64 addition would erase. Generated ABI declarations now explicitly map i64 to BigInt and include those signatures in the deployment fingerprint. No old discarded renderer or contract code was reused.

Actual integrated-browser/Wasm checks cover 125 cases: positive/negative regions, both i64 extremes, region crossings, finite large displacement, nonfinite input, overflow and unchanged result on rejection. A JavaScript Number cannot substitute for an i64 argument. Drawing and Undo/Redo remain usable after those calls. The raw Wasm BigInt transport wraps out-of-range BigInts; the final host address type must validate that range before adoption. This is an explicit remaining boundary requirement, not a claimed check already implemented.

This is a foundation checkpoint only: input/document raw storage still uses donor f32, so the distant-coordinate audit remains failing by design until canonical samples, placements, camera, hit/Slice queries and origin-relative render data are migrated together. No distant-drawing fix, numerical acceptance or final architecture completion is claimed. The new functions are not on the drawing hot path; no performance gain is claimed. Native cargo check, Wasm/production build, generated boundary and scoped static checks pass. Evidence: regional-foundation/results.json. Separate frozen preview 65291 is running and queued in Codex; existing previews remain unchanged. Exact reference artwork/raw parity also passes across the existing brush/pan/rotated-drawing/zoom/history workload; evidence: regional-foundation-parity.

## 2026-10-29 checked regional host transport

Added a thin browser adapter around the regional foundation. It rejects signed-i64 overflow before Wasm can wrap a BigInt, rejects nonfinite transport values and immediately copies/freeze results. Normalization, carry/borrow and displacement remain in Rust; no full regional address is converted to a JavaScript Number. The adapter is exposed through the existing development diagnostics for actual-browser validation only and is not yet the drawing/document path.

The 125 Wasm cases plus additional host overflow/type/nonfinite and immutable-copy cases pass, with drawing/Undo/Redo still usable. Preview 65292 is an isolated frozen build; prior previews untouched. Both host typechecks and production build pass; native/Wasm source is unchanged since 8014f54. This closes the host transport gap identified at the foundation checkpoint, not canonical document adoption. Regional precision in drawing and all five worker variants remain incomplete.

Remote review preparation: fetched origin and verified main remains b101a7e (merged old documentation PR16). No restart PR existed. The restart branch retains its explicit revert of the scrapped contracts, then faithful source integration; it does not merge old implementation branches. A draft review is appropriate for this intermediate checkpoint, with incomplete architecture and worker work clearly called out.

Draft PR #21 is open: https://github.com/AlexandrLesiv/Linefield/pull/21. It explicitly lists remaining regional document adoption, temporary iframe host, incomplete final acceptance/review and unstarted worker research. All 120 approved browser checks also passed on application checkpoint 8b8940f / preview 65292 (22 pencil behavior, 8 rendering/recovery, 30 editing per brush). Evidence: draft-review-acceptance/results.json. This does not establish M1–M9 completion. No PR was merged.

## 2026-10-29 localized layer identity and persistent failure feedback

Closed the remaining default-layer-name localization gap without guessing from user text. Rust now owns a default-name marker in existing layer/history metadata. The browser formats generated labels in EN/UK; explicitly authored names stay verbatim even when they equal “Layer 1”. Unchanged rename forms issue no command. Undo/Redo restores the default/custom marker with the name. Existing layer blending, stroke data and rendering order are unchanged.

Runtime drawing failures now use localized feedback and remain visible across the status refresh timer; previously an uncaught engine message could be overwritten by ordinary metrics after 250 ms. The message preserves the current session and never reloads it. Low-level diagnostic detail and development counters can remain technical; full diagnostics/adoption work is not claimed complete.

New frozen preview 65294 is available; 65293 contains the intermediate layer-label change and all previous previews remain untouched. Renaming existing shadowed local bindings in the touched main module made its scoped lint pass without changing expressions; the resulting production bundle is byte-identical to the earlier 65294 build. Native/Wasm build, both TypeScript checks, generated boundaries/locales and scoped lint pass. Browser EN/UK checks cover unchanged rename history, authored names, Undo/Redo identity and persistent localized error feedback without replacing the document. The first test read the label before its scheduled refresh; it now waits for the actual label instead of assuming synchronous DOM refresh.

All 120 approved browser checks and exact artwork/raw parity pass on 65294. Evidence: localized-layer-names-final.log, localized-layer-names/, localized-layer-acceptance/ and localized-layer-parity/ under .build-cache/restart. Regional canonical adoption, final host factoring, broader final performance/review and all five worker experiments remain unfinished. This remains a draft integration checkpoint.

## 2026-10-29 final-window repository check

The full repository static command found strict TypeScript errors in the new ABI generator's unchecked regex captures. Added explicit capture/argument validation; generated declarations and fingerprint remain unchanged. `node scripts/check.ts` now passes all its configured catalogue, typecheck, lint, format and source-size checks. Evidence: final-static-check.log (failure retained) and final-static-check-2.log (pass). This command does not cover every imported vector module or certify final architecture. GitHub PR #21 is open/draft at the pushed application checkpoint and reports no configured remote checks.

Prepared `tasks/vector-integration-restart-handoff.md` with exact completed/pending scope, reproduction instructions and preview preservation requirements. The autonomous window still ends at 11:02:35 UTC; this record does not extend it or mark M1–M9 complete.

## 2026-10-29 renewed autonomy and regional canonical sample adoption

The owner renewed autonomous implementation and requested shorter continuation intervals. Reactivated the existing heartbeat every five minutes, with ongoing-writer coordination and no old deadline. No duplicate automation was created. PR21 stays draft and unmerged; all existing previews remain frozen.

Canonical sample storage now contains regional i64/f64 addresses for both axes and the unchanged f32 pressure representation. It is the owning Rust data, not a shadow copy. Browser drawing enters via f64 `push_precise` before f32 narrowing; explicit full-range regional input uses `push_regional` with checked host transport. Raw-coordinate consumers must use `raw_region`/`raw_local`; `raw_point` remains an explicitly lossy compatibility projection for the unchanged renderer and inherited fixtures. Rejected invalid input does not increment accepted counts or remove previously accepted samples, and leaves persistent failure feedback.

The actual browser audit now retains all 65 canonical positions at origins 0, 65,536, 1,048,576 and 4,294,967,296 with zero error against those bounded expected f64 inputs; Undo/Redo preserves them. An explicit full-range browser/Wasm case preserves fractional locals at regions 4,611,686,018,427,387,921 and −2,305,843,009,213,693,943 through history without flattening to JS numbers. These are storage/input checks: rendered geometry still uses the old f32 projection and the distant visual problem remains. Camera/placement/query/render origin adoption is the next required implementation, not an optional improvement.

Storage cost is explicit: 40 bytes/sample versus donor 12, plus existing block-capacity and allocator overhead. A three-repeat 256-stroke benchmark measured owning Wasm memory 3,801,088 bytes integrated versus 1,966,080 reference. CPU render median/p95 (median across repeats) was reference/integrated: drawing 2.5/3.9 vs 2.3/4.0 ms; pan 1.7/2.7 vs 1.5/2.2; zoom 9.0/13.6 vs 8.4/12.7; rotation 4.3/5.2 vs 4.0/5.0. rAF p95 stayed 16.7–16.8 ms and no phase long tasks were observed. No speedup or full performance acceptance is claimed. Measurement was on the same storage/rendering code before the final invalid-input feedback guard; GPU/JS/worker totals and physical latency are not those Wasm figures.

Preview 65297 is running separately and queued in Codex. All 120 approved browser checks, exact reference artwork/legacy-raw parity, canonical history/input checks and 125 regional primitive cases pass on the final preview. Existing native test source was adjusted to compare full canonical bit patterns and compile-checked only; no native behavioral tests were run. Native/Wasm builds, generated ABI, both host typechecks, scoped lint and the full repository static command pass. Evidence: canonical-final-audit, canonical-final-full-range, canonical-final-parity, canonical-final-acceptance, canonical-dense-performance and canonical-final-static.log under .build-cache/restart.

Next slice must preserve this canonical data while replacing flattening in source/chunk geometry and placement/view queries. Prefer stable source/chunk anchors with bounded relative projections and explicit revision/origin identity; do not reintroduce viewport bitmap staging or per-frame whole-document copying. Validate original-origin parity, boundary/negative/far-origin continuity, pending-worker rebases, Slice/transforms/history and performance before final adoption. Host factoring and independent/design review remain unfinished; none of the five worker experiments has started.

## 2026-10-29 source-relative geometry checkpoint

Each source stroke now freezes a regional source anchor at its first accepted point. Shared Rust subtracts that anchor before narrowing derived source geometry to f32. The existing near-origin reference arithmetic is retained; distant sources use their regional origin. Canonical addresses are never rewritten, Slice fragments retain the same anchor and shared raw blocks, and geometry-worker snapshots use the same source-relative coordinates. Placement compensates for the anchor through the existing transform path; its compatibility f64 representation is still transitional. The existing movement bound is applied relative to the source anchor rather than accidentally rejecting every distant stroke.

This advances the actual geometry path: all 65 source positions remain distinct in the distant browser audit, and direct geometry exactly matches the derived worker snapshot renderer. It is not the final distant-render fix: host transformed-capsule uploads still narrow world positions to f32, camera/placement/query transport is not fully regional, and very long strokes can exceed a single source anchor's useful local range. Per-chunk/view-relative projection and placement migration remain required. Do not mark those done or remove the outstanding numerical checks.

New frozen preview 65298 is running and queued in Codex. Original artwork/legacy-raw parity and all 120 approved browser checks pass. Native test sources compile (not executed); production builds, generated boundary and full repository static checks pass. Browser/core movement-history checks at distant origins are recorded separately from physical input tests. Evidence: source-anchor-audit, source-anchor-edit-audit, source-anchor-parity, source-anchor-acceptance and source-anchor-static-final.log.

Three alternating repeats of the existing 256-stroke workload show CPU render median/p95 (reference vs integrated): drawing 2.5/4.3 vs 2.5/4.0 ms; pan 2.1/3.0 vs 2.0/2.6; zoom 9.1/14.5 vs 9.0/13.9; rotation 4.5/5.0 vs 4.4/5.6. This bounded comparison does not establish a speedup or far-coordinate GPU performance. Owning Wasm memory remains 3,801,088 integrated versus 1,966,080 reference; broader memory and physical latency limitations still apply. Evidence: source-anchor-performance.

## 2026-10-29 regional placement/history checkpoint

Stroke placement now stores a bounded displacement relative to its immutable regional source anchor instead of flattening the anchor into an absolute f64 offset. Translation and its gesture/history snapshots retain fractional moves at full i64-region addresses. Rust validates the whole selected group, including regional overflow, before changing any member. Slice fragments inherit the same anchor/displacement, preserving source identity and ordered blend grouping. New generated placement accessors expose i64 region and f64 local components; legacy transform accessors remain explicitly lossy compatibility projections for the current renderer.

Browser/Wasm checks verify fractional full-range movement, Undo/Redo, cancellation, unchanged canonical samples, and atomic rejection when one selected stroke would overflow the address range. The original 125 regional cases and ordinary pointer drawing/history also pass. All 120 approved checks and exact reference artwork/raw parity pass on frozen preview 65299. Native tests compile only; production builds, generated ABI and full repository static checks pass. Evidence: placement-regional-final, placement-coordinate-audit, placement-parity, placement-acceptance and placement-static-final.log under .build-cache/restart. This slice changes placement ownership, not renderer scheduling or GPU work; no new performance improvement is claimed.

Remaining: full-range rotation/resize needs a regional pivot boundary (the legacy pivot is still f64), and camera/query/GPU projections still need coupled origin adoption. Per-chunk geometry remains necessary for arbitrarily long strokes. Do not mistake precise movement/history for final distant visual correctness. Existing previews are unchanged; PR21 remains draft.

## 2026-10-29 regional rotation/resize boundary checkpoint

Added a generated Rust regional-pivot transform boundary and a checked thin host adapter. The pivot is subtracted from each stroke's regional anchor before local similarity composition; raw samples and gesture/history snapshots remain authoritative in Rust. Legacy flat-pivot calls retain their original calculation path, so current pointer selection behavior and rendering are unchanged. This is necessary boundary work, not completed regional screen integration: the current selection UI still supplies its legacy pivot until camera/query origins migrate together.

Twelve actual-application browser/Wasm cases compare scale/rotation at near, distant and full-i64-region origins, including repeated preview against the original gesture snapshot, Undo/Redo, cancellation, raw-data preservation and out-of-range host rejection. Exact reference artwork/raw comparisons and all 120 approved checks pass on frozen preview 65300. Native test sources compile only. Production build, generated ABI/host type checks and full repository static checks pass. Evidence: regional-pivot-editing, regional-pivot-parity, regional-pivot-acceptance and regional-pivot-static.log under .build-cache/restart. No GPU or input-latency improvement is claimed; the renderer has not changed.

Next work remains coupled camera, query and chunk/view-relative rendering adoption, followed by host factoring and final acceptance/review. The regional pivot boundary now exists but does not make legacy UI transport full-range. All existing previews stay frozen; PR21 remains draft and unmerged.

## 2026-10-29 shared screen-input admission checkpoint

Actual web drawing now passes viewport-local pointer samples directly to one Rust camera/admission operation. Rust performs inverse camera mapping and normalizes into canonical regional addresses before accepting the sample. Host code no longer allocates/transports an intermediate world-position pair for every drawing event. Changed release endpoints follow the same path with the last valid pressure; rejected input retains previous accepted samples and does not increment accepted counts. The scalar boundary accepts explicit i64 origin regions for subsequent camera integration. The current screen deliberately supplies origin zero until renderer, queries and cache identities can rebase together; it does not expose unsupported far-origin navigation.

27 actual-application/Wasm camera cases cover three regional origins, three zooms and three rotations, plus invalid camera/pressure rejection, region overflow and history retention. Actual pointer coordinate audits, exact reference artwork/raw comparisons and all 120 approved checks pass. Native tests compile only; production builds, generated ABI, host types and full repository static checks pass. New frozen preview 65301 is separate from every existing build. Evidence: regional-camera-admission, regional-camera-audit, regional-camera-parity, regional-camera-acceptance and regional-camera-input-static.log.

Three alternating 256-stroke comparisons on the same M2 Pro/Chrome 156/DPR2 environment measured CPU render median/p95 reference vs integrated: drawing 2.6/4.1 vs 2.5/4.0 ms; pan 1.9/2.7 vs 1.9/2.9; zoom 9.1/14.0 vs 8.2/8.7; rotation 4.6/5.5 vs 4.4/5.8. rAF p95 remained 16.7–16.8 ms. Input p95 is below this timer's reported resolution for drawing, so it cannot establish a latency improvement; no GPU speedup or final performance acceptance is claimed. Evidence: regional-camera-performance. Camera/query/GPU origin adoption and long-source chunk bounds remain unresolved, with the same explicit limitations as the preceding checkpoint.

## 2026-10-29 regional projection transport checkpoint

Rust now exports source-to-view similarity metadata relative to explicit regional origin axes. It subtracts integer regions before converting the difference to f64 and then adds the bounded placement displacement. The renderer's existing transform reader uses this boundary with origin zero, preserving its lifecycle and output. The checked host diagnostic adapter validates ids and BigInt ranges and returns an immutable copied projection. No camera-origin switching or cache rebasing has been enabled yet: those must use the same origin across input, culling, coverage, persistent tiles, paper/grid phase and GPU submission.

The browser editing fixture checks 36 neighboring-origin projections across near, distant and full-i64-region source anchors, alongside its 12 scale/rotation/history cases, immutable results and invalid transport rejection. Exact reference artwork/raw comparison and all 120 approved browser checks pass on separate frozen preview 65302. Native tests compile only; production build, generated boundary, type checks and full repository static checks pass. Evidence: regional-projection-editing, regional-projection-parity, regional-projection-acceptance and regional-projection-static.log.

Three alternating reference/integrated 256-stroke runs measured CPU render median/p95: drawing 2.2/4.1 vs 2.0/3.5 ms; pan 1.3/1.9 vs 1.4/1.9; zoom 7.9/16.2 vs 8.1/10.8; rotation 4.2/5.5 vs 3.9/4.9. This is bounded non-regression evidence, not a speedup claim; rendering algorithms are unchanged and run variance remains visible. Evidence: regional-projection-performance. The full-range visual defect is still unresolved until the screen actually adopts nonzero regional origins and bounded chunk projections. No final architecture or independent/design approval is claimed.
