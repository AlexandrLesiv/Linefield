# S02 regional typed contract v4 — proposal for review

Prepared 2026-10-19. **Not approved, generated, compiled or implemented.** Base `fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7` plus the preserved working tree. This is a new amendment, not an edit to the historical [v2 command](native-v2.md) or [query](native-v2-queries.md) approvals. Review version4 does not choose a deployed ABI/format version. Owner approval of the library sequence/deletion lifecycle does not adopt the numerical proposals below.

Owner: rust_engine for semantics, lead for integration; host engineers review layouts/adapters, ui_ux_designer reviews gesture/failure presentation, independent reviewer reviews boundary/security evidence. CT-01–06/09; REG-01–10; INV-01–04/06–09/11. No schema, worker topology, transport or product-tool additions.

## Decision surface and readiness

Review the following as separately identifiable parts of this packet:

1. **V4-A, typed boundary:** separate canvas input from canonical stored/query positions; engine-issued mapping generations; captured-base move/scale intents; borrowed inputs and bounded copied outputs.
2. **V4-B, normalization proposal:** nearest-even rounding before acceptance, with exact mathematical-domain validation and rejection of a carry past the maximum region. This is a recommended contract, not a claim that an implementation exists.
3. **V4-C, numerical admission:** retain selected scale/zoom/width bounds, but no original-stroke span or complete painted-geometry envelope is specified without evidence. Production input/transform/render admission remains blocked here.
4. **V4-D, scale gesture proposal:** projection onto the captured corner diagonal, with no flip/clamp. Designer assessment and identified gesture review are required; the source anchor is never the user pivot.

V4-A can be reviewed independently of the final span. Durable empty-library work need not wait for real ink. Approval of V4-A/B alone must not be interpreted as permission to accept arbitrary spans, ship scale gestures or substitute the diagnostic arithmetic for a production engine.

## Pseudodeclarations: exact type distinctions

These are proposed generated C-shaped declarations, not checked-in source/header code. Existing v2 runtime/client/interaction/intent/command/authority/reply/expected-stroke/copy-result types remain unchanged unless expressly amended here. All integer widths are explicit; all reserved fields must be0. C `double` means IEEE754 binary64 in the proposed contract; generated layout assertions must verify the target.

```c
typedef struct { double x, y; } LfCanvasPoint;
typedef struct { int64_t x, y; } LfRegion;
typedef struct {
  LfRegion region;
  double local_x, local_y;
} LfWorldPoint;
typedef struct {
  LfCanvasPoint point;
  double pressure;
  uint64_t sample_index;
  uint32_t has_pressure, reserved;
} LfCanvasActualSample;
typedef struct {
  LfWorldPoint point;
  double pressure;
  uint64_t sample_index;
  uint32_t has_pressure, reserved;
} LfStoredActualSample;
typedef struct {
  double width_points, height_points, backing_scale;
  uint64_t host_metrics_sequence;
} LfCanvasMetrics;
typedef struct {
  LfWorldPoint center;
  double zoom;
  LfCanvasMetrics metrics;
  uint64_t mapping_generation;
  uint32_t available, reserved;
} LfMappingSnapshot;
typedef struct {
  LfCanvasPoint start, current;
  uint64_t mapping_generation, input_sequence;
} LfGestureUpdate;
typedef struct {
  LfUuid stroke, tool;
  uint64_t mutation_revision, paint_order, sample_count;
  LfPenSettings style;
  LfWorldPoint placement;
  double uniform_scale;
} LfRegionalStrokeSummary;
```

Canvas positions are finite logical UI points, X right/Y down, origin at canvas top-left; they may lie outside the visible rectangle during captured input. They are not stored coordinates. Hosts convert native view orientation and preserve text/IME precedence. Backing scale changes raster density, not logical coordinates. `has_pressure` is0/1; absent pressure requires canonical payload0, present pressure is finite in[0,1]. Existing width/pressure policy remains unchanged.

`LfWorldPoint` at query/storage boundaries requires signed i64 regions and finite local coordinates in[0,65536), positive zero. Noncanonical persisted/query data is an error, never an invitation to repair imported artwork. No general public world-point editing command is added; future non-pointer commands need their own reviewed signatures.

