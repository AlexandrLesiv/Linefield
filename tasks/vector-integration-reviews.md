# Restart integration: independent and design review

Review scope: the restarted approved5207 integration on PR21, not the discarded M01–M09 pipeline. Owner requested independent/design review and autonomous fixes. Base before review d1f510e; final frozen candidate65335 in `.build-cache/restart/review-complete-preview`. Existing65331 and all earlier previews remain unchanged. This is development-preview acceptance, not release/native/manual-device certification.

## Independent technical findings

The independent reviewer inspected shared/host ownership, boundary evidence, numerical reporting and resource recovery, and reproduced failures against65331 without editing production source.

| Finding | Fix and verification | Status |
| --- | --- | --- |
| P1: disposable capsule copy failure publishes source/target alias; subsequent Undo/Redo images become incorrect despite intact canonical data | Allocate the projected copy before publishing retained source. All brushes pass exact move/Undo/Redo and regional pan return after injected copy failure. Independent baseline/candidate actual-mouse reproduction confirms the fix. | Closed |
| P1: allocation failure during restored-context construction leaves drawing blocked indefinitely | Synchronous GPU construction rolls back partial allocations before retry. Three automatic attempts, then explicit localized Retry; no engine replacement or page reload. All brushes pass clean/transient/exhausted restoration, exact images/history, full canonical samples, cleanup and wrapper restoration. | Closed |
| P2: Retry focus intent disappears across automatic attempts, or overrides a newer deliberate focus choice | Retain focus intent across the retry cycle only while focus has not moved elsewhere. Independent cases cover repeated exhaustion, eventual success, second context loss cancelling scheduled construction, and preserving newly focused Undo. | Closed |
| Numerical report treats absent geometry capture as zero error | Before/Slice geometry is explicitly unevaluated; rotation requires actual geometry captures. Strict image failures remain retained, separately from the bounded numerical qualification. | Closed |

Nearest-region camera audit also passed six tie/i64-edge cases and630 additional finite zoom/rotation/crossing cases, max mapped-origin error4.66e-10 local units, with atomic invalid-input rejection. This is bounded numerical evidence, not arbitrary-span precision proof.

Technical scenarios include LFV-REC-COPY-001 and LFV-REC-RETRY-002; contract/invariant mapping supplied by the reviewer: CT-02/04/06, INV-04/05/08, SU-14/16/17. Reproducible browser fixtures: `vector-cache-copy-recovery.mjs`, `vector-context-recovery.mjs`, `vector-context-focus.mjs`. Failed and successful independent evidence is retained in `.build-cache/restart/independent-review` and `review-context-focus`.

The independent reviewer reports no remaining observed blocker among these review findings. This is a bounded verdict, not a claim that every possible resource failure is recoverable. Actual system OOM, owning-Wasm traps and browser termination remain outside established recovery.

## Design findings

The design specialist reviewed fresh actual-app sessions and screenshots, then authored the E2E regression fixture. Parent implemented production fixes. No owner session was changed.

| Finding | Fix | Status |
| --- | --- | --- |
| Narrow header clips reload/close data-loss disclosure | Wrapped disclosure and measured header height position the retained editor below it; title cannot overlap disclosure | Closed |
| Background controls obscure Pressure heading | Header stacking above canvas overlays; Pressure panel scrolls within available height | Closed |
| Hide/Show and Lock/Unlock lose keyboard focus; deletion needs a surviving target | Stable action keys; active-layer fallback after deletion/disabled action | Closed |
| Rename Enter/Escape consumes composition confirmation/cancellation | Composition/keyCode229 guard in field and containing panel | Closed |
| Focused canvas lacks visible keyboard indication | Inset themed focus ring, without changing drawing-buffer pixels | Closed |

Matched baseline65331:22 failures/6 passes. Final65335:28/28 passes, EN/UK at1280×720,390×844 and844×390. Designer visually inspected final layout screenshots on65333 (same host layout as65335). New `vector-design-acceptance.mjs` records URL/browser/results and screenshots. Evidence: `design-acceptance-baseline-refined`, `design-acceptance-final`, `review-complete/vector-design-acceptance`.

Not certified: physical IME/Wacom/touch, screen readers, enlarged text, contrast modes, pseudo-RTL or Ukrainian linguistic review. Synthetic composition routing is not a physical IME claim.

## Combined candidate acceptance

