# P05-R08 Gate 0 — numerical proof and typed boundary

Current owner-approved R4 contract refinement. Independent Gate0 design review passed on
2026-10-20 at packet SHA256
`3b5efd7093ac7b3f928b8ee1fb1dc0759962d4cad83a99e3910ae6d89e5718e1`.
Implementation arithmetic, generated declarations, runtime parity and performance remain unverified.

2026-10-20. Prepared by the sole implementation writer for independent review BEFORE kernel implementation. Base `6c1fd32c343de1294da1b8ffc7693415b03ffd1a`, worktree `/Users/oleksandr/projects/linefield/.worktrees/p05-r08-contour-compaction`. This is a proof/contract packet, not implemented or passing evidence. Owner-approved R4 is the scope authority. No canonical simplification, retired retained contours, new coverage rule or changed tolerance.

## Inspected authoritative sources

- `crates/editor-engine/src/geometry/{primitives.rs,page.rs,mod.rs}`: original six-verb disc / five-verb quad encoding, source offsets, current page lookup/culling and emission.
- `crates/editor-engine/src/{ink.rs,drawing.rs,history.rs,model.rs,lifecycle.rs,settings.rs}`: append-only samples, unique stroke IDs, End relocation, visible-prefix history, owner/session state and width limit.
- `crates/editor-engine/src/numerics/{projection.rs,rotation.rs}` and `view_steps.rs`: projected center envelope, finite rotation table and zoom limit.
- `crates/editor-engine/src/render_target.rs`: frozen target projection and adoption/compatibility rules.
- `apps/web/wasm/src/{boundary.rs,scene.rs,render_queries.rs,scene_state.rs,snapshots.rs,lib.rs}`: generated checked wrappers, one live result, owned arrays and existing status vocabulary.
- `tasks/P05-R08.md`, approved external R4 plan, `AGENTS.md`, `tasks/README.md`, `docs/{objectives,contracts,quality}.md`: authority and acceptance dependencies.

The ordinary quad winding is positive: horizontal +x/equal radius yields normals `[0,-1,0,+1]` and vertices previous-top/current-top/current-bottom/previous-bottom. Disc right/down/left/up has the same signed orientation. This example is not the eligibility proof; actual projected bits are checked.

## A. Supported contours and global eligibility

All comparisons below interpret each finite binary32 value exactly. Arithmetic equality treats signed zeros as equal; duplicate equality still compares their original bits. NaN/infinity, malformed verb/array arity or unsupported weight are Invalid input, not proof failure. Valid original geometry outside the supported convex template returns OriginalRequired; it is never repaired or reversed.

Disc recognition requires exactly verbs `[0,2,2,2,2,3]`, eighteen point scalars and four weights with the exact binary32 `FRAC_1_SQRT_2` bits. Extract `L,Cx,R,U,Cy,D` and check strict `L<Cx<R`, `U<Cy<D`; every repeated coordinate must match this full sequence:
`(R,Cy); (R,D),(Cx,D); (L,D),(L,Cy); (L,U),(Cx,U); (R,U),(R,Cy)`.
No arbitrary conic path matching only the verb pattern is eligible.

Each quadrant is an orientation-preserving positive diagonal affine image (possibly rotated by a cardinal step) of the rational quadratic with endpoints `(1,0),(0,1)`, control `(1,1)`, and weights `(1,w,1)`, where `0<w<1`. Its denominator `D(t)=(1-t)^2+2w t(1-t)+t^2` is strictly positive on `[0,1]`. Its tangent rotates positively: for a rational quadratic with these endpoint weights, the signed curvature numerator is `4w cross(P1-P0,P2-P0)/D(t)^3`, positive for this noncollinear triple. Coordinate monotonicity in the quadrant follows by differentiating the same positive-denominator expression. End tangents lie on the adjoining cardinal directions. Thus the four disjoint quadrant arcs form a simple strictly convex positive-oriented boundary, contain `(Cx,Cy)` strictly inside, and have winding 1 inside / 0 outside. This reasoning allows unequal rounded left/right and upper/lower radii and does not assume an exact circle.

