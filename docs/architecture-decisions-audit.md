Current scope update (2026-10-16, decision 154): launch requires en and uk on every implemented host, OS/per-app selected (browser preferences on web), no in-app switch. Earlier English-only recommendations below are historical and superseded.

# Architecture decision audit

Recorded 2026-10-16. This audits session intent into Linefield's documentation; it does not
approve implementation or unreviewed concrete designs. Use [decisions](decisions.md) as the
approval record and the linked specifications for details.

| Choice discussed | Status and location |
| --- | --- |
| Separate Linefield project, old repo read-only, selective reuse with provenance | Confirmed; README, AGENTS, reuse-ledger and successor/reuse |
| Multiplatform from day one; web implementation first, macOS primary target and next, then iPhone/iPad | Owner-selected sequence (231); platforms and P01–P12 |
| Focused editable preview, single-stroke move/scale/delete; no rotation/multiselect | Confirmed; objectives and successor/README |
| Local developer preview, distribution separately | Confirmed; objectives and S09 |
| Shared Rust commands/behavior; native controls/layout; future agents use same semantic boundary | Confirmed direction; AGENTS, contracts CT-01–CT-03; agent execution deferred |
| Typed FFI/generated declarations replaces custom binary command packets | Confirmed direction; CT-04 and platforms; actual ABI/JNI/Wasm signatures pending review |
| Skia selected, including web CanvasKit; no minimal feature build or Vello production path | Confirmed direction; platforms and successor/reuse; concrete host integration still reviewed |
| Composition, native presenters, explicit state machines and narrow adapters | Viable design proposal carried forward; successor/architecture; exact types/dependencies reviewed in S02 |
| One state owner, immutable cross-worker data, bounded queues, no blocking ink path | Required invariants; AGENTS, CT-03/CT-04; macOS starting topology selected in R10; detailed scheduling and other hosts pending |
| Main-thread macOS editor/Skia plus file/log workers | Owner selected A on 2026-10-16, with early performance checkpoint; not measured or universal; successor/architecture |
| f64 world coordinates/transform calculations, viewport rebasing and bounded geometry caches | Selected in decisions 13/33; exact limits, conversion and performance remain reviewed/measured |
| New native document, no Native Sketch compatibility | Confirmed; CT-05 and successor/formats; SQLite container owner-selected; concrete schema/lifecycle pending |
| Native snapshot + PNG export | Owner selected decision 18; SVG/PDF deferred; concrete export contracts/design review pending |
| Structured action/outcome logging with correlation, privacy and bounds | Required; CT-07, AGENTS and quality |
| Shared contract conformance plus native E2E, same scenarios/fixtures/assertions | Documentation approach requested; contracts and testing/shared-e2e; no executable tests yet |
| 200 physical lines per handwritten source/test/script; no cosmetic splitting | Confirmed; AGENTS and quality |
| Node native .ts automation, Oxc tools, native language tooling, no owned shell/PowerShell/Python orchestration | Confirmed direction; quality; exact supported versions selected when tooling is installed |
| design review owner approval before new screens/tools, platform-specific design coordination | Required; AGENTS, roles and S00; no approved frames yet |
| Existing specialists own quality; fresh independent review; no extra permanent quality agent | Required workflow; AGENTS and role files |
| Real host evidence, reserved foreground checks, no inherited permissions or old passes | Required; AGENTS and quality; no current reservation |
| TV/Watch view-only; Watch standalone-capable with iPhone preferred and later network fallback | Planned direction; platforms/P07/P08; server/account/credential model remains deferred |
| ChromeOS through Android/web, no unverified separate GooglebookOS SDK assumption | Planned route; platforms/P09 |
| Future development workbench/Zed and reusable report output | Deferred product; bootstrap preserves reusable report direction, no dashboard now |

## Gaps closed by this documentation update

Previously these topics were scattered through prose rather than defined as a reviewable
catalog. Added explicit contract IDs/owners, invariant IDs, shared E2E scenario/driver boundaries,
capability applicability, semantic/visual assertions, discovery/result freshness and
platform-specific supplements. Updated task dependencies and specialist responsibilities.
Also made undo/snapshot retention and recovery quota policy explicit review items, alongside
existing queue/cache/log bounds. These are safety/design questions, not approved new features.

## Remaining review areas after decisions 1–29

The main directions are selected; this is a grouped review inventory, not a claim that every
technical setting is finalized. The owner reconfirmed rusqlite after discussing browser disk
persistence/WAL on 2026-10-16. No implementation or browser storage runtime was authorized.

1. Concrete persistence packet: DBML catalog/document tables, field types/IDs/indexes/constraints,
   revision ownership, safe create/import/delete/rebuild/migration sequences, recovery-copy
   retention and snapshot publication. SQLite, per-sample rows, separate transforms, metadata
   authority, automatic lossless upgrades, macOS WAL and durable Saved policy are settled.
