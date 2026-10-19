# Live panning reconstruction — P05-E02 amendment

Owner approved the concrete live-pan plan on2026-10-19 after the10% offscreen-stroke report.
This supersedes the defer-until-End paragraph in web-memory.md. CanvasKit, canonical geometry,
whole-stroke rendering, memory soft targets and performance profile v1 remain unchanged.

## Responsibility and lifetime

Rust retains one captured target record: non-reused u64 target identity, owner/session/content,
viewport, mapping and metrics. No document/geometry copy or second mutable owner is created.
Target queries use unchanged canonical strokes and the captured projection. Current content
must match on every query. Translation-only pan updates, End and cancellation do not invalidate
that record. Rotation/zoom, changed content, suspension/surface replacement, metrics or session
changes invalidate incompatible work. A target never changes the gesture's cancellation base.

Host keeps one original published image, one staging surface, one working stroke/path and
at most one transient candidate image. It finishes one target while movement continues, with
one latest-dirty marker instead of a revision queue. Transfers remain≤4096 verbs per cooperative
turn and≤128 IDs/page; whole-path operations remain nonpreemptible and performance acceptance
is separate. It does not capture a transformed/cropped preview as a new source.

Generated snapshot API (all identities are checked bigint/u64; ordinary snapshot disposal):

- `memoryRenderCapture(owner, session, mapping) -> RenderTarget`: one immutable target;
  second compatible capture rejects `active`; active ink/unavailable display rejects.
- `memoryRenderIds(owner, session, target, after) -> SceneIds`.
- `memoryRenderStroke(owner, session, target, stroke) -> StrokeState`.
- `memoryRenderPage(owner, session, target, stroke, geometry, offset) -> ScenePage`.
- `memoryRenderTransform(owner, session, target, mapping) -> RenderTarget`: current affine,
  captured sourceMapping/backing, outside and canAdopt; no mutation/readiness change.
- `memoryRenderAdopt(owner, session, target, mapping, presentation) -> Reply`: revalidates
  exact current identities and coverage, promotes source metadata, consumes target.
- `memoryRenderRelease(owner, session, target) -> Reply`: releases only that matching target;
  stale/released identity returns stale-scene without changing a newer target/source.

RenderTarget includes ordinary Reply identities and target/sourceMapping/backing/canAdopt/
outside plus m11,m12,m21,m22,offsetX,offsetY. Geometry identity is target-specific. Current
scene revision changes do not restart target queries. Invalid/stale queries return no geometry.
Target bookkeeping is fixed-size and included in engine size accounting.

## Safe publication and coverage

Rust validates actual transformed old-source quadrilateral coverage intersected with current
viewport, not its axis-aligned bounding box. Target/current rotation and zoom must agree,
therefore candidate coverage is an axis-aligned translated rectangle in backing pixels.
Sutherland-Hodgman clipping uses fixed12-vertex storage (convex quad/rectangle intersection
has at most8 vertices). Nonfinite/uncertain results reject. Every intersection vertex must
lie inside conservative candidate coverage; otherwise keep old source and rebuild latest view.
Exact current target covers the complete viewport and may always replace the older image.

A one-backing-pixel old-source expansion and candidate interior-edge inset cover image edge
sampling and arithmetic uncertainty. CanvasKit drawImage uses its stock nearest sampling;
the guard also encloses a half-pixel linear footprint. Rotation preserves unit scale to the
represented-table error bound. Regional delta is≤5 regions, zoom≤8 and backing≤4: affine
each axis delta is below6×65536 including local offsets; rotation, zoom and backing bound
translation by sqrt(2)×6×65536×32 plus viewport-center terms, below2^25 backing pixels.
Local matrix/clip operations have double precision
error far below one pixel. Exact aligned candidate viewport edges need no interior inset;
fractional edges just outside the viewport keep it until at least one pixel outside. This is
a conservative rejection allowance, never an artwork coordinate tolerance or an erosion of
paint. A changed sampling/filter policy requires review of this bound.

Host validates transform, submits candidate, then calls adopt synchronously without await or
user callback, while fencing its surface lifetime. It retains previous image until adoption
succeeds. Rejected/thrown adoption restores previous image using its current affine, releases
candidate and preserves Rust state. Snapshot/draw/restore failures use existing recoverable
display failure and explicit Retry; no automatic replay or artwork rollback.

Only exact current owner/session/presentation/mapping/content calls memoryPresented. Transformed
adoption never unlocks ink. Exact acknowledgement during pan retains source metadata for later
movement; the active interaction still blocks ink/Undo. End or Cancel can then acknowledge
normally. Source promotion never rewrites the pan's original viewport.

## Verification and security

WMP-11-LIVE / CT-02/04/06 / INV-03/04/08 / SU-07/14/16:10% initially offscreen ink before
release, movement through completed targets, no-jump release, reversal/Escape, rotated edge
coverage and same-size surface invalidation. WMP-05 / SEC-02/03/09/13: hostile arguments,
stale target/geometry/presentation, candidate rollback, allocation/resource cleanup and owner
preservation. Engine writer owns E2E; browser fixture replay remains explicitly distinct from
actual application input and physical Wacom evidence. Capture/adopt/release emit bounded,
allowlisted outcome/session diagnostics; per-page/transform queries emit no production events.
No files, persistence, IPC, network, raw-memory access or new dependency is introduced.