Quad recognition requires exactly `[0,1,1,1,3]`, eight point scalars, no weights, four nonzero edges, and four strictly positive exact determinants `orient(Pi,P(i+1),P(i+2))`. For four vertices these conditions exclude a crossing and certify a simple strictly convex positive-oriented quadrilateral. A zero or negative determinant is unsupported, including a collapsed tangent quad: OriginalRequired for the whole captured prefix, not local KEEP.

Every original contour in a prefix must pass eligibility before that prefix is publishable as compacted. Processing may build a private candidate incrementally, but late eligibility failure discards all omissions for that stroke/mapping epoch. Re-query the same valid capture from zero and rebuild the ORIGINAL path; if capture is stale, abandon it and request current authoritative work. The compaction state stays disabled for that epoch. A new append can invalidate previously certified omission policy if its new contour is ineligible, so it follows this same reconstruction rule. Earlier already-published prefixes remain valid images of their exact old prefixes; they cannot be acknowledged as the new prefix.

## B. Coverage-preserving removal

For eligible contours the nonzero winding fill is their set union: the sum of nonnegative individual windings is nonzero exactly where at least one contour contributes. Remove a contour only when its entire filled set is a subset of the union of retained contours. The proof is about filled sets, not just boundaries.

Duplicates: bounded hash lookup, then exact complete original encoding comparison, including all verbs, point bits and weight bits. A match to a retained contour proves identical filled sets. No hash-only acceptance, quantization or approximate equality.

Retained quad inner polygon: its four original vertices. Retained disc inner polygon: four cardinal endpoints initially; the optional stronger fixed polygon has sixteen ordered boundary vertices obtained from two levels of exact homogeneous subdivision per quadrant. Every vertex is an exact point on the represented curve, so convexity puts the entire inscribed polygon inside the contour. Use one reviewed sixteen-vertex profile, not runtime accuracy tuning.

Candidate quad outer polygon: its original four vertices. Candidate disc outer pieces: for every quadrant arc, use the convex hull of the certified interior point C and that arc's three rational control points. A positive-weight rational Bézier arc lies in the Euclidean convex hull of its controls. Therefore every segment from C to a point on that arc lies inside this enlarged hull. Convexity/star-shapedness gives a gap-free cover of the entire disc by the four filled sectors.

An outer piece passes when ALL its (at most four) vertices lie inside ONE retained inner polygon, tested against every oriented edge with exact determinant sign >=0. Convexity then contains the entire hull. Different pieces may use different retained contours, but no convex hull across multiple witnesses is permitted. This prevents an enclosing ring from incorrectly certifying an uncovered central hole.

If a piece fails, subdivide its rational quadratic at exactly t=1/2 in homogeneous coordinates, retain C in each child's outer hull, and test children. The child sectors partition the parent's arc parameter interval and their union covers the same filled sector. No radial subdivision, curve intersections or new output curves are used. Depth at most8; a DFS stack holds at most depth+1 pending siblings. Every leaf must obtain a certificate. Any unresolved leaf/work exhaustion => KEEP original incoming contour.

A quad has no arc to subdivide. If its full four-vertex hull cannot fit inside one retained inner polygon within the candidate budget, KEEP it.

Forward-only induction: retain the first contour; every later omission has a complete certificate using currently retained contours; none of those contours is ever retired. Evicting an optional lookup/certificate entry does not remove its draw contour. Thus the original and selected unions stay identical for every successfully certified prefix. No witness dependency graph is needed.

This does NOT prove identical raster pixels. Skia can depend on contour inventory in its AA processing. Exact independent CPU/submitted RGBA comparison remains mandatory; any mismatch stops this candidate.

## C. Exact arithmetic capacity

The engine bounds projected SAMPLE CENTERS to abs<2^22. Disc and quad controls additionally include radius/normal offsets; treating the center bound as a control bound would wrongly reject valid geometry.

