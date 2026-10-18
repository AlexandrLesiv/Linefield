# S02 regional precision follow-up v1 — 2026-10-18

Status: **proposal for a later consolidated review; not owner-approved or implemented**. This packet converts the arithmetic evidence into concrete engineering work. It does not reopen selected RC1–RC11, modify approved schema source, select a stroke span, or replace the historical v2 ABI with an unreviewed declaration. Lead owns integration; rust_engine reviews numerical semantics; independent reviewer checks scope and evidence.

## Evidence and its practical consequence

The [exact-reference diagnostic](../../quality/regional-arithmetic/README.md) covers162 one-axis synthetic observations. Independent rational calculation agreed with all exact error classifications. Node arithmetic is not Rust/Wasm/Skia parity, and point arithmetic is not painted geometry.

| Observation | Consequence for the next contract |
| --- | --- |
| Quarter-unit displacement at a near-maximum i64 region survives relative integer subtraction but disappears after absolute Number flattening | Preserve exact region addresses across all adapters and perform relative work before narrowing; the prohibition on flattening remains essential |
| A2^52-unit relative term plus0.25 loses the fraction before cancellation with−2^52; at zoom8 the error is2native points | Relative representation alone is insufficient. Admit only a measured complete transform/render path; no supported span follows from these samples |
| Opposite valid i64 addresses differ by2^64−1 | Define checked wider intermediate arithmetic separately from valid stored-address range; do not reject or overflow merely because signed64 subtraction was used |
| Normalizing local−2^-1074 requires previous-region local65536−2^-1074, which lies between adjacent binary64 values | Specify trusted-input rounding/rejection before acceptance. Never persist local65536 or silently rewrite an already accepted sample |

The0.25 native-point requirement applies to derived visible geometry after zoom. It is not an input-coordinate rounding budget and must not be used to justify arbitrary changes to original accepted samples. Storage canonicality, input conversion, geometry approximation and renderer conversion need separate postconditions.

## Normalization issue to resolve explicitly

Already selected: finite binary64 local components in[0,65536), exact signed64 regions, positive zero, shared Rust authority and rejection of nonfinite/address overflow. Persisted malformed values are rejected rather than silently repaired. Original accepted samples remain immutable under transforms.

The unresolved case concerns a finite **trusted command/mapping intermediate before acceptance**, not a valid stored sample. Three possible contracts have different consequences:

| Option under review | Benefit | Cost or required evidence |
| --- | --- | --- |
| Reject whenever the exact normalized position has no representable canonical local | Simple exact representability condition; no hidden numerical adjustment | Even binary64 local−0.1 has an exact borrowed residue that cannot fit binary64. Ordinary boundary crossings can reject; measure input/UX effects |
| Round the exact position to an explicitly defined nearest canonical regional position before acceptance, including carry if the nearest point is across the boundary | Can preserve continuity for tiny crossings | Requires a reviewed rounding/tie rule and error budget distinct from derived-geometry tolerance; prove carry, extremes and determinism. Do not merely clamp the rounded local to the interval |
| Round toward a prescribed side when selecting a canonical point | Can avoid an upper-bound local residual | Directional bias and potentially larger error; idempotence and equivalence need proof. No demonstrated advantage yet |

No option is adopted here. rust_engine recommends nearest-canonical rounding as the next diagnostic candidate, not as approved behavior. A proposal must state how an accepted sample is obtained before acceptance/fingerprinting, then preserve those accepted bytes. It must distinguish input rounding from data corruption repair, invalid persisted values, address overflow and numerical-capacity rejection. Check exact mathematical address-domain membership before rounding as well as the final address; rounding must not hide overflow. Existing atomic interaction rules govern rejection effects; do not add partial strokes, queued edits or a new failure UI implicitly. Changing stored representation or adding remainder columns is outside this follow-up and would reopen selected schema/ABI decisions.

Test normalization idempotence and equivalent decompositions, including their canonical fingerprint inputs. The largest local spacing immediately below65536 is2^-37; half-spacing2^-38 is an analytical check for an isolated nearest-rounding step only where both bracketing canonical positions have valid addresses. It is not a total error budget or supported-span guarantee.

At the maximum i64 region, the next-region boundary is invalid. An exact intermediate local65536−2^-40 is inside the mathematical regional interval, but the nearest valid binary64 local65536−2^-37 differs by7×2^-40, exceeding2^-38. Therefore upper-domain endpoint behavior needs explicit evidence and policy: nearest-in-domain versus rejection of an otherwise rounded carry is still unselected. Do not silently clamp, promise the interior half-spacing bound at that endpoint, or let rounding conceal a truly out-of-domain input.