Web adapters preserve region values as exact integers (for example, typed BigInt bindings); ordinary Number is forbidden for arbitrary region indices. This packet does not choose a serialized IPC schema or expose C pointers to Web/remote peers. Stored and canvas samples cannot share a generated type or silently coerce into each other.

## Proposed named entry points

```c
LfCopyResult lf_client_read_mapping(
  LfRuntime r, LfClient c, LfMappingSnapshot *output);
LfCommandReply lf_canvas_update_metrics(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t expected_mapping_generation, const LfCanvasMetrics *metrics);
LfCommandReply lf_canvas_suspend(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t expected_mapping_generation, uint64_t host_metrics_sequence);
LfCommandReply lf_viewport_pan(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t mapping_generation, LfCanvasPoint content_delta);
LfCommandReply lf_viewport_zoom(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t mapping_generation, double factor, LfCanvasPoint anchor);
LfCommandReply lf_selection_select_at(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t mapping_generation, LfCanvasPoint point);
LfCommandReply lf_stroke_begin(
  LfRuntime r, LfClient c, LfIntent intent,
  uint64_t mapping_generation, const LfCanvasActualSample *first);
LfCommandReply lf_stroke_append_actual(
  LfRuntime r, LfClient c, LfInteraction interaction,
  uint64_t input_sequence, uint64_t mapping_generation,
  const LfCanvasActualSample *samples, uint32_t count);
LfCommandReply lf_move_begin(
  LfRuntime r, LfClient c, LfIntent intent, LfStrokeExpected expected,
  uint64_t mapping_generation, LfCanvasPoint start);
LfCommandReply lf_scale_begin(
  LfRuntime r, LfClient c, LfIntent intent, LfStrokeExpected expected,
  uint64_t mapping_generation, LfCanvasPoint start, uint32_t corner);
LfCommandReply lf_move_update(
  LfRuntime r, LfClient c, LfInteraction interaction,
  const LfGestureUpdate *update);
LfCommandReply lf_scale_update(
  LfRuntime r, LfClient c, LfInteraction interaction,
  const LfGestureUpdate *update);
LfCopyResult lf_document_copy_strokes(
  LfRuntime r, LfClient c, const LfStrokePageRequest *request,
  LfRegionalStrokeSummary *output, uint32_t capacity);
LfCopyResult lf_stroke_copy_actual_samples(
  LfRuntime r, LfClient c, const LfStrokeSamplesRequest *request,
  LfStoredActualSample *output, uint32_t capacity);
```

`lf_stroke_end`, `lf_transform_commit`, `lf_interaction_cancel`, history, deletion, save and reconciliation keep their v2 command identity/dependency contracts. The library deletion amendment is reviewed separately; this document grants no destructive library operation.

`LfCopyResult` for mapping writes exactly one complete record on success, otherwise no record; no text output. On suspended mapping return `available=0` with canonical zero center, zoom1, zero metrics except the accepted host sequence, and the new generation. These sentinel fields are not a usable viewport or saved preference. Runtime retains the last valid viewport internally. Query success never grants mutation authority.

## Mapping state and exact semantic formulas

Each authenticated client owns independent presentation/viewport state under the authoritative Rust coordinator; no second mutable document owner. Mapping generations are engine-issued, monotonically increasing within that client attachment, nonzero and never reused. Initial generation is1, suspended until valid metrics are accepted. Exhaustion requires a fresh attachment; do not wrap. Host metrics sequence begins at1 and is strictly increasing; matching duplicate intent/body follows existing idempotence, different reused sequence rejects.

Accepted metrics are finite positive width/height/backing-scale values within the eventual measured numeric/resource envelope. Zero-sized/absent surface uses the explicit suspend call. Wrong client/session, stale expected generation, invalid metrics and out-of-order sequence reject before cancelling anything. For a valid current metrics change or suspension, cancel that client's unfinished interaction, then install the new mapping generation; no partial edit/Undo. Accepted unchanged metrics with a newer host sequence retain the generation and interaction. Restoring after suspension creates a fresh generation. No new input is accepted while suspended.