Width<=512 gives radius<=256; zoom<=8 gives projected radius<=2048. Hull construction normalizes a vector whose maximum absolute component is1. Its squared norm is in[1,2] (with finite binary64 roundoff); dividing the bounded components by its square root gives magnitudes<=1. Conservatively allow <=2. Both clamped a and computed b have magnitude<=1, so each unrotated normal component is <=4 plus binary64 rounding; conservatively <=8. The table rotation coefficients have magnitude<=1, so rotated normal components are <=16 plus rounding; conservatively <=32. The largest offset is then <=65536 with conservative roundoff slack; a further factor2 still leaves center+offset+binary32 rounding strictly below2^23. Disc offsets are smaller. Check final input point abs<2^23 defensively; unexpected larger input requires OriginalRequired, never a guessed sign. Existing engine NumericalCapacity on failed sample-center projection remains a typed rendering failure.

Every finite f32 coordinate is exactly an integer times2^-149, including subnormals. The accepted fixed f32 weight is `m*2^-24`, `0<m<2^24`. Initial homogeneous controls `(w*x,w*y,w)` and endpoints/interior point `(x,y,1)` are exact at common quantum2^-173.

At midpoint subdivision, one averaging layer adds one denominator bit, and a quadratic split uses two averaging layers. At depth8, a common quantum is2^-(173+16)=2^-189. Store all homogeneous values at that scale from the start. The initial low16 zero bits guarantee exact right shifts through at most16 averaging layers. Inner-polygon points require only depth2. No dehomogenization/division to float occurs.

Each homogeneous coordinate is a convex combination of initial homogeneous controls, hence |X|,|Y|<2^23 and 0<W<=1 in physical units. After the common lift every integer component has magnitude<2^212. Signed summation for an averaging layer has magnitude<2^213, then exact division by2 restores the bound.

For homogeneous points A,B,C with positive W, Euclidean orientation has the sign of the determinant of their 3x3 homogeneous rows, because multiplying by WA*WB*WC is positive. Evaluate determinant as six signed triple products. Each product is <2^636; the sum of magnitudes is <6*2^636<2^639. Pair products (<2^424), triple products, additions and signed subtraction intermediates all fit checked signed-magnitude twelve-u64 storage (768 magnitude bits), with >=129 bits headroom. Sign is stored separately; zero is canonical positive. Integer decoding shifts and midpoint adds are checked too. No unchecked wrapping or heap bigint.

Each exact product uses bounded twelve-limb schoolbook multiplication with u128 multiply/add carries, checking discarded high limbs and final carry. Six-term determinant accumulation is checked signed addition. A runtime overflow during eligibility => OriginalRequired; during a containment attempt => inconclusive KEEP. Neither can authorize removal. This finite-operation recipe is subject to independent implementation review; no completed arithmetic test claim is made here.

## D. Fixed work and memory