## Anchored transform work

Keep displayed=placement+scale*(original−source), source=first actual original sample, original samples unchanged, updates derived from captured gesture base and opposite-corner pivot behavior. The source anchor is not the gesture pivot.

Next experiment should compare a precisely specified candidate evaluation order against the existing exact oracle, including cancellation before any final narrowing. Do not call compensated arithmetic, wider intermediates or viewport clipping a solution until the actual candidate is measured. Include identity scale, nearby and far placement, both signs, carry/borrow, min/max scale and zoom, and repeated preview from the same base. A successful point result does not certify full painted bounds, clipping/culling or stroke-span admission.

Forward point expressions with supplied binary64 multipliers fit the current dyadic oracle. Inverse canvas mapping divides by zoom; division by the binary64 value0.1 generally produces a non-dyadic rational. A mapping/scale-derivation extension therefore needs an exact rational reference, or an explicitly identified prior binary64 rounding boundary. Do not reuse the current oracle as proof of inverse-mapping accuracy.

## Historical ABI amendment checklist

The following describes affected locations for a **new versioned proposal**, not permission to edit or implement the approved v2 ABI verbatim:

| Existing v2 surface | Required reconciliation with selected regional direction |
| --- | --- |
| native-v2.md LfActualSample.x/y reused for input and sample queries | Separate canvas-local input samples from canonical stored regional sample queries; preserve ordered actual metadata and pressure semantics |
| LfCanvasMapping.center_x/center_y and host-provided mapping | Keep host canvas metrics/input orientation distinct from Rust-owned canonical viewport center and accepted mapping generation |
| lf_selection_select_at and stroke begin/append | Make canvas/world type distinction explicit, preserve client/session/mapping identity and atomic batch validation |
| LfTranslation/LfScale passed to move/scale updates | Selected intents carry start/current canvas points plus interaction/sequence/mapping identity; Rust captures base and computes authoritative transform; corner remains identified at scale begin |
| native-v2-queries.md LfStrokeSummary.translation_x/y | Represent canonical placement anchor plus scale and original sample0 anchor derivation; preserve query revision/target tokens and caller-owned bounds |
| Web/native marshaling and sizes | Preserve i64 exactly; document generated layouts, alignment, ownership and per-record budget impact. No raw pointers across IPC or generic serialized command protocol |

The replacement proposal must preserve authority, stale-generation/target rejection, client-scoped interaction/history and bounded copying. This checklist does not choose exact field layouts/signatures, thread topology, new numeric reason codes or adapter protocols. [Historical commands](../interfaces/native-v2.md) and [queries](../interfaces/native-v2-queries.md) remain historical approval evidence.

## Required next evidence and stop condition

| Scenario | Required evidence before a numerical contract can be accepted |
| --- | --- |
| REG-PREC-01 / REG-01 | Exact normalization vectors around0/65536, subnormals,−0.1, ties, negative zero, carry/borrow and i64 extremes; domain checks, idempotence/equivalent decompositions, fingerprint inputs, explicit rounding/rejection outcome, trusted versus persisted distinction |
| REG-PREC-02 / REG-03/04 | Candidate anchored arithmetic versus exact oracle, identity/translation/cancellation, both axes and selected scale/zoom; original input unchanged |
| REG-PREC-03 / REG-04/05 | Painted widths/pressure and scaled bounds, viewport-crossing segments with both endpoints outside, clipping/culling and render/hit/export agreement |
| REG-PREC-04 / REG-01/03 | Proposed admission boundary values, rejected updates leave prior committed state and receipts/history unchanged; cancellation and stale callbacks tested through actual shared semantics later |
| REG-PREC-05 / CT-04/06 | Matching Rust/native/Wasm vectors and generated-declaration compile/layout tests after exact ABI and implementation authorization; real host mapping/orientation separately |
| REG-PREC-06 / REG-09 | Forward/inverse canvas mapping against an exact rational reference at selected zoom endpoints and non-power-of-two scale factors; identify any intentional prior rounding |

Map to CT-02/03/04/06, INV-02/03/04/08/11 and SU-03/05/06/08 as future obligations, not passed acceptance. No additional executable experiment is part of this documentation slice. Produce one identified numerical/ABI review packet with evidence and conditions; no preference micro-question batch or task-file-based implementation approval. Native/browser/renderer and complete supported-span evidence remain open.
