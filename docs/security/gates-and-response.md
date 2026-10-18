# Security gates and response — S00E proposal v1

2026-10-16. All controls below are proposed/planned, not installed or executed. Owners must bring
material mechanisms/budgets to S02 review. No application code or CI configuration is authorized.
Risk IDs map to [day-zero review](day-zero-review.md); tests below are proposed semantic scenario
IDs, not discovered tests or passing evidence. Preserve existing CT/INV/SU acceptance IDs.

## Traceable security invariants and tests

| Proposed invariant / scenario | Contracts | Observable check | Responsible owner |
| --- | --- | --- | --- |
| SEC-T01 foreign DB schema/content never grants executable or mutation authority | CT-05, INV-07 | Hostile schema/type/ref/size fixtures fail without source or current drawing changes | Rust + DB |
| SEC-T02 hostile workload remains bounded and cancelable | CT-02/05/06 | Huge counts/extents and overflow rejected; memory/work limits observable, UI remains responsive | Rust + rendering |
| SEC-T03 ABI memory/thread preconditions explicit and enforced where checkable | CT-04, INV-01 | Stale handle, wrong thread, malformed tags and capacity cases; sanitized harness for unsafe wrappers | Rust + native |
| SEC-T04 peer signal alone cannot authorize rename | CT-01/03/05 | Forged peer, stale owner, duplicate/lost-ack request yields safe outcome | Rust + native |
| SEC-T05 publication requires current access, target and consent | CT-05, INV-06 | Alias/swap/revocation/restart races preserve old target or report ambiguity | Native + services |
| SEC-T06 deletion prevents new dependent admissions and reconciles cancellation | CT-03/05 | Concurrent export/create claim cannot outlive accepted barrier unexpectedly; no removal of published output | Rust + DB |
| SEC-T07 private content absent from ordinary diagnostics | CT-07/08, INV-09 | Canary names/paths/strokes/bookmarks absent; visual evidence explicitly sensitive | Implementers + build reliability |
| SEC-T08 product contains no test authority or excessive privileges | CT-04/08 | Inspect signed artifact/entitlements; test-only endpoints absent; negative file access | Native + build reliability |
| SEC-T09 denied/busy/newer data never triggers destructive recovery | CT-05 | Permission/busy/version/corruption matrix distinguishes outcomes without blank overwrite | DB + Rust |
| SEC-T10 source/build inputs have reviewed provenance | CT-08 | Locked dependency inventory, native binary/source provenance, advisories/license/secret review | Build reliability |
| SEC-T12 stale persistence cannot cross an owner transfer | CT-03/05, INV-01/06 | Old queued write, in-flight commit and late completion exercise the actual fencing boundary | Rust + DB |
| SEC-T13 native export contains only approved portable records | CT-05 | Deleted-content canaries absent from output; source unchanged; names/settings follow selected export contract | Rust + DB |
| SEC-T11 unsupported viewers reject editing at shared boundary | CT-01, INV-10 | Direct and native unsupported command attempts rejected, no revision/storage mutation | Rust + host |

Tests need exact build/revision, configuration, OS/device and result/artifact manifest. Process tests,
parser fuzzing, injected commands and real native E2E are different evidence classes. Capture faults
at cross-file transaction/publication steps. No native checks without a current desktop reservation.
Memory sanitizers cannot validate arbitrary dangling pointers by safely dereferencing them in a
normal unit test; isolate intentional invalid-memory probes and document ABI caller preconditions.

## Local development gates before later CI reuse

Before implementing a boundary: link applicable SEC IDs to contract, proposed tests, resource bounds,
owner and failure UX; obtain required schema/ABI/trust/design review approval. Per relevant change, require
format/type/lint plus semantic and adversarial cases, unsafe/native review and secret/dependency
checks as installed. Run deeper seeded fuzz/sanitizer campaigns for parser/ABI milestones; retain
reproduction inputs and redacted evidence. Exact compatible pinned tooling belongs to S01.

Candidate tools, not newly installed requirements: RustSec cargo-audit for known Rust dependency
advisories; cargo-deny for dependency/license/source policy; npm audit for relevant JS dependencies;
Gitleaks for secret scanning. Include native SQLite/Skia libraries and prebuilt assets in a separate
inventory: Rust/npm lock scans do not cover all bundled native code. Do not automatically apply
upgrade fixes or hide advisories to get green. Exceptions require documented reachability/impact,
owner, expiry/recheck and owner approval for unresolved serious risk; no permanent wildcard ignores.
[Cargo audit](https://github.com/RustSec/rustsec/tree/main/cargo-audit),
[cargo-deny](https://embarkstudios.github.io/cargo-deny/),
[npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/),
[Gitleaks](https://github.com/gitleaks/gitleaks).

Review scanner network behavior before using private inventories: do not upload source, drawings,
credentials or failure artifacts by default. Prefer approved public advisory downloads/local scans;
report advisory age/offline gaps. Dependency audit services may receive package metadata. Scan
both changes and relevant history before public release, never print discovered secrets in logs.
A clean scan is not proof of safety. Inspect build/install scripts and upstream native fetches;
ignore-scripts for npm alone cannot sandbox Cargo build scripts, plugins or every native tool.

Before each relevant preview commit: require actual sandboxed entitlement/access and process tests
for changed native boundaries, in an authorized desktop window when focus is involved. Before preview
acceptance: no unresolved high-consequence overwrite/unauthorized mutation/data exposure defect;
independent security-focused review, privacy sweep and clear remaining coverage gaps. High-priority
risk rows are design work, not automatic findings of exploitable implementation bugs in a nonexistent app.

Before publishing open source: select license/contributor governance, redact credentials/private
fixtures, review dependency licenses and provide a real private reporting route. Before distributing
binaries: signed artifact/provenance/channel requirements from S00G/S09 and actual negative tests.
No CI deployment, store account or publish action is created by this document.

## Security issue handling proposal

Lead triages privately: affected builds/features, reproduction, impact and data exposure. Preserve
minimum sensitive evidence with restricted access. Implementer fixes; independent reviewer verifies;
build reliability reproduces regression and records fixed versions. Do not ask reporters to post
private drawings or access references publicly. Private reporting endpoint/contact must be approved
and tested before publication; do not invent an email address or promise response times not staffed.

If credentials leak, revoke/rotate through an authorized workflow; deleting a commit is insufficient.
If data corruption/exposure is plausible, disable/withhold the affected release path, preserve
recoverable data and obtain owner incident decisions. Do not silently delete user data or roll out
unapproved fixes. Coordinate external disclosure responsibly; owner approves communications/release.
Public security documentation must state supported versions and limitations truthfully.

## Fresh review and pending approval

Specialist inputs: read-only rust_engine storage/FFI and macos_ui native capability assessment.
Fresh reviewer assessment will be recorded after integration with exact reviewed-file hashes.
This packet is for owner review. Security role recommendation: existing accountable implementers
plus scoped independent review; no new permanent role/configuration created in this turn.
