# M03 independent live coverage and completed-prefix handoff

Current MIG-C1 companion, 2026-10-22. Under decision243 the lead adopts this specialist-reviewed
contract. It replaces candidate/live exclusion and the ActivePages replay dependency for fresh
ink. This is implementation authority within M03, not a passing result or owner merge approval.
Rust owns source/order/anchor certificates; the host owns disposable pixels and GPU validation.

## Authority and generated boundary

Frame receipts have distinct Prefix, LiveSource and DisplayOnly authority. Retain immutable
view/metrics/mapping/source fields. LiveSource additionally stores one source ID and its document
ordinal; it never owns a canonical sample copy. DisplayOnly carries a diagnostic completed
cutoff and content=0, even if its pixels contain only part of an older stroke.

| Kind | Permitted use | Rejected use |
| --- | --- | --- |
| Prefix | Ordered completed-source preparation, append, validated completed image | Current active-source authority |
| LiveSource | Matching live stable/tail preparation and raster transform | Prefix append, completed readiness or inclusion |
| DisplayOnly | Same-session historical raster transform | Geometry, source adoption, append, ready/presented |

Generic release remains idempotent. Ordinary strict frame validation checks Prefix first.
Display transforms accept retained same-session anchors at current request mapping and unchanged
metrics, without certifying current source. Live preparation has a distinct internal validator;
never relax all frame validation to admit arbitrary historical anchors.

Use generated Rust/Wasm wrappers and existing checked IDs, copy/free-before-next-export rules.
IDs/counts remain u64/bigint, optional absent receipt IDs alone use zero. No raw pointers,
handwritten duplicate DTOs, caller-supplied cutoff/view, JSON protocol or second editor owner.

`memoryCurrentCoverage(owner,session,mapping,liveAnchor,installedPrefix,candidatePrefix)` returns:

- code; completedCount/Through/Content; activeSource/Count; viewGestureActive/canFold;
- liveState (none, active, ended, obsolete, included), liveSource/Count; installedValid;
- candidateValid/Count/Through; nextSource/Count; candidateAtCutoff, candidateContentCurrent,
  candidateViewCurrent, candidateMappingCurrent, candidateRecaptureSafe, candidateExactView,
  candidateIncludesLive.

The query reads visible, active and directly indexed first/last/next/source-at-ordinal entries;
receipt lookup visits at most eight slots. No scene_list, document.stroke search, sample walk,
full resource sum, receipt allocation or model/history/revision mutation. Snapshot-wrapper
allocation is bounded and separately accounted. Wrong owner/session/mapping rejects the query.
Wrong receipt kind is Invalid; unknown candidate/installed ID is StaleScene. Absent/released/
invalidated live anchor is obsolete (zero is none), never a new source inferred from a count.

Active ID equality classifies active; otherwise exact source ID at stored ordinal below visible
classifies ended. Included additionally requires a valid installed Prefix covering that ordinal.
The host passes an actually installed GPU-validated Prefix or zero, never an unfinished candidate.
Candidate validity proves exact current branch membership. Its next source is only
strokes[candidate.count] when that count is below visible; active is never next. At-cutoff also
requires exact last identity. CandidateIncludesLive proves an ended live ordinal is covered by
the candidate; it supplies painter order, not permission to discard masks outside its raster.

Candidate content, exact view/metrics and mapping are checked separately. RecaptureSafe requires
a valid exact current completed prefix and identical view/metrics in Ready, but may have old
content/mapping. ExactView additionally requires current content and mapping. Neither fact
asserts GPU completion. The source-equivalence rule is limited to M03 immutable completed
strokes and must be extended before M06 edits; JS may not infer it from counts or cache keys.

ViewGestureActive is the Rust fact for the implemented pan/rotate interaction, distinct from
an active stroke. CanFold requires Ready/current metrics and no view gesture; it promises neither
GPU availability nor source completeness. Future tools extend this shared classification.

