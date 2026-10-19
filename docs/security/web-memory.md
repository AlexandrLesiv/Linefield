# In-memory web editor threat delta — WMP v1

Status: owner-approved W1–W4 security direction; N1/A1/R1 concrete additions approved at51d9345.
S02-W01 is integrated. Separately confirmed [P05-E01](../../tasks/P05-E01.md) implements the
empty runtime subset; its task records verification and independent review. Broader pen/history
controls below remain future implementation requirements.
Date: 2026-10-19. Lead confirms new language, rendering-resource and dependency boundaries.
The original investigation contains synthetic local arithmetic/geometry experiments only.
P05-E01 adds the local in-memory runtime without storage, a network feature or system permission.
Owner retains CanvasKit and approved the revised web budget. WMP-C2 specifies320MiB owned CPU
as a soft monitoring target; stock CanvasKit can grow to2GiB, so one call can overshoot
its256MiB share before detection. This is not a hard allocation limit or protection from
browser OOM. Target crossing alone does not suspend editing. Reclaim disposable caches and
reduce optional rendering first; reject work only when allocation cannot safely proceed or
another actual resource failure occurs. Preserve accepted Rust content/history while usable.
No automatic reload or blank replacement. Browser/OS termination may provide no recoverable
warning. Pan/zoom now belongs to this slice; numerical/resource work still needs bounded
input validation and measured evidence. H1 newest-entry retention is approved. A1 presentation tokens and R1 staging/accounting
are approved at51d9345; implementation and measured validation remain separate gates. A stale renderer completion must not unlock input after
surface replacement, pan, resize or navigation. The Rust-issued token is lifecycle fencing,
not authentication against same-origin JavaScript; it contains no drawing data. Multiple
staging/snapshot backings can exceed the soft graphics target before optional cache cleanup;
no exact driver/path-allocation claim is permitted.

## Assets and authority

The proposed runtime handles private original samples, pen settings, completed artwork and
history in page memory. “Not saved” does not mean “not sensitive.” Browser events and all
JavaScript-supplied scalars, lengths, tags and identities are untrusted input to Rust.
One Rust owner controls mutation; the host owns acquisition, accessible controls and rendering
resource presentation. Copied scene geometry remains private data.

Wasm is a language/memory boundary, not isolation from compromised same-origin JavaScript.
There is no peer authentication claim, remote adapter, generic command dispatcher, filesystem
access, origin-wide ownership lock or persistent library in this proposal.
Reload/close and unrecoverable process failure lose in-memory work; no recovery promise.

## Changed risks and planned controls

| Risk | Entry / failure | Proposed control and owner | Required evidence / residual risk |
| --- | --- | --- | --- |
| SEC-02 | Extreme/nonfinite events, lengths, width, surface size or repeated allocation | Rust validates full current batches before mutation and reserves model/history/geometry capacity; renderer enforces surface/cache limits | WMP-04/05/09 and WMR-03/04 browser E2E; numerical experiment is diagnostic only; framework/GPU overhead remains measured implementation work |
| SEC-03 | Stale/freed identities, overlapping calls, expired views, trap/panic | Generated named bindings, generation-fenced calls, bounded copied outputs, no retained host pointers, fail-closed session state; rust_engine | WMR-02/04 and WMP-02/04/05; JS-visible signatures do not enforce runtime safety by themselves |
| SEC-09 | Private geometry in logs, screen captures, debug dumps or dependency diagnostics | Allowlisted bounded metadata; no coordinates/colors/content/names; synthetic review captures; implementer | WMP-05 privacy/overload browser E2E; no production sample logging or automatic uploads |
| SEC-10 | Fixture/injection controls accidentally present in release | No normal-build mutation hooks; any E2E fault facility reviewed and excluded from release; implementer/reviewer | Production-artifact inspection plus browser negative cases; direct dispatcher injection is never relabeled UI E2E |
| SEC-11 | Wasm, generated glue or CanvasKit dependency/build asset compromise | Exact version/integrity/provenance inventory; local asset serving; argument-array build steps; lifecycle scripts disabled unless separately justified | Pin/build checks and dependency review in P05-E01; this document does not certify future downloads or add scanners |
| SEC-13 | Same-origin script accesses artwork or broad script policy enables injection | Existing safe DOM text presentation; no dynamic evaluation/generic JSON commands; narrow local asset/CSP proposal reviewed before adoption | Browser policy/asset failure E2E and dependency review; Wasm cannot protect data from already-authorized hostile page script |

The table covers the whole proposed slice; only the bounded P05-E01 subset has implementation
work. Consult its task for verified controls and remaining evidence; do not infer full-slice
mitigation from foundation checks. CT-01–04/06–09,
INV-01–05/08/09/11 and SU-01–04/07/13–18/20 apply. Exact mechanisms and numeric bounds
are owned by the [contract](../interfaces/web-memory.md); identified presentation and loss
disclosure are owned by the [design](../design/web-memory-pen.md).

The implementation must inspect actual generated boundary code: typed declarations alone can
hide integer coercion/wrapping or an allocation before user validation. Validate tags, finite
integer ranges and source buffer lengths before a lossy conversion or bulk copy; reject
shared/detached/resizable or otherwise unsupported buffers under the exact adapter contract.
Typed output ownership must be demonstrated with the pinned generator, not inferred from
a TypeScript array type.

For production asset loading, recommend same-origin pinned Wasm/JS assets and the narrow
`wasm-unsafe-eval` CSP permission only if the actual loader requires it. It permits Wasm
compilation without broadly enabling JavaScript string evaluation; do not substitute
`unsafe-eval`. Actual image/style/connect directives must preserve the existing app's
behavior and be validated on the built artifact before adoption. Vite development policy
is not production-policy evidence. See [browser CSP documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).
This is a proposed policy condition, not a new header/configuration change in this task.