- Per source contour: <=256 exact predicate evaluations, including eligibility and containment. <=16 retained cover candidates, depth<=8. Predicates are fixed-limb determinants/edge tests; duplicate equality is a separate explicitly bounded operation.
- One Step: <=16 predicates OR one bounded duplicate lookup/emission operation. Persist resumable counters and exact DFS progress between steps. Budget exhaustion retains the contour unless eligibility is incomplete, which returns OriginalRequired.
- Duplicate lookup: <=16 complete-contour byte comparisons, each at most94 bytes for the recognized disc. Fixed-capacity buckets; collisions beyond limit reduce compaction. No full-table scan or rehash.
- Spatial lookup: <=256 node visits and <=16 candidate results. Incomplete search may still use independently verified candidates but cannot claim a certificate without covering all pieces. No index presence/absence alone proves redundancy.
- Feed: <=32 complete contours AND<=4KiB total verb/point/weight payload, validated completely and atomically before acceptance. Bounds checked before allocation/copy; no unbounded incoming typed-array conversion. Source engine pages stay<=4096verbs; host may slice only complete serialized contours into these smaller feeds. That is transport framing, not geometry policy.
- Wasm ingress accepts these arrays as JsValue with generated unchecked_param_type annotations, NOT automatic wasm-bindgen slice/Vec conversions. Reuse the captured-intrinsic inspection/copy pattern in `apps/web/wasm/src/arrays.rs`: verify intrinsic typed-array tag, ordinary non-resizable ArrayBuffer, non-detached buffer and bounded intrinsic lengths; checked byte arithmetic enforces4KiB before copying into bounded Rust scratch. Reject proxies, shared/resizable/detached backing, wrong types and oversized arrays without reading caller getters/iterators or allocating from their alleged length.
- Index maintenance/release: <=32 entries per work step. Fixed segmented allocation; no synchronous unbounded Vec/HashMap rebuild or final mass destructor. Full disposal drains in bounded steps before the small final release. A worker termination is a failure/recovery operation, not an unmeasured successful-cache-eviction path.
- Optional index/certificate/original comparison bytes, allocation capacities and transition storage: aggregate<=16MiB per worker across strokes. Dropped entries only reduce possible elision. Use fallible reservations; failure disables optional indexing or produces explicit Capacity when required bounded buffers cannot be made.
- Two credited transport buffers total<=512KiB, plus one Rust input and one output page<=256KiB each, plus fixed predicate/DFS workspace. Actual Feed is smaller; upper transport allowance is unchanged. Do not keep a second complete original stream. Drain selected original contours into CanvasKit and reuse scratch.
- All Rust, transport, allocation, parser, builder, snapshot, final fill and cleanup operations are timed/accounted. 4ms target/8ms guard/5s watchdog are unchanged. Count limits are not timing evidence.
- The5s preparation-stage deadline spans the whole captured prefix, including every cooperative Step, Feed, yield and drain. Progress messages do not reset it. A later prefix starts its own explicit stage; repeatedly replacing the current requested target cannot silently reset the deadline for the same work.

## E. Concrete typed source boundary

Use existing checked JsValue→u64 validation and generated declarations. All identifiers are bigint; no number→u64 coercion. Owner/session validation occurs before capture lookup; counters never wrap. One result wrapper live at a time, owned take-once typed arrays and explicit free follow the existing adapter. Captures are independent metadata handles, not live result wrappers or borrowed Rust pointers.

Generated query names and parameter types:

- `memoryCaptureActivePrefix(owner:bigint, session:bigint, mapping:bigint, stroke:bigint): PrefixCapture`
- `memoryCaptureVisiblePrefix(owner:bigint, session:bigint, mapping:bigint, indexHint:bigint, stroke:bigint): PrefixCapture`
- `memoryCaptureTargetPrefix(owner:bigint, session:bigint, target:bigint, indexHint:bigint, stroke:bigint): PrefixCapture`
- `memoryStrokePrefixPage(owner:bigint, session:bigint, capture:bigint, sourceOffset:bigint): PrefixPage`
- `memoryReleaseStrokePrefix(owner:bigint, session:bigint, capture:bigint): Reply`

`PrefixCapture` readonly fields: existing code/state fields; capture,stroke,samples,verbs,projectionId bigint; projectionKind `"current"|"target"`; culled boolean; red/green/blue number; frozen view/metrics scalar getters matching existing Mapping/State conventions. `samples/verbs` are captured source endpoints, not compacted sizes. `PrefixPage` adds capture, sourceStart, sourceEnd, next, done, culled and owns original verbs Uint8Array, points Float32Array, weights Float32Array. `next=0` on done remains a sentinel; sourceEnd carries actual progress. Non-final pages end only on complete contour boundaries, <=4096verbs. Offset==captured verb end returns an empty done page; malformed source offset returns Invalid. Culled pages are empty done with sourceEnd=captured verb end, but do not establish winding eligibility for skipped geometry.

At most one engine-side capture. A successful new capture replaces/revokes the old one atomically after validation; failure leaves the old one intact. Store frozen view, metrics, color, prefix min/max, sample/verb endpoints, projection kind/id, and `Active(stroke)` or `Committed(index,stroke)` locator. O(1) source locator validation checks index<visible and exact ID; no stable raw pointer and no linear ID search in each page. Prefix offset lookup may use existing bounded logarithmic sample partition. Generation/counter exhaustion returns Exhausted without mutation.