Hosts render/read the accepted snapshot and tag input with that displayed generation. The engine accepts only the current generation; a delayed event cannot act under a newer map. Save/storage outcomes are independently revision-fenced and survive mapping changes. A stale event from another interaction/session must not cancel the current interaction.

For valid metrics, the semantic canvas center is `(width_points/2,height_points/2)`. For each axis:

`world = viewport_center + (canvas_point − canvas_center) / zoom`.

This is an exact-value specification before V4-B rounding, not an instruction to flatten the world to f64. Inverse mapping requires rational-reference evidence. Pan's content_delta means screen movement of the artwork, so new viewport center is `old_center − content_delta/zoom`. Zoom uses positive factor and proposes no clamping: require new zoom in[0.1,8]; choose new center so the world point under the supplied canvas anchor stays fixed. Pan/zoom create a new mapping generation after acceptance; callers must obtain the new snapshot before subsequent intents. Active stroke/move/scale rejects pan/zoom without queuing or cancelling the edit.

## Captured interaction state and whole-operation behavior

Stroke begin captures validated pen settings, current mapping and reservations. First actual sample index is0; subsequent accepted indices are contiguous. Validate all samples, ordering, pressure, mapping and numerical admission before appending any part of a batch. Mapping conversion/normalization happens in Rust. A malformed current batch or current numerical-capacity failure cancels the whole unfinished interaction, releases transient preview and creates no history, receipt or persisted partial stroke. Valid completed work stays unchanged. Stale/wrong-interaction input rejects without affecting another active interaction. No predictions/corrections are introduced.

Move/scale begin captures immutable original samples, source sample0, placement, cumulative scale, whole-stroke mutation token, mapping, start point and operation reservations. Updates must repeat the captured start exactly after positive-zero canonicalization, use the captured generation and monotonically ordered input sequence. An exact repeated sequence/body is idempotent; altered repeated body rejects. No accumulated event deltas: each update derives from the captured base. Original samples never change. Commit revalidates the whole-stroke token and dependencies; conflicts preserve pending proposed work under the existing reconciliation lifecycle, without overwriting another edit.

Move proposal: `new_placement = base_placement + (current − start)/captured_zoom`, independently per axis. Round only the resulting accepted placement under V4-B; do not repeatedly round the previous preview.

Scale corner IDs proposed:0 top-left,1 top-right,2 bottom-right,3 bottom-left; other values reject. Rust derives captured painted bounds, opposite corner pivot P, and dragged corner H. V4-D proposes `v=H−P`, canvas delta mapped using captured zoom, `k=dot(v+delta,v)/dot(v,v)`, `new_scale=base_scale*k`, `new_placement=P+k*(base_placement−P)`. This preserves click offset and k=1 at the original pointer location. Reject zero denominator, nonfinite factor, k<=0 or new scale outside[1/64,64]; no reflection, handle swapping or silent clamp. This formula and its failure UX require designer review; bound construction and arithmetic require numerical evidence. They are proposals, not claimed settled behavior. Until V4-C/D are complete, scale admission cannot be marked ready.

Current invalid transform updates cancel their unfinished interaction atomically as proposed here; a stale unrelated event merely rejects. End/cancel/focus loss/resize use the shared interaction state machine. Undo/Redo and tool switching remain blocked throughout active interactions. Canvas Escape cancels first, otherwise clears selection, otherwise does nothing; native field/IME handling retains priority. One committed stroke/move/scale is one Undo; unchanged captured/result state is NoOp. Cancellation restores committed content and preserves independent worker results.

## V4-B: recommended normalization contract, not yet approved

Let B=65536, L=−2^63 and U=2^63−1. A trusted pre-acceptance position has an exact mathematical value X formed from exact integer regions and exact values of its supplied floats/arithmetic operands. This is a semantic reference; it does not prescribe arbitrary-precision allocation on the input thread.

