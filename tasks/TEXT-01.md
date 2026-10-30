# TEXT-01 — editable canvas labels

Status: implemented and verified; independent technical/design review passed.
Owner review and merge remain pending. Owner explicitly requested phone investigation
of Concepts text creation/editing and implementation of that workflow in Linefield.
Branch: `codex/text01-labels`, stacked on IMG-04 / PR39 at `61ba982`.
Existing previews, including 65429, stay frozen. No merge or release authorized.
Lead owns contract, font provenance and integration; Rust specialist owns shared
engine/generated boundaries; host specialist owns web adapter and E2E scenarios.
Independent technical/design review is required before completion.

## Observed reference and scope

On the connected iPhone through Mirroring, a new test Concepts drawing was
used. Selecting a text label exposes an Edit Text action. It opens a native
sheet titled “Add a Label”, a text field, Done, and a note that text is not
wrapped on canvas. Editing and confirming changes the selected label. Selection
also exposes duplicate, lock, delete, flip and rotate/scale controls. These are
observations, not evidence that every corresponding Linefield feature exists.
The Text-tool creation gesture is documented in the current
[official manual](https://concepts.app/en/manual/brushes-and-tools): choose Text,
tap canvas, enter a label; select and use Edit Text to change its wording.
Horizontal tool-strip interaction through Mirroring did not reveal Text, so
creation via that tool is not claimed as a direct observation.

Implement Text tool → canvas position → native editing sheet → Done. Selecting
one text object exposes Edit Text. Preserve explicit line breaks with no automatic
canvas wrapping. Place a new label centered on the canvas press and upright relative to the view
rotation captured when its editor opens. Rust stores the inverse initial camera
rotation in the label transform as part of the single Add operation. Later camera
rotation continues to move the label with the drawing. Preserve its
transformed center when editing changes its bounds, matching the observed label
expansion on the phone. Use existing color, opacity, layer and selection transforms;
do not add a rich-text editor, font picker or recreate Concepts' tool wheel.
Cancel/Escape leaves canonical content unchanged. IME composition and ordinary
native editing shortcuts take priority over drawing shortcuts. Empty new labels
are no-ops; empty edits retain the draft with an error rather than implicit deletion.

## Shared contract CT-TEXT-01 / INV-TEXT-01

Rust owns editable UTF-8 content, stable object identity, versioned font/layout
identity, color/opacity, regional anchor, similarity transform, layer and history.
Text is a distinct document object, never a raster image asset or fake stroke.
Host-native shaping supplies a checked derived layout receipt including ink
overhang, padding and multiline metrics. Content and matching layout publish
atomically; stale/deleted/locked edit targets reject without overwriting data.
Each completed Add/Edit is one history operation. Failed preparation keeps the
draft available. Slice applies only to eligible strokes.

Images and text share a persisted non-stroke insertion ordinal between strokes.
Migration preserves old image order. Mixed object order must survive transforms,
Slice, Undo/Redo, saving, recovery and export. Canonical saving retains editable
text and layout metadata; disposable textures are not authoritative storage.

The initial font is bundled Noto Sans Regular v1. Host font shaping and explicit
`system-fallback-v1` for characters outside its coverage preserve Unicode input.
Device-font fallback may differ across platforms; exact web/native glyph parity
is not claimed. Disclose fallback in the editor. Appearance-preserving SVG embeds
the rendered snapshot rather than relying on the viewer's installed fonts.

Host owns accessible native textarea/dialog, font loading, raster preparation and
GPU submission. Text shares bounded GPU capacity with images. Use visible-region
tiles when a full label at target density is too large; do not silently clamp
resolution or clip glyphs. Camera updates remain immediate, obsolete preparation
cannot overwrite current content, and replacement failures retain valid rendering.
No per-frame reshaping, rasterization or document-wide copying.

Initial admission bounds are 16 KiB UTF-8 and 256 explicit lines per label,
10,000 allocated label identities per document, and 128 MiB of retained immutable
text payload across the live document, history, pending restore and export.
Shared payloads count once; exhaustion rejects a new operation without evicting
Undo or existing content. Layout bounds are finite and at most 65536 units per
axis. The web visible working set is bounded to 512 raster jobs/textures, 4 MiB of text source and 256 exact tiles per label, sharing a 128 MiB texture budget with images. New Add/Edit operations preflight the resulting visible set before publication; exhaustion preserves the draft and prior document. Later camera, layer-visibility or zero-to-positive opacity changes can expose a larger set and report an explicit text-detail limit while preserving canonical data and other drawing operations. These are initial safety bounds, not measured maximum document capacity.

## Security and failure policy

Existing sensitive boundaries: untrusted typed/pasted UTF-8, durable save records,
generated Wasm boundary and SVG XML output. Render text as data, never HTML. Bound
content, dimensions, allocations and queues; validate finite transforms and receipt
identity in Rust. Escape export content and avoid external font references. No new
network service, privilege, account or document transmission. Diagnostics contain
operation/revision/status/count metadata, never text content. Invalid input,
quota/fault, stale edit and resource exhaustion preserve prior document/history.

## Acceptance SU-TEXT-01

- Actual app Add/Edit/Cancel, native shortcuts and IME composition; pen/mouse input
  resumes afterward with all accepted stroke samples retained.
- Latin, Ukrainian/accents, explicit and trailing empty lines; emoji/unsupported
  scripts follow the disclosed fallback policy without discarding source text.
- Each completed edit is one Undo/Redo operation. Selection, layer state,
  move/rotate/resize/delete, far-regional placement and mixed ordering are correct.
- Save/reload/recovery retains exact text/style/placement and images/strokes.
- SVG matches the rendered snapshot, with no dependence on external fonts.
- Zoom/rotation/Retina checks cover ink bounds, density changes, stale work,
  texture eviction/recovery and allocation failure without silent quality loss.
- Measure cold/warm label preparation and drawing responsiveness; report median,
  tail, stalls, memory and time to correct image separately. No physical pen latency
  claim from injected-input tests.
- E2E behavioral tests, static/build/generated checks and independent technical/
  design review. Evidence stays in ignored `.build-cache/text01`; missing evidence
  is not a pass. Open a separate frozen actual-app preview when verified.

## Verification and known limits

The current isolated web candidate is `http://127.0.0.1:65436/`; existing 65429 and 65435 assets
remain byte-identical. No native app implementation or physical Wacom latency
claim is included in this web task. Automated pen coverage uses trusted CDP
input for UI recovery and explicitly injected events for the timing workload.

On Apple M2 Pro / 16 GiB, macOS 27.0.1, Chrome 156.0.8078.79,
1280×900 CSS pixels at DPR2, three paired 16-line/998-byte label trials
covered new, warm and zoomed text while drawing 240 moves at 8 ms intervals.
All 12 runs retained 241 samples and exact save/reload data. Both the frozen
reference and candidate had 16.7 ms median/16.8 ms p99 frame intervals; no 50 ms
main-thread long tasks occurred during input. Text-lane dispatch maximum was
3.7 ms versus 2.9 ms in three reference runs; this is no demonstrated speedup or
physical input-to-photon measurement. New-label publication with a current-source
overview took 101–120 ms. Full-detail readiness took 2.35–2.37 s after Done and
2.52 s after zoom when immediately followed by about 2 s of active drawing: detail
uploads yield to accepted ink, while the current-source overview stays visible.
Logical text texture payload was 7.84 MiB at 100% and21.59 MiB after zoom; these
figures exclude driver overhead and are not whole-process memory measurements.

Fractional-zoom font hinting/filtering can differ from drawing glyphs directly
at the final pixel grid. Same-density untiled raster comparisons check seams and
blending independently; native-grid comparisons retain those edge differences.
The initial tool has a single regular font, plain multiline labels and no font
picker/rich-text formatting. Device fallback for unsupported scripts is visible
to the user and can vary by platform. SVG preserves the exported appearance via
embedded raster tiles, while saved Linefield documents retain editable text.

Final candidate browser acceptance passed all seven suites: 14 actual-app checks,
4 aggregate-admission/Cancel-reopen checks, 8 recovery checks, 6 pressure/narrow-UI
checks, text-only and mixed image/text Canvas/SVG comparisons, and continuous
zoom/rotation/pan comparison. Same-density reference maximum channel error was 1,
with no interior gaps or blending seams; exact pan tiles became ready before
pointer release. Native fractional-grid edge error remained separately reported
(max 62, mean 0.14–0.18 per channel), not normalized out of the evidence.
The 390 px sheet fit, retained native input and displayed the fallback warning.
Scoped TypeScript, lint, formatting, generated ABI/storage/localization checks and
production build passed. Five inherited Rust formatting failures remain outside
this change; scoped changed/new Rust formatting passes. Evidence and frozen
asset hashes are in ignored `.build-cache/text01/`; no private phone capture is
part of the change.

The 2.9 ms reference dispatch maximum comes from separate frozen 65429 trials in
`performance65429/results.json`; the candidate empty-lane maximum was 6.6 ms in
`performance65435/results.json`. Neither result is a physical-pen latency claim.
Final browser/Wasm boundary conformance passed 221 assertions: text 57, retained
capacity/recovery 14, existing image 112 and image-cleanup 38. These are boundary
checks, distinct from the actual-app browser suites above. Independent technical
and design review passed the final source and exact-build browser evidence.

A fallback-font label opened on a device with different fallback metrics can
report a layout mismatch rather than silently clip or rewrite its saved layout.
Re-editing its content and confirming remeasures it on that device; unchanged
Done is a no-op. Cross-device fallback equivalence is not accepted by this task.
Physical Wacom and real operating-system IME candidate-window interaction remain
manual validation; synthetic composition tests establish draft isolation only.

Initial orientation acceptance: new labels in clockwise and counterclockwise
rotated/zoomed views start screen-upright at the clicked center, retain natural
scale, and preserve their canonical orientation through Edit, one-step Undo/Redo
and exact save/reload. The inverse captured camera rotation is part of the atomic
Rust Add operation, with nonfinite angles rejected before mutation. Updated
generated boundaries, production build, scoped lint/format,58 boundary checks
and14 actual-app regression checks pass. Independent review found no remaining
orientation findings. Timing evidence above remains from the same renderer on
65435; the orientation correction changes creation only, not frame scheduling.