`memoryLiveFrameCapture(owner,session,mapping,expectedSource)` returns
code/frameId/source/sourceCount/ordinal/frameMapping. Require Ready/current metrics and
nonzero expectedSource equal to the active source admitted by Begin. Capture the current view,
not the old displayed image's view. Validate all preconditions/ID/capacity arithmetic before
allocating one LiveSource receipt. Wrong source does not cancel unrelated active input.

`memoryDisplayFrameCapture(owner,session,mapping)` returns
code/frameId/cutoffCount/cutoffThrough/frameMapping. Require Ready/current mapping/metrics and
reject active pan/rotate with Active before allocation. Capture DisplayOnly for a fold at that
exact anchor. Release an unused capture; never replace display metadata without issuing its fold.
Coalesce End events into eligible rendering work rather than capture inside input callbacks.

Existing memoryFrameCapture creates Prefix. memoryFrameAppend accepts only a valid Prefix and
exact next completed source at its count. It allocates an immutable successor count+1, retaining
view/metrics/mapping; content is current only at the current completed cutoff, otherwise zero.
Do not mutate the predecessor, skip/reorder/repeat a group or append active source. All existing
preparation/adoption/placement/tail/release boundaries retain their numerical and lifetime checks.

## Lifetime and bounded state

Explicit stroke cancellation, malformed-current Append/End cancellation, accepted Undo/Redo,
branch removal, actual metrics changes, suspension and Leave/dispose permanently invalidate
applicable live anchors and child tails/tickets/pages in bounded slot work. Redo cannot revive
an old live ID. Append and End preserve the same valid source. Cancel E preserves completed
C/D. Cancelling a view gesture restores its base view without invalidating the completed C
anchor retained before it. Wrong identities cannot cancel unrelated input; no-op commands do
not invent invalidation. Fatal host state permits no editor export, including cleanup/getters.

Keep combined frame and tail receipts at most eight at every allocator, with at most two tails.
Prefer eight fixed optional frame slots (each complete Option at most256 bytes) and two fixed
tail slots (each at most512 bytes including its enlarged copied anchor). Charge actual size,
at most3072 Rust bytes, once. A bounded Vec alternative must prove actual capacity at most8 and
the same total; len alone is insufficient. No sample blocks, page lists or canonical clones.
New host fixed role/scalar/borrow payload is at most1024 bytes; object/runtime overhead remains
separately estimated, not falsely equated to payload. Combined fixed allowance is4096 bytes.

Role aliases borrow one ID; do not independently release it from each class. Ordinary B,
candidate R, live anchor, F and T occupy5; one successor N gives6. Stop/release T before ordinary
fold capture H; capturing new live J before old release peaks7, plus at most one retiring borrow
equals8. Sealed-layer active-E consumption may retain T: B/R/E/F/T/N/H plus one retiring equals8.
Fresh equivalent Prefix recapture has no next-group successor and fits7 including retirement.
Publication transfers an existing receipt and allocates none. At capacity defer/coalesce
presentation, retire an obsolete borrow and retry on a later render turn; never spin or fail
canonical input because an optional presentation receipt is temporarily full.

## GPU roles and accounting

B is displayed opaque color, S candidate color, X fold scratch. G is candidate group coverage;
L stable live coverage, F visible tail and T hidden replacement tail. Candidate and live epochs
are independent. Stream canonical stable pages once, then release applied geometry. Fresh C/D/E
must not depend on replaying the768-page/8MiB ActivePages cache.

Normal targets are3 RGB8 plus4 R8:13P bytes, at most104MiB at8,388,608 backing pixels. Packed
fallback is4 RGBA8:16P, at most128MiB. Dispose an entire failed normal attempt before fallback.
Geometry including256KiB streaming reserve is min(128MiB,192MiB−targets), hence88/64MiB at max
backing. Unique allocations, spare slabs and retiring generations all count against192MiB.
No default-framebuffer storage, readback, gl.finish, ninth target or hidden extra CPU budget.