## Exclusions and re-review triggers

SEC-01/04–08/14–16 storage, IPC, durable export/deletion, cloud, release and stale-writer
mechanisms are excluded because this slice has no corresponding authority or entry point.
Existing sample-gallery names remain text; no new path/name/import interface is introduced.
SEC-12 existing text-safety regressions remain applicable through the gallery E2E suite.

Re-review before any worker/thread/shared-memory change, new dependency/loading mode, raw-view
optimization, persistent storage, cross-tab sharing, imports, renderer fallback, larger numeric
envelope or access to user files. Owner approval is required for material deviations.
Changing numerical admission or memory categories also requires rendering/Rust review.

## Investigation and independent assessment

P05-E02 rapid-input/P1 implementation delta retains the same single Rust owner and copied
typed boundary. SEC-02/03 re-review covers checked pan coordinates/base mapping/sequence,
restore-on-current-error, stale-pan rejection, reserved cancellation/departure generations,
and separate current-mapping admission versus exact-content acknowledgement. SEC-09 permits
only bounded aggregate render counters/times/live-handle counts in the existing explicit
Copy diagnostics payload, plus allowlisted pan begin/end/step outcomes; no pan-update/sample
stream, coordinates, colors or artwork. SEC-10 requires the near-exhaustion seed and boundary
fixtures to remain absent from release exports/assets. No dependency, worker, transport,
storage, CSP or origin-authority change is introduced. The owner separately approved temporary
pan preview translation on2026-10-19. SEC-02 covers one retained complete published image and
at most two transient image handles, bounded Rust offsets and checked non-overlap, with no
CPU readback or new surface. Active publication snapshots add measured work, not a budget waiver.
SEC-03 covers the read-only checked `memoryPanPreview` query and one Rust origin fenced by
owner/session/content/metrics/mapping, invalidated by exact acknowledgement, unrelated mapping,
history, surface or session changes. Re-pan retains the original image; cancellation restores
the current gesture's base. Preview never acknowledges exact rendering or grants ink readiness.
Snapshot/draw failure suspends display with explicit Retry and preserves Rust RAM/history;
failed publication cannot queue automatic recovery or install stale input capture. SEC-09
allows only aggregate snapshot/translation timing and handle peaks, no query/update event log.
SEC-10 release-export inspection includes the named query but excludes all negative-fixture
controls. Boundary/UI/failure evidence and independent review remain required separately.

Local source experiments consume fixed synthetic vectors and write ignored reports; they are
not app entry points or newly installed unit/developer-tool suites. Record compiler, source
hashes, exact candidate/corpus and failure cases. Preserve limitations and do not substitute
diagnostic results for Rust/Wasm/CanvasKit browser E2E.

Fresh reviewer independently assesses this delta with the actual packet/source diff. Findings,
reviewed snapshot identity and disposition are recorded in the task/PR; review never grants
owner architecture approval. Required implementation security checks remain P05-E01/E02 gates.

## Buttons-only rotation amendment — owner approved2026-10-19

SEC-02/03: fixed24-angle table,22-word checked arithmetic, determinant-corrected inverse and
conservative exact inverse-view AABB classification preserve the stored domain and0.25 tolerance.
Rotated hull normals and bounded2^22 projection precede the single f32 narrowing. Structured
numerical errors preserve existing completed work. Atomic rotation reserves mapping/scene/
presentation increments; malformed direction, stale owner/session/mapping or active interaction
reject unchanged. Reset0 is a no-op. No history/document mutation follows accepted rotation.

The read-only pan preview now returns six Rust-derived affine scalars and sourceMapping identity.
It retains the same source/content/session/metrics/zoom fences and original image; accepted
reversals cannot accumulate cropping or transform error. All source corners inform nonoverlap.
Exact stale frames cannot unlock input or replace a newer preview; preview never acknowledges
accurate mapping. Existing two-image bound, failure/retry and no-readback rules remain.
SEC-09 allows rotate-step outcome and existing aggregate affine counters only; no angle/position
or per-sample logs. SEC-10 excludes fixed regional/culling fixtures from release. No dependency,
worker, storage, network, CSP, file or credential authority changes; other threat rows unchanged
for that specific reason. Boundary fixtures and actual-browser controls/alignment/cancel/retention
checks require independent review; numerical experiments alone are not acceptance.

## Live-pan target amendment

P05-E02's owner-approved [live reconstruction contract](../interfaces/web-memory-live-pan.md)
adds seven named checked Wasm methods and fixed-size Rust target metadata. SEC-02 retains
bounded pages, one working path/staging image and at most two image handles during promotion;
no full document snapshot, worker or fixed stroke quota. SEC-03 adds target-specific geometry,
content/session/surface/rotation fences and synchronous validated adoption with rollback of
the prior transformed image. Repeated pan updates alone cannot starve target queries.
SEC-09 adds only allowlisted capture/adopt/release outcome/session records; transform/geometry
queries and artwork are absent. SEC-13 trust/CSP/dependency boundaries are unchanged: no dynamic
code, storage, transport or extra authority. Independent re-review covers this delta; review
is not owner acceptance or a claim of comprehensive security coverage.

WMP-11-LIVE browser fixture scenarios cover hostile argument noncoercion, stale geometry and
publication, target concurrency, same-size surface invalidation, rotated coverage rejection,
transformed rollback and bounded image lifetime. Actual UI E2E separately covers held-drag
content visibility, cancellation/history guards and no-jump release. Generated evidence stays
ignored; exact final verification and unresolved whole-path performance remain task evidence.