Capture of an active stroke is O(1) metadata, never sample cloning. Page emission stops at captured sample/verb end and uses frozen prefix bounds for culling, not bounds enlarged by later Append. Earlier canonical samples/offsets/hull flags never mutate. A suffix query validates its actual sample/disc-or-quad boundary in Rust. Capacity failure is rendering-only, not a cancellation of accepted input.

End relocates a captured active source to its new committed index while preserving capture ID and original endpoint; it does not extend the capture to the release tail. New current-view committed capture obtains the full final endpoint even while B is active. Begin/Append/Cancel of unrelated B preserves compatible current-view capture A. Successful Undo/Redo permanently revoke captures even if a later Redo would restore the same ID. Cancel of captured active source, mapping/suspension/session disposal, source truncation/removal, or explicit release permanently revoke. Repeated release of a previously issued ID is Noop; it must never revoke a newer capture.

Target-bound captures additionally depend on existing target compatibility; ordinary held-pan updates preserve their frozen projection. Explicit target replacement/release/adoption, Begin admission, content change, zoom/rotation/surface change, keyboard pan or suspension permanently revoke that capture. Eager mutation hooks prevent a target capture from becoming valid again after Begin→Cancel or Undo→Redo. Current-view captures use exact mapping identity and cannot silently become target-bound.

An already copied page is immutable data, but its capture validity is not display authority. Host completion still passes current Rust content/mapping/scene/coverage and receipt validation. A revoked capture may be disposed, never displayed merely because geometry work finished.

## F. Concrete pure preparation boundary

Separate pure Rust library and Wasm adapter: no dependency on editor Engine or commands; one instance in the existing render worker. No editor constructor, canonical storage, threads, storage/network API or second CanvasKit instance. A generated checked `PreparationIdentity` value constructor carries workerEpoch,owner,session,stroke,capture,projectionKind,projectionId,samples,verbs as typed scalars and algorithmVersion=1. This copied identity is correlation, not a command capability.

For that constructor, projectionKind is the bounded numeric tag0=current/1=target and algorithmVersion is the checked numeric literal1, both accepted internally as JsValue and validated before conversion. No arbitrary caller string is copied or parsed; source result string tags are translated by the host through a two-case literal mapping. All bigint fields likewise remain JsValue until existing exact-u64 checks pass. Generated declarations show `projectionKind: 0 | 1` and `algorithmVersion: 1`.

Generated operations:

- `prepareCreate(identity:PreparationIdentity): PreparationReply`
- `prepareBeginNextPrefix(handle:bigint, identity:PreparationIdentity): PreparationReply`
- `prepareFeed(handle:bigint, capture:bigint, sourceStart:bigint, sourceEnd:bigint, final:boolean, verbs:Uint8Array, points:Float32Array, weights:Float32Array): PreparationReply`
- `prepareStep(handle:bigint): PreparationReply`
- `prepareDrain(handle:bigint, outputCursor:bigint): PreparedPage`
- `prepareRelease(handle:bigint): PreparationReply`

Reply readonly fields: status `"accepted"|"pending"|"complete"|"original-required"|"released"|"stale"|"invalid"|"capacity"|"exhausted"`; handle,capture,sourceCursor,outputCursor,outputGeneration bigint; plus bounded counters for proof attempts/KEEP causes and owned-byte accounting. PreparedPage carries status, capture, sourcePrefix, outputGeneration, start/next output cursors, done and take-once owned original arrays. No raw memory lease; no partially initialized output.

One active preparation job, retained certified prefix and bounded pending input/output. Feed rejects until prior accepted input is consumed; it performs full arity/length/finite/fixed-weight/cursor validation within its32-contour/4KiB limit. All source span lengths equal summed original verb counts; final requires sourceEnd==identity.verbs. Invalid/Capacity Feed preserves prior state/cursors. Step cannot publish output from a rejected page. Supported shape/positive-winding checks occur in bounded Step work and may return OriginalRequired, which invalidates previously emitted compacted output for this new prefix.