1. Reject nonfinite source operands. Before rounding, require `L*B <= X < (U+1)*B`; overflow cannot be hidden by rounding back into range.
2. Compute mathematical floor quotient q and exact residual r such that `X=q*B+r`, `0<=r<B`, without absolute Number flattening. Intermediate region differences may require65 signed bits before multiplication; checked wider arithmetic is required, not wrapping i64.
3. Round r to nearest binary64 including the boundary candidate B, with IEEE754 ties-to-even on the binary64 significand. This specifies the local tie rule independent of the host rounding mode. Convert negative zero to positive zero.
4. If rounding produces B, carry one checked region and use local+0. If the carry exceeds U, return `CoordinateOverflow`; **do not clamp to the predecessor and do not choose nearest-in-domain saturation**. This explicitly rejects some mathematically in-domain points near the upper endpoint. Ordinary rounding at internal boundaries remains allowed.
5. Return canonical q/local. Re-normalizing a canonical accepted value is bit-identical (apart from mandated input−0 to+0). Exact equivalent decompositions of X yield identical output. Persisted malformed coordinates bypass this trusted-input conversion and are rejected, not repaired.

Examples: `(0,65536)`→`(1,+0)`; `(0,−1)`→`(−1,65535)`; `(0,−MIN_VALUE)` rounds to`(0,+0)` after borrow/carry; `(U,65536−2^-40)` **as an exact arithmetic intermediate**, not a pre-rounded literal, rejects because nearest-even carry would exceed U. The same exact residual at U−1 carries safely. At an internal tie between predecessor(B) and B, even B wins and carries. Interior isolated local rounding error is at most2^-38, but this is not a total input/transform error budget or permission to consume the0.25-point derived-geometry allowance.

Normalize before freezing an admitted semantic command body/fingerprint. Source actual samples become immutable canonical values once accepted; move/scale never re-normalize or rewrite them. Fingerprint domain/version must distinguish this contract from old global-coordinate semantics. Duplicate-command handling compares the frozen canonical semantic body while retaining the v2 operation identity/authority rules; no retry/replay approval follows from numerical equivalence alone. Exact byte encoding and version tag remain part of generated-contract review, not invented here.

## Typed failures, bounds and ownership

Keep v2 status/reason numbers0–18 unchanged. Proposed appended reason IDs for this amendment:19 `StaleMapping`,20 `MappingUnavailable`,21 `CoordinateOverflow`,22 `NumericalCapacity`,23 `InputSequence`,24 `DegenerateScale`,25 `NoncanonicalStoredCoordinate`. Unknown IDs are safe rejection. Source nonfinite/local malformed arguments use existing1 `InvalidArgument`; invalid document loading uses structured storage-validation context with reason25. Persisted malformed input never becomes an accepted stroke. New reasons map to typed en/uk resources, never parsed English or raw-coordinate logs.

Return Rejected for these immediate failures, zero newly allocated interaction/operation handles, and the coherent current document position; the existing interaction handle passed by the caller remains its identity even when that interaction was cancelled. Query status remains in `LfCopyResult`. Effects/presentation are separately reviewed; a reason code is not a new dialog design. Current-batch cancellation and stale-rejection distinctions above are observable through client state. Bound errors must not silently discard already completed pending work or receipts.

Retain approved counts: actual batch1–256, unfinished stroke at most65,536 samples and charged preview reserve, summaries128/call, stored samples4,096/call, and bounded dependencies/commands/receipts from [limits-v2](../architecture/limits-v2.md). Count×stride, offsets, accumulated samples and region arithmetic are checked before pointer arithmetic/allocation. Larger regional records consume existing byte budgets; counts are ceilings, not guaranteed capacity. Host-specific browser byte profiles and actual layout/overhead still need review; do not mechanically copy macOS allocation ceilings. C/Swift/Rust/Wasm layout/stride assertions must precede implementation acceptance.

Selected semantic limits remain width1–512, positive cumulative scale1/64–64 and zoom0.1–8. **No numeric maximum original stroke span, canvas extent or complete painted-bound admission envelope is supplied by this proposal.** Until those profiles and algorithms are reviewed, real coordinate-editing admission is not implementable as accepted product behavior; neither unlimited finite inputs nor arbitrary guessed caps are allowed. Empty-document identity/storage interfaces can proceed under their separate contracts.