Packed L/F are physical B/S alpha planes at live-owner creation; T is X.alpha and G is the
fourth texture alpha. Keep L/F/T physical references fixed throughout that owner, even when
B/S color roles swap. RGB writes preserve alpha. Both bound samplers must differ from the
attached destination, including operations on different channels of the same texture.

## Transactions and progress

One GL stream and at most two fences remain. After every slot await, requery shared coverage
and host source/session/GPU epochs. Final capture/transform/issue/role transfer is synchronous
with no intervening await. Stable/tail work retains the shared2ms budget and fair first service;
candidate work retains existing producer/queue/task/submission bounds. No fold/allocation/GPU
wait on input callbacks, unbounded catch-up loop or per-stroke End queue.

During active C, keep L/F/T. When C is obsolete, discard its contribution; when an installed
validated Prefix includes C, retire its masks without folding twice. After End with no newer
active source, retain C and finish stable coverage through the existing single2ms live turn
alongside candidate work. Do not fold away an empty or unfinished live image merely because End
arrived before its first visible publication. A newer active D/E requires the bounded handoff:
stop hidden T, capture a DisplayOnly anchor and compose transformed B plus MAX(L,F) once in C's frozen style
into distinct X.RGB. Clear only RGB. Swap B/X and transfer the anchor after issue, then release
old masks/anchors and initialize the latest active source E. S/G remain intact. If C ended and
D began/ended before any render, fold only materialized C, record cutoffD and start E; candidate
reconstruction supplies D in order. A cutoff is never a certificate that D pixels were displayed.

Ordinary live-source folding remains forbidden during a cancellable view gesture. The narrow
validated completed-prefix display composition below may release S for another reconstruction;
retaining the original B texture for the entire gesture must not block newly revealed regions.
Escape restores the Rust-owned pregesture camera. The most recent complete B follows that
camera while any missing coverage is reconstructed; this does not change document/history.
After accepted pan End, a fold retains
the entire currently visible B/C union, including C outside B's old footprint. Outside-viewport
raster is disposable; later pan-back may be incomplete until reconstruction. Canonical content
is retained, and incomplete/provisional coverage cannot acknowledge exact currentness.

Extend candidate R one completed group at a time. Allocate immutable successor N, prepare its
complete union coverage in G, composite once into S and validate submission before transferring
R→N. Pre-composite failure preserves S/R if valid. After a possibly issued composite, do not
pretend S is unchanged or replay that group: ambiguous failure discards candidate/rebuilds while
preserving usable B, or uses existing recovery. A merely pending fence is not permission to replay.
Ordinary Append/End cannot restart useful completed candidate work indefinitely.

Retention applies to recoverable pre-issue relevance/admission failures. Fatal, context and
global resource failures still follow existing recovery, which may dispose retained S/R; this
does not create a silent retry loop. Validate the in-flight successor as well as the installed
predecessor. Undo that removes only N's group must abort N's pending worker/queue wait promptly,
even when R remains valid; do not wait for an obsolete reply or watchdog before rebuilding.

Exact-view installation requires validated S at the latest completed cutoff and exact content/
view/mapping/metrics. Swap B/S and transfer its Prefix, retaining active E's
physical coverage. Draw E once afterward. Active input still forbids presented/ready acknowledgement.
At-cutoff stale content/mapping with identical Rust-certified source/view can take a fresh
Prefix capture and transfer the unchanged validated S after a no-await recheck; no JS key rewrite.
Otherwise request one bounded current-view rebuild immediately, not after a hypothetical next End.

During an active view gesture, a fully GPU-validated, no-longer-busy S at the complete current
prefix/content can release the reconstruction slot before End. Exact-current-view S can install
directly. An older-view S must not replace B alone: reversal can expose useful B pixels outside
S's footprint. Instead compose the existing displayed B/ended-live/S graph once into X, in its
existing painter order, then retain that union as DisplayOnly B. This uses existing surfaces,
receipt limits, queue bounds and submission slots; it is not a pixel-copy or lattice optimization.