Drain accepts only the exact output cursor, copies complete original contours, and frees drained scratch. Zero-output progress is explicit through sourceCursor; omissions must not stall source advancement. A prefix is complete only after all original input has been eligibility-certified or the job has switched to original-required; a complete flag never means an unfinished pending output was implicitly presented. BeginNextPrefix requires prior prefix fully processed and output drained, same worker/owner/session/stroke/projection kind+ID/algorithm, monotone captured sample/verb endpoints, and a valid authoritative source suffix. It preserves witnesses and CanvasKit builder. Host increments publication/request generation separately. Equal endpoints are permitted as a no-geometry-change capture transition. Lost state/incompatible identity resets cold.

If an old prefix was culled, no winding proof exists for it. Culled→eligible or any transition requiring previously unqueried source resets cold and queries from zero; never certify it using only the newly appended suffix. Remaining culled prefixes require no compaction job and still advance captured source accounting. The page and compactor output counters are never substituted for source offsets.

Release starts bounded cleanup and returns pending until exhausted, then released; repeated release after completion is harmless, all other later calls stale. Module/worker epoch changes invalidate all handles; no wrap/reuse can revive an old one. Worker loss preserves the sole editor and triggers authoritative reconstruction through existing localized failure/retry. Wasm trap/JS allocation failure cannot become accepted completion.

## G. Required finite scenarios and disposition

All rows owned by rust_engine implementation with independent review; browser-hosted E2E/fixture evidence, not native physical-input or unit-test evidence. CT-02/03/04/06/08; INV-01–04/08/09/11; SU-03/04/13/14/16/20; SEC-02/03/09/13.

| Case | Trigger/state | Required outcome/invariant |
| --- | --- | --- |
| R08-01-global | Eligible omitted duplicate, then degenerate/opposite/unsupported contour | OriginalRequired; complete original reconstruction; no partial/current acknowledgement |
| R08-01-area | Ring witnesses cover boundary but leave center uncovered | KEEP; all filled-sector pieces required |
| R08-01-thin | Min width/pressure,10% zoom,DPR1; near tangent/crescent; rotated rounded geometry | Exact CPU/submitted parity and known ink; no epsilon/grid loss |
| R08-01-bounds | Coordinate controls near center envelope, subnormal values, fixed depth8, malformed weight | Valid finite values processed within proven bound or conservative OriginalRequired; malformed input Invalid; no wrong determinant sign |
| R08-03-tail | Capture A atN, append releaseN+1, End A, Begin B, Cancel B | Old capture staysN; recapture committed A includesN+1; final completed base retained |
| R08-03-prefix | CaptureN, continue Append during paged read; compatible next prefix | First page stream endsN; next only suffix; no mixed prefix or full rebuild per ordinary frame |
| R08-04-revoke | Undo→Redo, captured Cancel→new Begin, resize, session leave/reenter | Old capture cannot revive; canonical completed history preserved |
| R08-04-pan | Target capture, repeated held-pan updates, replacement/adoption; then keyboard pan | Correct frozen target query rules; publish only current Rust-authorized image; keyboard invalidation preserved |
| R08-04-cull | Culled prefix followed by eligible extension | Explicit source progress; cold full-prefix rebuild/certification |
| R08-05-hostile | Forged IDs, duplicate/gapped/feed, malformed/oversized/shared/resizable/detached/proxied array, outstanding input, cursor overflow | Atomic Invalid/Stale/Capacity before unbounded ingress allocation; no prior-state mutation or partial output |
| R08-05-resource |16MiB budget/index collision/work exhaustion/worker loss | KEEP or explicit failed job; bounded cleanup; no lost accepted samples/history |
| R08-05-publication | Stale/failed receipt after completed render | No current-image acknowledgement; preserve coherent prior image; no post-ACK rollback |

Gate 0 requests independent disposition on A–F and these finite cases before kernel code. Mathematical union proof and capacity proof do not substitute for exact raster comparison or measured deadlines.
