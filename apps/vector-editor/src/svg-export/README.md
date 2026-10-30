# Appearance-preserving SVG host adapter

Rust owns the immutable completed revision, regional bounds, render-group order, output
options and SVG/PNG validation/serialization. This adapter never changes raw strokes,
history or save receipts. The worker receives one disposable geometry packet at a time;
it never becomes a second document owner. Its empty Wasm instance is used only by the
existing paper renderer's regional phase calculation.

The worker unions coverage across all packets in one Rust group, then encodes one lossless
PNG for that group. No cropped/padded SVG tiles are used. All brushes currently use the
appearance-preserving raster fallback, explicitly disclosed by the UI. This is an SVG
container with embedded raster content, not editable resolution-independent vector Ink.

One packet (at most1024 capsules) is in flight. GPU submissions split it into64-capsule
batches while retaining the same coverage mask. Each batch yields to the worker event
queue and rechecks input priority. `setInputActive` must be wired to actual host gestures;
the callback also checks activity before capture/transfer/encoding. Already submitted GPU
work, shader/material initialization and browser PNG encoding cannot be preempted. Claims
about responsiveness require the paired actual-app measurements, not the worker location.

PNG is pulled in49152-byte blocks. Shared Rust checks its structure, dimensions, CRC and
SVG output budget; the worker additionally decodes its generated PNG to verify decodability
and dimensions. Rust emits bounded UTF8 pieces; the host collects fixed64KiB Blob parts.
No URL/download is published until completion, context-health checks and snapshot cleanup.
Cancellation terminates the worker immediately and retires source references in bounded
Rust calls. Worker errors, timeout, context loss and stale replies never publish partial SVG.

Admission is deliberately bounded:256MiB estimated raster scratch (24MiB material allowance
plus24 bytes/outputpixel), GPU dimension limits,128MiB SVG output and Rust snapshot limits.
This is not a total browser-process memory guarantee: source retention, Wasm, output parts,
Blob ownership, allocator/driver and PNG implementation overhead are separate. Oversize
exports fail explicitly; no hidden downsampling/cropping. The caller releases the completed
object URL when dismissed or disposed. Transparent paper with grid is unsupported.

Diagnostics contain only operation kind/job/counts/duration and allowlisted error categories.
No coordinates, raw samples, artwork, paths or arbitrary exception strings enter that hook.
