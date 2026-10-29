# Restart integration handoff — 2026-10-29

This is an intermediate implementation, not completed M1–M9 adoption. Use the restarted branch only; do not revive the discarded migration branches, contracts or rendering pipeline.

## Where the work lives

- Worktree: `/Users/oleksandr/.codex/worktrees/vector-integration-restart/linefield`
- Branch: `codex/vector-integration-restart`
- Draft PR: https://github.com/AlexandrLesiv/Linefield/pull/21 — open, not merged.
- Verified remote main: `b101a7e`. The restart explicitly reverts the discarded PR16 documentation, then integrates the approved source.
- Current application: adaptive wide derived geometry plus regional view-origin checkpoint; inspect branch HEAD for the saved revision.
- Latest preview: http://127.0.0.1:65313/ — choose New drawing. Reference 65280, initial integration 65281 and all other existing previews remain unchanged.
- Authoritative reference: `/Users/oleksandr/Documents/Codex/2026-10-20/files-pasted-by-the-user-build/outputs/linefield-handoff/source-app/`, verified 77-file source set `474873d88d00f498105fc2fbb8eed754cc01ba93f6a3f9bcde7dfd78a853ca1d`. Do not substitute current vector-canvas-lab HEAD.
- Detailed chronology, evidence paths and limitations: `tasks/vector-integration-restart.md`.

## Present in the integrated application

The complete approved donor editor runs inside the Linefield drawing route. It retains direct WebGL rendering, the existing geometry worker and synchronous fallback, retained detail, allocation reuse, sparse coverage, region/tile caches, Ink, paper-contact Hard/Soft Pencils, pressure, opacity, paper/grids, layers, selection/transforms, live positive/zero-width Slice and history. Rendering algorithms were not replaced with the discarded staged bitmap approach.

Rust owns the imported document, accepted samples, editing, layers/history and authoritative geometry in `crates/vector-engine`. Camera mapping and anchored zoom/rotation have also moved into shared Rust. Host code retains input acquisition, UI, WebGL submission and disposable rendering preparation/caches. This is not yet the final responsibility split.

The host has shared themes and EN/UK controls, including default layer names distinguished from user names by Rust metadata. Back/Resume retains the same session; leaving mid-gesture cancels it. Startup failures support safe Retry before a document exists; runtime failure feedback preserves the current session. The drawing is explicitly temporary and not saved.

Generated scalar ABI declarations and a signature fingerprint are checked at startup. Geometry transport capacities come from Rust; invalid worker messages retire the worker through the existing fallback. Canonical samples and placement/history use regional addresses. Actual screen input, queries, selection/Slice, coverage and GPU projection now share a checked regional view origin, with atomic derived-cache invalidation at frame boundaries and precise paper/grid phase. Bounded full-range image parity and held-pan region roundtrips pass. This is not complete numerical or architecture acceptance; long individual source spans and broader origin-transition/failure cases remain.

## What is still required

1. **Finish bounded geometry and regional acceptance.** The screen now uses nonzero regional origins, with exact bounded image comparisons at far/full-range origins. Adaptive f64 derived geometry now passes the two-ended source tests through 2^32 displacement; arbitrary i64-wide sources still need a defined precise treatment. Do not revive the rejected single-chunk-origin solution. Expand curved/crossing/transformed wide-source image and resource/performance coverage. Expand rotated/zoomed origin crossings, pending-job edits and resource-failure coverage. Rebase cost and extra retained endpoint memory are measured in the task; do not claim final performance acceptance from those bounded results.
2. **Finalize the host/session boundary.** The editor is temporarily a persistent same-origin iframe. Its donor control layout and module sizes remain intermediate; clean component/host factoring and final design/accessibility review are unfinished. Preserve the functioning renderer while doing this.
3. **Complete the combined acceptance matrix.** Present evidence is bounded, not full LFV01–18/sign-off. Broader sparse/large workloads, presentation-correctness latency, physical Wacom validation, resource pressure/failure and repeated pending-job edits require further evidence. Independent/design review has not been completed for final adoption.
4. **Run the five worker experiments after faithful integration is accepted.** None has started: material generation versus worker/prebuilt asset; extended completed geometry; visibility/overlap/tile planning; Lasso/Slice calculation; OffscreenCanvas rendering. Establish separate baselines, adopt only useful correct variants, and retain measured rejection/compatibility findings. Do not label the donor's existing worker as one of these completed experiments.
5. Keep PR #21 draft until those gates are actually resolved. No merge or release is authorized.

## Verified evidence and its limits

- All 120 approved browser checks pass on 65313: 22 paper-contact behavior, eight rendering/recovery, and 30 editing checks per brush.
- Exact artwork/raw comparison passes for brush overlap, pan, rotated drawing, zoom and history. An expanded run on the preceding equivalent rendering pipeline compared 18 captures across four separated regions, including held-pointer panning before mouseup and the full zoom range. Readback waits for settlement; this does not establish per-frame latency. Only camera f64 roundoff has a documented allowance; no new artwork tolerance was added.
- EN/UK checks verify authored/default layer names, no-op rename, history, drawing, layer visibility and persistent error feedback. Session lifecycle, startup retry, worker failure recovery and live themes have passed at recorded checkpoints.
- 125 regional primitive cases and additional adapter transport/type/copy checks pass. These are not canonical drawing precision acceptance.
- Repeated performance comparisons use M2 Pro, Chrome 156 headless, DPR 2, 2880×1632 backing stores, three alternating repeats per side. Small, 256-stroke and sample-heavy scenes show no clear integration regression. CPU/rAF results are not physical pen latency or GPU duration. History has too few samples for a meaningful tail claim. See the task record for exact figures.
- Native/Wasm builds, both host typechecks, ABI/localization generation and scoped vector-module lint pass. The repository-wide `node scripts/check.ts` initially found unchecked regex captures in the ABI generator; those were fixed without changing generated output, and the full command now passes. It covers its configured paths only, not every imported vector module or final architecture acceptance.
- GitHub reports no configured PR check runs. Local evidence is not remote CI evidence.