Named `memoryViewDisplayFrameCapture(owner,session,mapping,candidatePrefix)` returns the existing
generated DisplayFrameSnapshot. Rust validates current command ownership/session/mapping,
Ready/metrics, an active view gesture with no active ink, and a retained Prefix with current
lineage/content, the complete visible cutoff and matching metrics. Its captured view/mapping may
be older; that is the reason for the operation. All rejection precedes allocation. The resulting
DisplayOnly receipt captures the current canonical view, grants no geometry/current-prefix
authority and cannot acknowledge readiness. Ordinary captureDisplay/canFold rules stay unchanged.

The host captures the whole displayed graph before stop/dispose/swap, reserves the incoming
anchor before GPU issue and composes into X under an existing submission reservation. Preserve
candidateIncludesLive ordering, RGB-only packed writes and all reader lifetimes. Adopt the new
anchor transactionally, then retire covered ended-live and candidate ownership. S reuse follows
the union reader commands on the same context; no third fence. Capacity before issue preserves
the old graph unchanged. Any ambiguous issue/adoption/release/submit failure uses existing
terminal recovery and retains uncertain ownership; never resume the old logical B after a swap.

Free S for one latest-view reconstruction immediately, including while the pointer remains held
and stationary. Do not restart useful in-flight work on every move, fold per move without a new
completed candidate, or rewrite old-view pixels as an exact current Prefix. Input completion and
acknowledgement remain false throughout the gesture. Successive moves must reveal successive
offscreen regions before release. Verify repeated fractional/rotated temporary compositions
separately for intermediate coverage/filtering; canonical geometry limits are unchanged, and
End/Escape must reconstruct exact canonical output. Passing a temporary-image check is not an
exact-copy, latency or whole-M04 acceptance claim.

### Sealed provisional candidate

A source-valid, fully GPU-validated S initially at the latest cutoff may become one sealed
display layer when view differs or a gesture prevents installation. It owns no additional
texture/receipt. Draw B, then ended live C if CandidateIncludesLive, then S opaquely only on its
Rust-transformed raster quad. An ended live source not included by S goes after it; active E
always goes last. Outside S's footprint preserve B/live contributions; do not stretch/clamp its
old pixels over newly exposed regions or apply group opacity twice. It grants no current ack.

Once displayed, seal S and its underlying display graph until consumption. Before any B mutation,
ordinary publication, live fold or in-place S extension, consume the layer in that exact painter
order. Hiding it after a new End would flash away progress; painting it over newly folded D could
erase D. During a view gesture, a complete-current-prefix S can leave this sealed state through
the explicit union-preserving display composition above. Other sealed graphs retain B/S/ended-live anchors; at most
one next group/successor may wait in G. Do not restart a candidate per move. Source-invalidating history follows existing
historical-display/reconstruction rules, not source-valid sealed reuse.

At the first eligible CanFold turn consume the visible completed graph into X at a fresh DisplayOnly
anchor, excluding active E. If S excludes ended C, no newer active source needs the masks and C's
stable coverage is unfinished, retain that sealed graph and advance C through the same single2ms
live turn first. Consumption becomes eligible after stable completion, certified inclusion or a
new active-source handoff; End alone must not discard unpublished ink through this path either.
With no surviving active owner, B/X may swap after ended masks are
consumed. With active E, do not swap: copy X.RGB back into physical B.RGB, blending off, both
samplers bound to X, alpha writes off. This preserves physical L/F/T, including T in X and L
in B. Display E once afterward. The extra full-surface copy is real work and must be measured.
Only then extend/replace S; if its view differs, request one latest-view reconstruction using
eligible prepared geometry. One consumption per sealed epoch, no per-frame copy/rebuild loop.
After ambiguous composite/copyback failure enter existing recovery; never publish partial B
metadata or promise GPU rollback. Before issue, failure leaves the old display graph intact.

### Progress after validated completion

