# In-memory web editor threat delta — WMP v1

Status: proposed design, not owner-approved or implemented. Task: [S02-W01](../../tasks/S02-W01.md).
Date: 2026-10-19. Lead confirms new language, rendering-resource and dependency boundaries.
The confirmed investigation contains synthetic local arithmetic/geometry experiments only.
No app runtime, new storage, network feature, system permission or private drawing is added.
Owner retains CanvasKit and approved the revised web budget. WMP-C2 specifies320MiB owned CPU
as an observed/admission target; stock CanvasKit can grow to2GiB, so one call can overshoot
its256MiB share before detection. This is not a hard allocation limit or protection from
browser OOM. Require pinned heap instrumentation, bounded input/geometry, and suspension
without clearing accepted Rust content/history on detected excess. No automatic reload or
restart. The unchanged proposed graphics/path/history limits still need their stated evidence.

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

All controls above are **planned**, not implemented or verified mitigations. CT-01–04/06–09,
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

Local source experiments consume fixed synthetic vectors and write ignored reports; they are
not app entry points or newly installed unit/developer-tool suites. Record compiler, source
hashes, exact candidate/corpus and failure cases. Preserve limitations and do not substitute
diagnostic results for Rust/Wasm/CanvasKit browser E2E.

Fresh reviewer independently assesses this delta with the actual packet/source diff. Findings,
reviewed snapshot identity and disposition are recorded in the task/PR; review never grants
owner architecture approval. Required implementation security checks remain P05-E01/E02 gates.
