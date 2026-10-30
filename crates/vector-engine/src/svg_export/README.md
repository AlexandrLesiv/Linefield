# Shared SVG export boundary

Feature `svg-export` enables this module; `svg-checkpoint` is a compatibility alias for
SVG-01 E2E fixtures. Normal editing, geometry and persistence data are not modified by
export. `scripts/svg-export-boundary.ts --check` verifies generated scalar types, arities
and an eight-word SHA-256 fingerprint. The host must use checkedSvgExportCore before calls.
The old twelve-method checkpoint declaration remains a valid subset for its old fixtures.

## Lifecycle and authority

`svg_begin` rejects active Rust drawing/transform/delete/Slice transactions or another
retained job. Host camera/lasso gestures must additionally be rejected by the host.
`svg_prepare` copies at most64 visible, nonzero-opacity stroke records per call, retaining
immutable source references. Revision/count/active-interaction changes abort preparation.
After state2 is sealed, later edits are excluded. Completed unsaved edits are included;
export never advances durable revision or mutates history/raw accepted samples.

States:1 preparing,2 sealed/streaming,3 geometry exhausted,4 retiring,5 failed;0 stale token.
`svg_cancel` then repeated `svg_cleanup` retires at most64 references/map nodes or blocks
of256 source samples per call. No new capture until retirement finishes. Always retire a
completed, failed or canceled job. Token exhaustion rejects rather than wrapping identity.

Configure once after seal, before geometry: density1/2/4; background0 current,1 solid white,
2 transparent; grid0 off or1 captured. Current paper0 means current white canvas. Explicit
transparent with a nonzero captured grid rejects. `svg_measure` processes one bounded
geometry chunk per call and returns1 pending,2 ready,5 failed. It does not consume geometry.
Bounds include conservative transformed brush footprint and16-unit margin. Empty output
is1920x1080 drawing units. The final dimensions round outward to whole output pixels.
`svg_view` indices0x,1y,2width,3height,4density,5paper,6grid,7pixelWidth,8pixelHeight.
Selected paper values0 transparent,1 warm,2 white paper,3 solid white. Grid0 none,1 notebook,
2 dots. `svg_tolerance` returns output-dependent renderer detail (.25/density), independent
of current camera/DPR. Configured geometry calls reject a different tolerance.

## Geometry packets

`svg_next(token,tolerance)` returns the f64 count at `svg_output_ptr`; copy before another
call or memory growth. Zero means exhausted or failed: check status. Maximum6168 doubles.
Header24 doubles: version1; stroke/source/blend-group/layer/rank at1–5; brush/RGB/opacity/
transformed width at6–9; source basis10–11; source offset12–13; relative placement14–15;
chunk index16; last stroke packet17; transformed bounds18–21; captured paper/grid22–23.
Remainder contains up to1024 capsules x0,y0,r0,x1,y1,r1 relative to export origin.

`svg_group_last` indicates the last returned packet ends a coverage group. Group identity
includes layer rank, source, blend group, brush, color, opacity and transformed width.
Coverage unions across its chunks/fragments before applying opacity once. Groups composite
in canonical painter order. The measure pass and streaming use exactly this grouping.
Read origin i64 region as BigInt and local f64 separately; never flatten through JS Number.
Raster adapters rebase f64 positions before float32 packing and preserve texture phase.

## SVG and PNG streaming

After measurement, `svg_xml_begin` emits the fixed root and raster-content description.
For optional background first, then each group: `svg_xml_image_begin` emits the full-view
image prefix; copy PNG chunks of1..49152 bytes into `svg_png_input_ptr`, call `svg_png_write`
and copy emitted UTF-8 at `svg_text_ptr`; `svg_xml_image_end` flushes base64 carry and closes
image. A PNG write can return0 for a1–2-byte partial triplet; check error, not count alone.
All output counts are byte counts and output pointers must be copied before another SVG
call. No user-provided XML/string/filename is interpolated. PNG dimensions must equal view.

Rust validates PNG signature, chunk framing/order, IHDR, dimensions, format, CRC, required
IDAT and final IEND with no trailing bytes, using constant state and no PNG-body allocation.
The host must additionally decode the encoded PNG and check dimensions before transfer:
framing/CRC alone cannot prove the compressed image decodes. The host owns PNG codec/GPU.
`svg_xml_finish` requires exhausted geometry and exactly the expected number of completed
images. Publish/download only after this succeeds. Rejected/partial bytes must be discarded.
No cropped/padded tile SVG paths or unapproved vector AA silhouettes are shipped here.

## Admission and errors

One job;100,000 visible metadata records;128MiB unique logical source Point bytes; relative
finite coordinates within±2^32;64million output pixels;128MiB cumulative serialized SVG.
Host additionally bounds GPU scratch, geometry transfers, retained output parts/Blob and
encoded/decoded PNG memory. Logical source bytes are not allocated-capacity or total RSS.
Standard map allocation can still fail catastrophically under process/Wasm exhaustion;
these bounds do not claim graceful recovery from every allocator or browser-wide failure.
PNG input/output buffers use fallible reservations; maximum base64 chunk is65536 bytes.
Errors from `svg_error`:1 options,2 bounds/pixels,3 lifecycle,4 PNG,5 output limit,6 resource/allocation,
7 capture/geometry;0 none, u32::MAX invalid token. A failed export cannot publish a footer.