A newly sealed candidate may take the existing eligible consumption path in the same render
turn. Require the same CanFold and unfinished-ended-live guards, reserve the mandatory display
receipt first, preserve painter order and refresh coverage after consumption. Consume at most
once in this turn; a capacity miss presents the unchanged graph and yields. Cancel an older-view
candidate only after successful consumption, then admit the ordinary current-view reconstruction.
No extra submission reservation, readiness acknowledgement or input-callback work is introduced.
Waiting an additional animation frame solely to discover this already-known eligibility is not
a lifetime requirement.

After all issued GPU readers have signaled, no slot is reserved and error validation succeeds,
the existing submission owner may immediately resolve its one pending wake. Cancel that wake's
owned timer and clear its identity before resolving; every consumer rechecks its own serial or
slot predicate. A wake is not a slot grant. Keep two fences, all-reader validation, real producer
task yields, unready-fence backoff, hidden-page handling, cancellation and retirement unchanged.
Test actual held-fence release and same-turn progression; measure complete acknowledgement, not
only the first provisional display. This scheduling refinement has no numerical or editing delta.

### Temporary color-image filtering

Use one renderer-owned LINEAR/CLAMP_TO_EDGE sampler only for transformed opaque B/S color
presentation and its existing display-union composition. An exactly identity linear matrix with
exact integer translation retains NEAREST sampling; fractional, rotated or otherwise transformed
color images use LINEAR. This classification controls presentation filtering only, never reuse
authority or geometry certification. No epsilon or inferred integer displacement is permitted.
Bind and restore every touched sampler unit explicitly, including failure paths. All textures
retain their default NEAREST state. Geometry, MAX coverage, live-mask combination, G presentation
and exact texelFetch copy remain unchanged. Packed color reads use RGB with output alpha one and
RGB-only writes where required; source/destination alias restrictions remain mandatory.

The sampler adds no image storage, target, receipt or fence. Allocate and dispose it with the
renderer, account its fixed host metadata separately, and handle allocation/context errors through
existing resource failure cleanup. The same-anchor replacement invariant prevents repeated
temporary unions from indefinitely resampling an inherited old B feature: the next complete S
captures the new B anchor synchronously and replaces its entire footprint before another union.

Require matched source/transform NEAREST-versus-LINEAR and canonical captures, fractional pan and
rotation/reversal, footprint edges, low zoom/wide strokes, repeated unions, packed-alpha/live
isolation, exact identity/integer output and exact End/Escape restoration. Temporary filtering
is not canonical geometry or exact-copy evidence. Keep existing canonical precision/AA thresholds;
designer and independent review assess the temporary image separately, with no invented tolerance.

## Required evidence

CT-02/03/04/06/07/08; INV-01/02/04/08/09/11; SU-03/04/13/14/16; SEC-03/09/13.
MIG-WORKER-29–32 cover held historical candidate plus98,817-sample C, C→D→E/End-before-RAF,
fractional pan/rotation/Escape, old candidate footprints with newer ink outside, no-next-source
Undo→Redo/camera-roundtrip recapture, normal/packed aliases, all intermediate allocations and
failure/fatal paths. Retain MIG-WORKER-33 exact live/End/Redo and continuous-tail evidence.

Pair all authority/lifetime positives with wrong kind/source/owner/session/mapping, released ID,
equal-count different branch, changed view/metrics, incomplete GPU image and full8-slot negatives.
Include0/1/127/128/129 samples, empty/culled groups, pressure/opacity extrema, checked regional
overflow, ID exhaustion, malformed-current cancellation and stale callbacks. Faults before and
after candidate composite and during packed copyback must prove no duplicate blend or poisoned
export. Translucent renderer fixtures are not an implemented opacity UI claim.

Measure natural unheld large strokes, continued-pan visible contribution, stopped-pan exact
completion, full-surface-copy cost, callbacks/tasks/resources and warm/cold history separately.
Intentional holds establish correctness only. Existing250ms cold/100ms warm targets and500ms
history stop, callback/input/render gates remain unchanged; no timing readbacks/concurrent GPU
benchmarks. Designer reviews actual continuity, rendering specialist measurements and fresh
reviewer implementation/evidence. This contract supplies no passing runtime or physical-pen claim.