## Reproduce without changing live previews

Run from the restart worktree. Build into a new directory, never overwrite `apps/web/dist` or any existing frozen preview directory:

```sh
node scripts/build-vector-editor.ts
node apps/web/node_modules/vite/bin/vite.js build apps/web --outDir /absolute/new-preview-directory
```

Then run Vite preview from `apps/web` with that directory and a new unused port. Keep the reference, donor and existing sessions alive. Use `LINEFIELD_PREVIEW_URL` and a fresh `LINEFIELD_EVIDENCE_DIR` for the browser runners in `apps/web/tests/vector-*.mjs`. Sparse parity adds `LINEFIELD_PARITY_SPARSE=1`; performance counts use `LINEFIELD_STROKES` and `LINEFIELD_SAMPLES_PER_STROKE`. Avoid concurrent performance runs.

Evidence is under `.build-cache/restart/` and ignored by Git. Preserve failures as well as passes; do not overwrite them with unrelated runs. Do not claim the regional audit passes until the owning drawing path actually changes and verifies it.


## Renewed autonomous continuation

The owner renewed autonomous implementation after the earlier deadline and requested five-minute continuations. The existing automation was reactivated with that interval, without duplicating it. The old deadline is no longer active; continue until completion or an owner pause. Prioritize bounding long-source geometry and broadening regional transition/failure evidence, then host architecture, before the five optional worker experiments. Keep every existing preview frozen. See the latest task entry for canonical storage evidence and its memory cost; the current distant visual claim is limited to the actual image/held-pan cases recorded in the latest task entry.

## Latest bounded host factoring

Ink shader/program resource ownership now lives in a separate browser module. Shader algorithms and rendering lifecycle are unchanged. Actual-app compile/link fault injection verifies cleanup and startup Retry; all 120 approved checks and exact reference artwork/raw parity pass on 65307. No new performance improvement or final architecture acceptance is claimed. Continue with the numerical and architectural gaps listed above.

## Next numerical implementation gate

The long-source gap is now reproducible with apps/web/tests/vector-long-source-audit.mjs (intentionally fails on current production). Twenty actual-app Wasm cases preserve canonical/history and worker equality, but six noncompact cases lose fine source geometry. At 2^20 displacement, 128 tail positions collapse to 65 and a straight chunk grows from one to 96 capsules. Read the latest task entry for the coupled Rust/host implementation requirements; do not fix only snapshots, camera transforms or GPU buffers. Existing preview 65307 remains the latest verified application. No production changes were made in this audit checkpoint.

## Rejected chunk-origin candidate — continue from verified production

Do not adopt the candidate in frozen experimental previews 65308–65310. Its local chunk frames fixed distant tails and passed ordinary images/120 checks, but the strengthened two-ended numerical gate proves four starting-endpoint regressions (0.125 becomes 0 at 2^24/2^32). Production changes were restored; 65307 remains latest verified. Candidate patch/module are ignored evidence under .build-cache/restart/chunk-origin-rejected. The tracked long-source audit now checks actual projected geometry and both ends; a new actual-input cropped-tail image/Slice/history test catches the existing baseline failure. Both remain explicit failing gates on production. Next implementation needs a precise wide-span path while retaining the ordinary fast path; see the task entry. No additional worker experiment has started.

## Current adoption status — supersedes the preceding failed-gate status

Adaptive wide derived geometry is now integrated. The original f32 fast path remains for ordinary strokes; Rust owns both instantiations of one curve/flattening policy, with f64 preparation, bounds and Slice for wide chunks. Typed worker transport and retained source endpoints stay wide until view-relative GPU projection. Both-end numerical gates through 2^32 and all-brush cropped tail/Slice/history images now pass, including forced worker fallback. The 120 approved checks, ordinary exact image parity, static/build checks and native compilation pass. Preview 65313 is the new verified bounded checkpoint. Read the latest task entry for measured ordinary performance and remaining full-range/curved-wide/resource/architecture/review gaps. This is not final M1–M9 acceptance; no optional worker experiment has begun.

## Actual worker validation

The current actual-app image runner confirms real Float64 worker responses and detached transfer inputs, and injects a wrong-precision response to verify worker retirement plus exact-image synchronous recovery. Both 12-scene runs pass on unchanged preview 65313. See the task record for bounded workloads and evidence; this adds correctness coverage, not performance or full-range acceptance.

## Latest shared Pick checkpoint

Preview 65314 moves the Pick capsule-distance predicate into bounded Rust batches while retaining existing host cache lookup and candidate ordering. All 120 approved checks, exact reference artwork/raw parity and three alternating actual-input Pick comparisons pass. ABI now has 102 functions. Lasso and full selection candidate ownership remain unfinished; see the task for scope, measurements and limitations. All previous previews remain frozen.
