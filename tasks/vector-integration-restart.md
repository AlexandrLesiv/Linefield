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
