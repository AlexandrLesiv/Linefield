# Reuse ledger

Reference: /Users/oleksandr/projects/native-sketch at 3b580873ded3fea63d0220a53d7c5ece66c5d897.

Only review documents and adapted workflow/agent instructions are copied in this scaffold. No application source, tests, dependencies or binaries have been copied.

Before source reuse record: old commit/path, new path, license/attribution, reason, semantic changes, removed dependencies, acceptance IDs and newly executed results. Existing results never certify Linefield. See [inventory](reuse-ledger.md).

## Complete5207 reference — M01

Reference manifest SHA-256:474873d88d00f498105fc2fbb8eed754cc01ba93f6a3f9bcde7dfd78a853ca1d;
77 source files verified2026-10-21. Donor source-app is the complete handoff assembled from
vector-canvas-lab, whose repository base is e6bab2d4d4cd669e2107bfe72f8efcd607902f3d.
Later paper-contact changes are identified by the manifest, not falsely attributed to that commit.
M01 adapts architecture/behavior descriptions only; no application code or assets copied yet.
The owner requested selective implementation using this reference. Each implementing leaf must
record donor/new paths, provenance/license or attribution checks, semantic changes and fresh
MIG acceptance evidence. Do not import upstream third-party code without its applicable notice.

The selected donor snapshot has no declared package license or LICENSE/NOTICE file. Reuse is
owner-directed transfer of the pinned authored reference, not assumed MIT/Apache licensing.
Discarded Vello vendor licenses do not apply to these shaders/material. Inspect each adapted
source for actual third-party provenance and preserve required notices if discovered.

## M02 — shared Ink and direct WebGL baseline

Owner-directed selective transfer from the complete5207 manifest above; no external donor
runtime/build dependency. No license is invented for the authored donor snapshot. Source files
inspected contain no additional third-party attribution notice. Existing npm/Cargo dependencies
retain generated dependency notices. This leaf does not import the donor's unit suites/pass claims.

| Pinned source / SHA-256 | Adapted destination / purpose |
| --- | --- |
| core/src/geometry.rs / d34d4c657313822295e74a7b995ff39ce0da7c01e5426f3c0064f713b0ab9e3f | crates/editor-geometry: Hermite tangents, corner threshold, linear endpoint radii and conservative edge error |
| src/ink-shaders.ts / 5c659d2b290d97129ad8d71b37e45e333668f36f8ebe78f1e3e3cb01bd7ca422 | apps/web/src/memory/gpu-shaders.ts: analytic tapered capsules, interval-overlap AA and tiny-dab area |
| src/coverage-renderer.ts / 9de059d6f345b1e2790be289b5a282dd1c3ac2784d0a28e79223ed532c30ddf5 | gpu-renderer.ts / gpu-scissor.ts: group MAX coverage, painter-order source-over and bounded scissor support |
| src/gpu-arena.ts / dcdb519c42f62f446b96ce8aa3e4634139d4c7f77a07682b592311f5601b5e28 | gpu-allocation.ts: two retained bounded streaming buffers; newly authored failure cleanup |

Deliberate M02 changes: canonical raw/camera arithmetic stays regional f64 Rust; all generated
Wasm commands validate caller values. Geometry has a resumable fixed subdivision stack rather
than the donor's depth-five unconditional acceptance. Pages are locally rebased, certified for
the effective view and leased with bounded/accounted metadata. Coherent staging is published
only after the whole baseline frame completes. Ink initialization does not bake pencil material.
Cross-span simplification, worker preparation, resident geometry/atlas optimizations and remaining
tools are sequenced later in M03–M09; this baseline does not claim their acceptance.

Existing Linefield R08 at37834daa64eaaefb5863201dbe8c96a43a9c6424 supplied regional
numerics/normalize,magnitude,round.rs and the reviewed pen-input/pen-contact/pointer-release
terminal-ordering policy. The new thin acquisition adapter preserves terminal pressure and
recognized trusted lostcapture-before-up behavior without a timeout. No old CanvasKit display
orchestration is adopted. Legacy CanvasKit loading remains only in isolated test fixtures.

Fresh evidence is recorded in P05-M02/quality/web-gpu-editor: MIG-INK-01/02 and MIG-VIEW-01
are actual browser pointer/keyboard E2E; checked-boundary exploration is separately labeled.
Physical Wacom timing and native-platform evidence remain explicit gaps.

M02 numerical repair deliberately replaces the donor difference-of-squares distance with a
stable perpendicular/axial tapered-disc union distance. Tiny-dab area treatment stays intact.
For subpixel tapered strokes, a continuous union-of-AA-disc envelope replaces the donor
nearest-disc radius cap, whose near-containment classification could abruptly change coverage.
The conditional eight-step radius search has an exact-arithmetic coverage loss bound of1/256;
floating-point error and RGBA8 quantization are separately checked, not geometric tolerances.
The bounded GPU reference uses independent f64 maximization and includes equal-radius,
cap-inactive and reversed-taper controls. CPU/GPU corpora do not prove every GLSL implementation.

## M03 — pure preparation and retained geometry

The same complete5207 manifest and owner-directed transfer apply. The retained allocator
selectively adapts the bounded shared-buffer idea from src/gpu-arena.ts (hash above),
replacing donor ownership with checked Rust page identities, counted slab capacity, explicit
coalescing/compaction and disposable streaming fallback. No new third-party source is copied.

New Rust editor-geometry preparation retains the donor-derived Hermite/corner/radius semantics
and M02 stable capsule AA, while adding conservative control-hull clipping, resumable work
and bounded cross-segment compaction. Raw regional samples remain canonical and untouched;
source/detail/coverage/adoption policy stays in the editor owner. A separate generated Wasm
module depends only on pure geometry and exposes no mutable editor/history API. The host
worker handles scheduling/copied values; the same pure function serves the local live path.

Coherent frame receipts, scalar coverage masks, opaque RGB8 staging, packed RGBA8 fallback
and bounded retained GPU allocation are newly authored Linefield integration. Current
MIG-WORKER browser checks cover delayed stale results, worker failure/local fallback and
normal/packed-format artwork parity. Numerical/capacity/recovery/performance qualification
remains task-scoped and must complete before adoption; donor tests do not certify this work.

The scoped Undo continuity repair adds a newly authored Rust historical-display transform and
retains the existing validated GPU base through asynchronous replacement. It copies no additional
reference source and changes no curve/material semantics. Current content certification remains
separate; the long pending-stroke capacity gap is tracked in the M03 quality mapping.
