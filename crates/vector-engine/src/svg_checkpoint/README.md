# Isolated SVG01 Rust checkpoint

Enabled only by `--features svg-checkpoint`; no production loader or export UI uses it.
`node scripts/svg-checkpoint-boundary.ts --check` checks the scalar fixture interface.
This provides geometry packets for fidelity experiments, **not a completed SVG exporter**.
The eventual vector silhouette/serialization authority must remain in shared Rust.

## Snapshot lifecycle

`svg_begin` rejects active canonical drawing/transform/delete/Slice transactions and an
existing retained job. The host must additionally reject its own active camera/lasso
interaction; those host gesture states do not exist in this Rust engine.

Repeated `svg_prepare(token)` copies at most64 visible, nonzero-opacity stroke metadata
records per call, retaining immutable source references without copying raw samples.
Capture aborts if the completed revision changes, a canonical interaction becomes active,
or stroke slot count changes. It is an abortable capture, not a guarantee that export
can seal while concurrent edits continue. Once state2 is reached, later edits are excluded.
The completed revision may be unsaved; neither capture nor streaming advances durability.
Locked visible layers are included. Ordering matches rendering: layer rank, source order,
source blend group, stroke ID, geometry chunk. Canonical samples/history are never modified.

States:1 preparing,2 sealed,3 exhausted,4 retiring,5 failed;0 means invalid/stale token.
On failure discard the entire partial export. Always cancel/cleanup failed or canceled
jobs; `svg_cleanup(token)` returns1 when fully retired. Exhausted jobs also need cleanup.
Cleanup processes at most64 references/map nodes or256-sample blocks per call; no new
capture starts until cleanup finishes. A job's token never silently identifies a successor.

## Packet layout

`svg_next(token,tolerance)` returns the f64 count at `svg_output_ptr(token)`; copy before
another call. Zero means exhausted or failed, distinguished by status. Tolerance is fixed
on the first next call, finite and in[0.0001,0.25] document units. The host must choose it
for output density and compare quality, not use this permitted range as an acceptance claim.

`svg_setting(token,0/1)` exposes captured paper/grid even when no artwork packet exists.
It is available only in sealed/exhausted states; invalid token/index/state returns u32::MAX
(the direct Wasm JavaScript result is -1; normalize with `>>> 0` for an unsigned comparison).

Header24 doubles:

| Index | Meaning |
| --- | --- |
| 0 | Packet version1 |
| 1–5 | Stroke ID, source ID, blend group, layer ID, layer rank |
| 6–9 | Brush, RGB integer, canonical opacity, transformed brush width |
| 10–13 | Source basis x/y and source offset x/y |
| 14–15 | Placement relative to export origin x/y |
| 16–17 | Geometry chunk index, final packet for this stroke flag |
| 18–21 | Conservative transformed chunk minX/minY/maxX/maxY |
| 22–23 | Captured paper and grid settings |

The remainder contains up to1024 capsules: x0,y0,r0,x1,y1,r1 in document coordinates
relative to the export origin. A single geometry chunk may span multiple packets.
Coverage must union across chunks and fragments of one blend group before applying its
opacity once; independent groups composite in painter order. SVG ordinary variable-width
strokes are not assumed to match analytic coverage. Pure Ink union silhouettes are still
an experiment; complete-group raster fallback must be measured when vector fidelity fails.

## Precision and resources

Origin is the first included source's regional anchor. Read its region as i64/BigInt and
local remainder separately. Never flatten the origin through a JavaScript number.
Current anchors have local0 and65536-unit regions, so subtracting the origin preserves
64-unit pencil texture periodic phase. Capsules and bounds must be finite and within
±2^32 relative units; larger extents fail explicitly. This f64 admission does not make
float32 GPU coordinates precise: the raster adapter must rebase each tile before packing
and preserve material phase, or explicitly reject its unsupported coordinate range.

Transfer size is at most6168 doubles(49,344bytes). The unchanged128-sample geometry policy
has maximum recursion depth5 and4096 capsules per scratch chunk; its f64 output is bounded
at196,608bytes, plus bounded vertices/stack. This is separate from retained document data.

Admission currently caps100,000 visible metadata records and128MiB of unique source logical
Point bytes. `svg_retained_bytes` reports logical Point bytes, **not total memory**: Rc block
capacities, metadata/map nodes, source keys, packet/scratch storage, host copies, PNG and SVG
output must be counted separately. Deleted/modified live data can remain retained until
cleanup. Standard Rust map allocation can still exhaust the Wasm allocator; these bounded
experiments do not yet establish graceful allocation-failure recovery for production.