- Final65335:120 approved feature checks and exact approved-reference drawing-buffer/raw comparisons pass;12 all-brush context scenarios and28 design cases pass.
-65333 combined checks pass regional rotated low/high zoom, delayed/reversed workers, session cancellation/Back/Resume, EN/UK, live themes, copy failure and context recovery. Later65334/65335 production changes only refine Retry focus behavior.
-2^32 wide worker inputs/outputs: six normal/delayed sessions pass exact Undo/rebase/Redo/new-drawing images and raw data, with at most eight held real responses, observed f64 output and no retirement/errors.
-2^32 diagonal source: twelve actual-handle small rotations/resizes per candidate preserve a visible endpoint (image differs from empty paper), exact65331/65335 artwork and Undo/Redo, and all canonical values. The earlier horizontal tiny-angle attempt did not cross the screen drag threshold; its failure remains recorded and no input threshold was weakened.
- Curved common-tail/Slice/rotated wide-source qualification: all24 stages pass the declared narrow envelope.2^20 is exact.2^32 strict hashes retain six differing fields, at most one pixel/one RGB level per capture. Twelve rotation stages include geometry; before/Slice geometry is not measured. No global screenshot tolerance or production quality reduction.
- Build, generated117-function boundary, TypeScript, static checks, scoped lint and native test compilation pass. No native behavioral tests were executed.

Final asset hashes and workload identities are recorded alongside local evidence. Performance numbers and limits are recorded in the task/handoff after the final repeated comparison finishes. Readbacks and fault injection are correctness-only, never performance evidence.

## Acceptance boundary and next phase

The donor rendering lifecycle and optimization paths remain intact. Rust owns canonical regional samples, editing/history, geometry and shared arithmetic/policy; browser code owns events, presentation and disposable GPU/cache resources. GPU recovery never creates a second document owner. Retained same-origin iframe hosting is accepted for this development integration; there is no demonstrated need for a renderer redesign or mechanical callback extraction.

`window.lab` exposes development instrumentation and raw engine access inherited from the approved prototype. It is explicitly development-preview-only; it must be excluded from release builds before production acceptance. Signature fingerprints are compatibility checks, not authentication. Same-origin host content remains trusted; this is not a hostile-plugin or document-import security boundary.

The five additional worker experiments are still next-phase work, not completed by these checks: material bake/prebuilt asset, extended completed geometry, visibility/overlap/tile planning, Lasso/Slice, and OffscreenCanvas. Baseline each independently, adopt only measured correct benefits, and remove rejected shipping paths. The existing geometry worker and its recovery tests do not count as these experiments.

Other limitations remain explicit: arbitrary individual source spans do not have unlimited fractional precision; dense whole-Lasso completion around150ms is not solved; native integration and physical/GPU latency are not certified. Do not merge/release PR21 or imply full M1–M9 plus worker adoption is complete.

## Final repeated performance checkpoint (65335 versus approved65280)

Three alternating runs per build, AppleM2Pro/12 logical CPUs/16GiB, Darwin27, Chrome156.0.8078.48 headless ANGLE Metal, DPR2 and matching2880×1632 drawing buffers. Ordinary workload256×129 samples with four zoom cycles; stress workload6×16,385 samples, submitted synchronously per stroke. Both use30 settled Undo/Redo pairs per run (180 history commands per build per workload). Accepted samples and raw data are verified. Correctness readback/fault injection and other browser runs were not active during these measurements.

| CPU frame work | Reference | Integrated |
| --- | --- | --- |
| Ordinary drawing median of run medians |3.0ms|2.6ms|
| Ordinary pan median |2.1ms|1.8ms|
| Ordinary rotation median |4.5ms|4.4ms|
| Ordinary zoom run-p95 range |11.1–15.6ms|11.0–15.5ms|
| Ordinary history frame run-p95 range |5.3–7.0ms|4.5–6.4ms|
| Large-stroke history frame run-p95 range |2.6–2.8ms|2.6–4.0ms|

Do not infer a GPU speedup or physical latency from these CPU/settlement proxies. History frame medians include cheap settling frames; command timings near0ms reflect timer resolution, not zero displayed latency. No global speedup claim.

**Tail qualifications remain open:** one integrated dense-zoom run recorded a56ms main-thread long task and50ms rAF interval; reference maxima in this run set were16.8ms/no>=50ms long tasks. In the deliberately synchronous16,385-sample-per-stroke stress, reference peak longtask/rAF was52/66.7ms and integration62/100ms. Median whole drawing phase307.0vs343.4ms. This artificial burst is not paced Wacom input, but the worse peak cannot be hidden by warm medians. The dense-zoom outlier and burst admission cost need attribution before claiming full latency acceptance; no quality or accepted-input reduction is authorized as a shortcut. Evidence: `.build-cache/restart/review-performance` and `review-large-performance` (all six runs each, summaries and hardware/workload identities).