All calls retain v2 runtime-owner thread, reentrancy, capability, handle-generation and authority checks. Borrow input buffers for the call only; copy validated input into bounded owned work before return/enqueue. No foreign pointer survives the call or crosses IPC. Queries write a complete revision-consistent result into caller buffers or write nothing; insufficient capacity/resync does not consume data. Sample0 remains in original data, not a redundant placement/source column. Preserve authenticated pending-work reconciliation before fresh Undo history after coordinator recovery.

## Evidence required and stopping condition

Existing [forward](../../quality/regional-arithmetic/README.md) and [inverse](../../quality/inverse-mapping/README.md) diagnostics establish selected arithmetic counterexamples only. Regional subtraction still lost2native points under large intermediate cancellation; ordinary inverse/forward round trips hid exact error at zoom0.1. Neither diagnostic candidate is adopted here. Production operation order, wider intermediates, clipping/culling, renderer conversion and cost need a reviewed implementation proposal and measurements.

Required validation assignment **S02-NUM-ADMISSION**: rust_engine and rendering_performance prepare one bounded candidate operation-order specification and exact-reference corpus; exercise both-axis original spans, placement and viewport cancellation, width/pressure, selected scale/zoom endpoints, boundary crossings and crossing segments; measure the actual proposed geometry/renderer path after separately authorized implementation. Deliver separate input-rounding and derived-geometry budgets, proposed finite admission bounds with rejection vectors, timing/allocation evidence and independent review. Stop at a consolidated numerical recommendation for owner disposition. Do not turn the largest passing fixture into a supported span or call the existing Node probes this task's completion. The selected0.25 native-point geometry criterion remains; no new tolerance is adopted here.

| ID / trace | Trigger and required invariant | Accountable owner / future evidence |
| --- | --- | --- |
| V4-01 / REG-PREC-01, REG-01 | Both-axis carry/borrow, subnormals,−0.1, ties, positive-zero, i64 boundaries; pre-round domain rejection and post-round carry rejection; canonical idempotence/equivalent decomposition | rust_engine; exact-reference/property and boundary vectors, including upper endpoint before/at/after rounding threshold |
| V4-02 / CT-04, REG-PREC-05 | Canvas/store types cannot substitute; min/max i64 through generated bindings; stride×count overflow, NULL/count rules, insufficient output, stale revision | Rust + host; generated compile/layout and adversarial boundary tests; browser/native parity separately |
| V4-03 / CT-02/03, INV-03/04 | Current invalid batch cancels whole preview; unrelated stale input does not; zero/257 count, reordered sample, changed duplicate body, pressure invalidity | rust_engine; before/after content/history/receipt equality and fresh-begin cases |
| V4-04 / REG-06/09, FOCUS-001 | Metrics remap/suspend cancels before new generation; stale metrics cannot cancel newer edit; unchanged metrics no cancel; restore requires fresh input; other client view unchanged | Rust + host; state-machine tests plus real resize/focus/orientation E2E later |
| V4-05 / REG-03/04, EDIT-MOVE/EDIT-SCALE-001 | Captured-base updates, repeated preview, opposite pivot, zero diagonal, crossed pivot, min/max scale, no-op, target ABA and stale commit | Rust + designer; semantic tests and reviewed gesture/visible results; preserve originals and one-operation Undo |
| V4-06 / REG-PREC-02/03/06 | Cancellation, exact inverse ratios, painted width/pressure, both-endpoints-outside segments; full transform/hit/render/export error envelope | Rust + rendering; exact vectors, actual renderer comparisons and measured supported envelope, not only point probes |
| V4-07 / CT-05/07/09, SEC-01/02/03/09 | Hostile stored locals reject, fingerprints versioned, replay/authority unchanged, no content/coordinates in logs, locale-independent semantics | Rust + independent reviewer; storage/boundary/receipt and redacted diagnostic tests |

All rows are **planned/unrun** for this proposal. Existing arithmetic evidence does not discharge their runtime invariants or SU-03/05/06/08/09/14 acceptance. Security delta is widened numeric and typed-input surface under existing SEC-01/02/03; no new privilege/transport. Exact bounds, generated layout/fingerprints, designer scale review, independent assessment and owner disposition must be recorded before implementing affected behavior. No native application, Rust/Wasm engine, schema migration or new dependency is produced by this document.
