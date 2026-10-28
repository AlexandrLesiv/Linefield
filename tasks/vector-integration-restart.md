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
