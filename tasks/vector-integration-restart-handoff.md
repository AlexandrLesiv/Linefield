# Restart integration handoff — 2026-10-29

This is an intermediate implementation, not completed M1–M9 adoption. Use the restarted branch only; do not revive the discarded migration branches, contracts or rendering pipeline.

## Where the work lives

- Worktree: `/Users/oleksandr/.codex/worktrees/vector-integration-restart/linefield`
- Branch: `codex/vector-integration-restart`
- Draft PR: https://github.com/AlexandrLesiv/Linefield/pull/21 — open, not merged.
- Verified remote main: `b101a7e`. The restart explicitly reverts the discarded PR16 documentation, then integrates the approved source.
- Current application checkpoint: `774e830`; subsequent tooling/documentation fixes do not change its preview.
- Latest preview: http://127.0.0.1:65294/ — choose New drawing. Reference 65280, initial integration 65281 and all other existing previews remain unchanged.
- Authoritative reference: `/Users/oleksandr/Documents/Codex/2026-10-20/files-pasted-by-the-user-build/outputs/linefield-handoff/source-app/`, verified 77-file source set `474873d88d00f498105fc2fbb8eed754cc01ba93f6a3f9bcde7dfd78a853ca1d`. Do not substitute current vector-canvas-lab HEAD.
- Detailed chronology, evidence paths and limitations: `tasks/vector-integration-restart.md`.

## Present in the integrated application

The complete approved donor editor runs inside the Linefield drawing route. It retains direct WebGL rendering, the existing geometry worker and synchronous fallback, retained detail, allocation reuse, sparse coverage, region/tile caches, Ink, paper-contact Hard/Soft Pencils, pressure, opacity, paper/grids, layers, selection/transforms, live positive/zero-width Slice and history. Rendering algorithms were not replaced with the discarded staged bitmap approach.

Rust owns the imported document, accepted samples, editing, layers/history and authoritative geometry in `crates/vector-engine`. Camera mapping and anchored zoom/rotation have also moved into shared Rust. Host code retains input acquisition, UI, WebGL submission and disposable rendering preparation/caches. This is not yet the final responsibility split.

The host has shared themes and EN/UK controls, including default layer names distinguished from user names by Rust metadata. Back/Resume retains the same session; leaving mid-gesture cancels it. Startup failures support safe Retry before a document exists; runtime failure feedback preserves the current session. The drawing is explicitly temporary and not saved.

Generated scalar ABI declarations and a signature fingerprint are checked at startup. Geometry transport capacities come from Rust; invalid worker messages retire the worker through the existing fallback. Regional i64/f64 normalization/displacement primitives and a checked BigInt host adapter are implemented and tested, but are not yet used for drawing.

## What is still required

1. **Regional document adoption is the principal architecture gap.** Canonical samples still use donor f32. The audit reproduces inherited precision loss: 65 intended positions collapse to 33 stored X values near 1,048,576 and one near 4,294,967,296 at 1600% zoom. The new primitives alone do not fix this. Migrate canonical source anchors/samples, placement, camera/query coordinates and origin-relative geometry together. Include origin/generation in derived-cache identity and retain paper grain phase. Do not flatten full i64 addresses into JS numbers or only change Point to f64 and declare success.
2. **Finalize the host/session boundary.** The editor is temporarily a persistent same-origin iframe. Its donor control layout and module sizes remain intermediate; clean component/host factoring and final design/accessibility review are unfinished. Preserve the functioning renderer while doing this.
3. **Complete the combined acceptance matrix.** Present evidence is bounded, not full LFV01–18/sign-off. Broader sparse/large workloads, presentation-correctness latency, physical Wacom validation, resource pressure/failure and repeated pending-job edits require further evidence. Independent/design review has not been completed for final adoption.
4. **Run the five worker experiments after faithful integration is accepted.** None has started: material generation versus worker/prebuilt asset; extended completed geometry; visibility/overlap/tile planning; Lasso/Slice calculation; OffscreenCanvas rendering. Establish separate baselines, adopt only useful correct variants, and retain measured rejection/compatibility findings. Do not label the donor's existing worker as one of these completed experiments.
5. Keep PR #21 draft until those gates are actually resolved. No merge or release is authorized.

## Verified evidence and its limits

- All 120 approved browser checks pass on 65294: 22 paper-contact behavior, eight rendering/recovery, and 30 editing checks per brush.
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
