
> Working-copy terminology was normalized by owner decision235 on2026-10-18. Historical approval hashes below still identify their recorded approval artifacts, not these normalized bytes. The pinned base preserves a pre-normalization working copy and is an exact approval snapshot only where its hash matches. See [normalization provenance](../reviews/design-workflow-normalization-2026-10-18.md).

# S02 v3 regional-coordinate schema source review

Status: PENDING OWNER REVIEW; NOT IMPLEMENTED. Prepared 2026-10-17.
The owner delegated recommended defaults after RC1–RC11; decision 208 records that
delegation, not approval of this exact artifact. [Grouped schema source (historical)](https://github.com/AlexandrLesiv/Linefield/commit/b0cb531) is the review
entry point. [Historical v2](history/s02-v2/README.md) retains exact prior local sources;
quality/historical-records.json (Git b0cb531) and the original hosted approval are unchanged.

## Changes and selected defaults

| Database/table | Replace | With |
| --- | --- | --- |
| drawing.samples | x, y | region_x, region_y INTEGER; local_x, local_y REAL |
| drawing.strokes | translation_x, translation_y | placement_region_x, placement_region_y INTEGER; placement_local_x, placement_local_y REAL |
| catalog.local_view | center_x, center_y | center_region_x, center_region_y INTEGER; center_local_x, center_local_y REAL |

Three files/databases, 14 tables, 122 columns, 8 same-file references: net six additional
columns. Namespace colors/groups distinguish physical files. All IDs, relationships,
ordering, receipts, colors and jobs columns stay unchanged. No redundant source anchor,
region table, persisted spatial index, persisted history or new protocol.

- Region size 65,536 logical units; signed i64 region addresses. Negative addresses are valid.
- Local offsets finite f64 in [0,65536); canonical positive zero. Rust checks carry/borrow.
- X right/Y down for document and normalized canvas; canvas origin top-left. Document origin
  stays fixed while panning. Region/local Y share direction; RTL never mirrors artwork.
- Original sample_index=0 is the immutable source anchor, derived when hydrating the stroke.
- Appearance: placement + uniform_scale * (original - source_anchor), evaluated using checked
  regional relative arithmetic before float narrowing. Never flatten huge absolute positions.
- Initial stroke placement equals source anchor, scale=1. No SQL DEFAULT masks omitted fields.
- Scale 1/64–64; base pen width 1–512; zoom 0.1–8. These are selected policy ranges.
- Preserve existing bounded admission/accounting. Larger coordinate records must fit current
  byte budgets; do not silently increase caps or promise a sample-count maximum always fits.
- Retain current indexes. Sample-region indexing would miss crossings with both endpoints
  outside the viewport. Derived memory-only spatial indexing covers full painted bounds.

These are conservative design defaults, not measured optimal performance.
Exact supported original per-stroke span and transformed precision envelope remain pending
numerical evidence. Region size is not a stroke-span cap. No guessed span CHECK is included.

## Constraint authority and validation

All owned tables remain STRICT; foreign_keys is enabled on every connection. schema source is
documentation, not executed SQLite DDL. Field notes specify intended CHECKs using
"value" as a placeholder for the actual column name.
- Each regional field: NOT NULL INTEGER; signed range includes negatives.
- Each local field: NOT NULL REAL; CHECK(column >= 0.0 AND column < 65536.0).
- uniform_scale: CHECK(uniform_scale BETWEEN 0.015625 AND 64.0).
- base_width/pen width: CHECK(column BETWEEN 1.0 AND 512.0).
- zoom: CHECK(zoom BETWEEN 0.1 AND 8.0).
- Preserve UUID BLOB length16, fingerprint length32, nonnegative revisions/sample indices,
  positive local keys, RGBA and nullable pressure range, singleton and existing FK constraints.
- Rust independently validates hostile schemas/values; SQL checks are not trusted admission.
  Negative-zero normalization is a Rust requirement, not a claimed SQLite CHECK capability.
- Whole-stroke validation requires at least one actual sample with contiguous indices from0.
  Cross-row checks and atomic samples/header/revision/receipt validation stay in Rust/transaction.
- Normalize trusted command inputs before canonical fingerprint construction. Reject invalid
  persisted coordinates instead of silently rewriting imported artwork.
- Fail carry/borrow/address/painted-bound overflow atomically. Include scaled width/pressure
  in admission and rendering/selection/export bounds; no silent split, crop or point rewrite.

Exact fixture-driven SQL migrations and runtime checks are future implementation work.

## Device-local viewport preference

catalog.local_view is one remembered per-drawing preference, not shared live viewport state.
Keep preference_revision/stale-write guards and independent Rust viewport state per live client.
Restore through a fresh runtime mapping generation. Do not persist metrics, backing scale,
mapping generation, selected stroke, handles or native widget state.
Invalid/missing view preferences use the approved fit/default fallback without declaring valid
artwork corrupt. A failed catalog write must not claim saved preference success or alter another
client's live view. Native adapters convert event/view orientation into the shared convention.

## Version, snapshots and compatibility

Proposal v3 does not prescribe user_version=3. No deployed Linefield format exists; the first
implemented format can start at1 with this reviewed schema. Document and catalog schema
versioning are independent. Jobs columns need no version bump merely because drawings change.
Snapshot files use their own recorded document format. Preserve existing immutable snapshot
bytes/digests; never migrate an in-flight export snapshot in place. Unsupported snapshot
versions remain protected and return an actionable result, not automatic deletion/reinterpretation.
Portable snapshots are fresh allowlisted drawing databases with empty command_receipts;
private recovery copies are not sanitized exports.

Old global-coordinate synthetic fixtures need explicit conversion tests. Old translation is
NOT new placement: placement = old_translation + old_scale * old_sample0. Original samples
convert to canonical region/local positions. A conversion must preserve semantic output within
reviewed tolerances; otherwise reject without modifying source. No legacy Native Sketch
compatibility is introduced.
Canonical receipts retain their schema but use a versioned semantic fingerprint domain and
canonical region integers/local float values. Never reinterpret old fingerprints as new
command identities. Exact command vectors accompany the separate typed-interface review.

## Edge-case acceptance and security delta

Existing CT-01/03/04/05/07 and their established invariants apply. These are planned cases,
not implemented tests or pass claims. Lead assigns concrete test IDs when tasks are activated.

| Case | Trigger | Required outcome | Owner / evidence layer |
| --- | --- | --- | --- |
| REG-01 | Both-axis carry/borrow, local65536, -0, nonfinite, i64 extreme | Canonical trusted input or atomic rejection; unchanged artwork/revision/receipt | rust_engine / boundary-property |
| REG-02 | Missing sample0, gaps, duplicate index, hostile schema/type | Reject artwork admission; source intact | Rust + database / storage-negative |
| REG-03 | Move/scale stroke across regions; save/reopen/Undo | Same identity; original samples preserved; one operation | Rust + host / core-storage-native E2E |
| REG-04 | Extreme placement, painted width, min/max scale/zoom | Render/hit/export parity within measured envelope or atomic rejection | rendering + Rust / precision-render |
| REG-05 | Segment crosses viewport, both endpoints outside | Visible painted portion not falsely culled | rendering + Rust / geometry-render |
| REG-06 | Invalid/stale saved viewport; two live clients | Safe preference fallback; live views remain independent | Rust + platform / lifecycle-E2E |
| REG-07 | Disk full/death during mutation | Samples, revisions and receipt commit together or retain prior state | database + Rust / fault-injection |
| REG-08 | Unsupported snapshot or failed old-fixture conversion | Protected source/snapshot bytes and hashes unchanged | Rust + build / storage-recovery |
| REG-09 | Flipped native views, RTL, region crossings | Correct orientation and round trips; no artwork mirroring | platform + Rust / native-E2E |
| REG-10 | Sparse far-separated artwork exceeds PNG bounds | Capacity failure without cropping/downscaling or source mutation | Rust + rendering / export-negative |

Security impact: existing untrusted SQLite/numeric/FFI/receipt boundaries gain wider coordinate
ranges. Review integer overflow, unsafe float narrowing, conversion cost, memory reservation and
fingerprint canonicalization. No new privileges/network/credentials. Existing structured logging
redacts coordinates, content, paths, persistent document/stroke/receipt identities and fingerprints.
Retain the approved ephemeral session/request/operation correlation envelope, allowlisted
outcomes/reasons and bounded counters/timing under [structured diagnostics](../logging.md).
Never use persistent receipt UUIDs as diagnostic correlation IDs.
Data-loss/overflow/admission failures are high priority; restored preference layout is lower
priority unless it bypasses bounds. Interruption plus stale completion must also be exercised.
Security traceability: SEC-01/02 -> REG-01/02/04/05/08 (hostile values, numeric and capacity
admission); SEC-03 -> REG-01/06/09 (typed mapping/lifetime); SEC-07/08 -> REG-07/08
(atomic recovery/protected source); SEC-09 -> snapshot allowlist byte-canary and correlated-log
redaction tests from S02-v2, extended to regional values and fingerprints. SEC-04/05/06 trust
and file-access boundaries are unchanged; wider coordinates do not grant new authority.
Fresh reviewer must challenge this design; actual implementation still needs independent review.

## Review boundary

This handoff seeks approval of the exact schema source and accompanying defaults/constraints.
Typed ABI compilation, migration/runtime tests, precision/performance measurements and design review
are not completed by schema approval. No app code or SQL migrations were executed.
