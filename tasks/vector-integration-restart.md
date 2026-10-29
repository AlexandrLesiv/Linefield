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