2. Rust/native interface packet: exact typed functions and generated declarations, generator,
   handles/borrowed buffers/results/errors/panic boundaries, query/update/effect delivery and
   stale-result/thread checks. Named entry points/shared Rust commands are already selected.
3. Numeric/input packet: finite f64 is selected (decision 33); bounds, unit mapping, transform
   composition, pressure-to-width curve/basic smoothing and prediction semantics, selection
   tolerances. Logical units, pressure pen and user-visible transform direction are settled.
4. Operational/quality packet: queue/history/cache/log limits, batching/retry/checkpoint timing,
   overload/cancellation/headroom, event fields/retention, provisional performance thresholds
   and concrete acceptance fixtures. Preserve selected ownership, logging/privacy and no-blocking
   input constraints; values need justification and later measurement, not guessed guarantees.
5. Foundation/portability packet: exact tested dependencies/toolchain/features, generated-output
   checks, minimum macOS target and browser persistence feasibility plan. Rusqlite is selected;
   browser VFS, journal mode, worker arrangement and durability capability still need review.

design review is a separate required approval: foundations and gallery/editor/export/recovery flows,
resizing/AX/i18n/motion and remaining details such as default names and PNG settings. These
can be proposed together; do not restart settled scope choices or invent extra features.
The available Mac/Cintiq is the selected verification baseline, not evidence of tests run.

Deferred: other-platform concrete UI/ABI/thread details, cloud/auth/sync/AI permissions,
Watch/Wear acquisition, distribution and physical latency camera work. Do not block the local
macOS preview on fully designing those systems, but preserve required portability seams.

Review one material choice at a time when the owner requests it. Specialists prepare concrete
interfaces, diagrams and test cases for approval rather than expanding an unbounded list of
abstract settings. Exact schema/ABI/design review approval remains required before implementation.

Audit repairs also removed stale name/path/setup instructions, restored the agreed exact
TypeScript subset and added tooling-selection requirements for Kotlin/Android, C#/WinUI,
GTK/Linux, browser/Wasm and Apple hosts. Documentation/config parsing and independent review
are scaffold checks, not proof of product behavior or installed-client agent compatibility.

## Later clarification in this session

Zed tasks are now selected; a custom extension is not planned. Node .ts/Vite/Oxc responsibilities, optional shell-based zx, detailed logging and design review approval records have dedicated documents. Day-one reusable action/report planning is included in DX00; executable task launchers follow S01, and rich workbench UI remains a later approved slice.

Additional explicit requests: Android TV/Google TV and Android XR placeholders are tracked by P10/P11. S00A now requires shared design foundations/native mappings and real resizable design review mockups before detailed screen approval. Visual choices/design versions remain unapproved; no universal custom widget system or new product feature is implied.

## Internationalization gap closed

Earlier adaptive design only mentioned long labels. Added explicit CT-09/INV-11/SU-20, native resource ownership and typed errors, locale/region separation, plural/fallback rules, Unicode/IME/shortcut handling, locale-safe numeric fields, RTL chrome versus unchanged artwork, source/catalog/translation review status and shared locale evidence. S00B records pending language/resource decisions; no real locale is certified.

Current open-choice walkthrough: [planning review](planning-review.md), R01–R14. A requested competitor_researcher role supplies evidence to the owner and designer (S00C); it is not another implementation-quality authority. All new recommendations remain pending.

Owner-selected updates: English initial app/source/fallback; Wear OS target/P12; separate UX and UI design roles per design/roles.md. Wear UI toolkit/capabilities/acquisition remain proposals; regional formatting is independent of English UI.

Architecture review decision 2: owner selected four focused Rust crates on 2026-10-16. See
decisions.md for dependency boundaries. This does not select threading or a concrete ABI.

## Current status after decision 146 (supersedes earlier open-question counts)

All issued numbered questions Q1-61 are answered. Q60 A selects no application-level encryption
for the initial local preview; standard SQLite, sandbox/privacy rules remain. Future cloud security
is independent. The historical inventory above contains items since settled; consult decisions.md
and planning-review.md's current outstanding inventory rather than reopening those choices.

Remaining review packets: S00E security/role recommendation; S00F platform input and shared binding
matrix; S00G store/day-zero requirements; concrete S02 DBML/ABI/coordination/lifecycle/budgets/toolchain;
and identified design foundations/screens/motion. Product-emphasis and OS-selected-language details
remain UX/i18n proposals. These need owner review with evidence/options, not an invented target
number of further questions. No implementation, design review approval or security/compliance pass is implied.

Decisions 147/148 close the language-at-launch and product-direction questions: OS-selected supported
language with English fallback; Concepts-inspired open-source editable vector sketcher, MacBook first.
Specific license and full feature parity are not selected. S00E architecture review is prepared and
independently assessed (security/review-record.md); no runtime security/compliance claims.
