# Conservative contour compaction verification

[P05-R08](../../tasks/P05-R08.md) is the owner-approved bounded experiment and isolated
interactive preview task. Current state: candidate rejected by its first exact-pixel case;
interactive integration/handoff blocked. Gate0 design review and baseline diagnostics are complete.
An unchanged CPU reference, mathematical set equality and actual submitted pixels are separate
obligations. A repeated blank frame cannot establish correctness.

## Frozen evidence lanes

| Lane | Required observation | Initial state |
| --- | --- | --- |
| Baseline | Six unchanged CPU cold rows, moving/sparse/pressure65,537 × two backing sizes | All six failed the whole-path draw guard |
| Numerical/ownership | Full-area certificate and whole-prefix winding proof; bounded arithmetic; source capture/lifetime | Preliminary kernel/adapter static review passed; capture implementation and numerical runtime conformance unrun |
| Candidate correctness | Existing32 corpus pairs plus bounded cases below; exact original/reference/submitted RGBA | First static corpus row failed; remaining31 and additional cases unrun |
| Candidate performance | Long coincident/moving/sparse/pressure, continuation/history/held pan | Unrun after correctness stop |
| Actual app | Real pointer/controls, en/uk, focus, cancellation, immediate next stroke, continuous pan | Unimplemented/unrun; handoff blocked by correctness |
| Full profile | Five runs per approved workload, sufficient observations, unchanged absolute/relative gates | Unrun |

Baseline diagnostics are independent and continue after individual failure only for the six
frozen rows. Failed rows remain failed. The first candidate correctness failure stops the
candidate; the first candidate timing failure stops later performance rows. A correctness-safe
manual preview remains required after a timing failure and must be labelled experimental.
No failure authorizes a different algorithm, larger threshold, altered appearance or dropped input.

The frozen baseline at clean1113f190f4994be21d282818a8a45a5251f3dcfa accepted all65,537
samples in each row and reached the CPU draw. Every row exceeded8ms; no frame was submitted.
This confirms the unresolved indivisible draw cost across moving, sparse and pressure-varying
geometry. It does not establish candidate performance or physical input latency. Exact identities,
individual timings and unchanged-renderer hashes are retained in the ignored `r08-baseline`
lane, along with its frozen served site. No diagnostic was retried.

## Current rejected-candidate finding

At cleanf4ce2e1c2bc1798137ce08230b0b0be3b67bca96, `control-256-small` reduced256
byte-identical six-verb discs to one. Its54 differing color channels (maximum delta7, total150)
fail exact equality. Both fresh unchanged CPU references matched exactly; the candidate remained
nonblank with69 ink pixels. The mismatch occurs before bitmap publication, which was not attempted.
Independent review verified the source-array and served-asset hashes and duplicate-only removal.
No containment predicate ran, and no specific Skia-internal cause is established.

This experiment rejects raster equivalence even for exact duplicate removal under the current
CanvasKit CPU AA contract. It does not prove canonical input loss or refute mathematical union
equality. Preserve the first failure; do not treat an original-geometry fallback as successful
compaction or loosen tolerance. Small-case preparation timings are unguarded correctness-run
observations and cannot be compared as a speedup against65,537-sample baseline draws.

The source fixture deliberately retains original pages for its independent oracle. Bounded
production transport, finite capture queries and interactive lifecycle are not implemented here.
No runtime/source change follows from the planning sections below without renewed authorization.

## Additional bounded cases

The existing R06 corpus remains unchanged. These16 named cases supplement it; literals/source
vectors are fixed before execution. Direct hostile-page/predicate cases are explicitly
browser-hosted synthetic contract experiments, not actual user input or a unit-test suite.

| ID | Required distinction |
| --- | --- |
| R08-C01 | Exact duplicate vs distinct encoding/hash collision; original bytes preserved |
| R08-C02 | Mixed radius, partial overlap and forward-only retention |
| R08-C03 | Covered boundary with uncovered center: candidate must remain |
| R08-C04 | Tangency and adjacent representable separations; no epsilon removal |
| R08-C05 | Projected degeneracy/subnormals; uncertified winding disables complete prefix |
| R08-C06 | Regional carries, minimum zoom and rotated projection |
| R08-C07 | Late uncertifiable winding reconstructs every earlier omitted original |
| R08-C08 | Candidate/predicate/subdivision exhaustion returns keep |
| R08-C09 | Index capacity and eviction never alter emitted artwork |
| R08-C10 | Hostile arrays/weights/templates/cursors/generations reject atomically |
| R08-C11 | N→releaseN+1→EndA→BeginB→CancelB retains complete A |
| R08-C12 | Idle history rebuild, permanent capture revocation and idempotent release |
| R08-C13 | Held-pan compatibility vs zoom/rotation/resize invalidation |
| R08-C14 | Allocation/worker failure and stale epoch preserve state and permit safe retry |
| R08-C15 | Colored painter order, history membership and cache eviction |
| R08-C16 | English/light and Ukrainian/dark/reduced-motion actual input/Back/Resume |

CT-02/03/04/06/08; INV-01–04/08/09/11; SU-03/04/13/14/16/20; SEC-02/03/09/13.
WMP-R08-01–06 in the task map these cases to parity/performance/input/navigation/resources/app.

## Interpretation and retention

- Guard failure during input/capture/preparation can precede draw. Mark draw unrun in that case.
- A returned operation duration is distinct from watchdog elapsed wall time.
- Count original and selected contours, proof reasons/work, queries/copies, path construction,
  snapshots, full draw, conversion/transfer, actual submission/acknowledgement and queue age.
- Uncertified global winding requires original-prefix reconstruction; retaining only that contour
  can be incorrect. Inconclusive containment alone may retain the contour.
- Retained proof operands count toward16MiB; buffer credit does not bound a hidden full source
  replica. Measure live resources separately from Wasm capacity and driver residency.
- Source captures are finite and revocable. Append may preserve an earlier prefix; publication
  still needs content/view/painter-order validation. Captures do not authorize editor mutation.
- Matching projected geometry cannot prove raw canonical sample equality. Keep that ABI gap
  explicit and distinguish source review from runtime observations.
- Screenshots and pixel readback stay outside timed lanes. Actual physical Wacom use is manual
  evidence; injected events/headless timing cannot establish physical latency or visible FPS.

Record exact clean revision or full dirty-source identity, source/generator hashes, release
Wasm/served assets, browser/backend/OS/CPU, dimensions/DPR and measured/unmeasured host conditions.
Keep every failed/interrupted attempt; no retry averaging or discarded slow rows. Generated
JSON/images/logs belong under ignored `.build-cache/web-memory/compaction-checkpoint` or its
named baseline lane. This authored acceptance guide remains source.

## Manual preview handoff

Use the actual application on a new strict port and open `/drawing/preview-new` in Codex.
Preserve existing preview processes, sources and assets. Before handoff require exact-build
browser E2E, designer and independent review. Real mouse/Wacom drawing, rapid lift/next stroke,
Undo/Redo, held pan at10% through edges/diagonals, zoom/rotation and cancellation must be usable.
Show the existing unsaved disclosure with the approved quiet experimental identifier.
No hidden mutation controls in the manual build. An owner impression supplements measured
acceptance; it cannot convert failed timings or missing correctness evidence into a pass.
