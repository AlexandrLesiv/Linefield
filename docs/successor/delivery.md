# Successor implementation and acceptance plan

All tasks below are planned, not executed. Product scope decisions are recorded in
[the review overview](README.md). No existing test result certifies the successor.
Each task ends with runnable evidence and a focused independent review, not just smaller files.

## Ordered implementation tasks

| Task | Deliverable and ownership | Depends on | Completion gate |
| --- | --- | --- | --- |
| S00 Review and design | Lead records selected scope/name/path; designer prepares versioned macOS Figma with macos_ui feasibility input | Owner review of this packet | Architecture choices recorded; new UI blocked until its Figma approval |
| S01 Independent foundation | Lead/build_reliability create separate repo, minimal four-crate workspace, AppKit target, Node `.ts` runner, provenance and feature registry | S00 project/scope approval | Clean build with old checkout unavailable; source/lint/test gates actually installed |
| S02 Concrete contracts | rust_engine + lead specify typed commands, ABI DTOs/lifetimes, thread ownership, schema, limits and failure cases | S01; can draft before creating project | Owner review of concrete ABI/schema/topology, generated-header compile probe and test design |
| S02L Gallery and library first | macos_ui native host, Rust library services; UX/UI Figma and database specialist schema handoff | S01, approved library subset of S02, gallery Figma | Durable create/list/rename/reopen, approved deletion flow, native E2E and designer review; canvas pending |
| S03 Pure editor | rust_engine selectively ports model/geometry/transactions; implements move and tested native codec | Approved S02 | Engine invariant/property tests; no native/GPU/file dependencies in model; hostile decode tests |
| S04 First native stroke | macos_ui + rust_engine integrate typed bridge; rendering_performance owns Skia review | S03, S02L, approved Figma and ABI | Native stroke, width/color state, cancellation, rendering/surface lifecycle and bridge tests |
| S05 Navigation and editing | macos_ui owns gestures/focus, rust_engine owns selection/move/scale/history semantics | S04 | Pan/zoom, move/scale/delete and one-operation undo; real native E2E and designer review |
| S06 Files and recovery | rust_engine owns policy/service; macos_ui owns dialogs; build_reliability owns fault runner | S03–S05 | Autosave/flush/import/export-copy/close/recovery E2E, revision races and interrupted-write tests |
| S07 Reliability and performance | rendering_performance measures; build_reliability wires stress/security evidence | S06 | Numeric budgets established and checked; bounded caches/logging; fault/fuzz/sanitizer results |
| S07E PNG export | Owner-selected PNG slice and reviewed Figma handoff; SVG/PDF deferred | S06, reviewed contracts/Figma | Bounds/fidelity/cancellation/memory tests and independent consumer checks |
| S08 Developer preview acceptance | Lead integrates; designer inspects; fresh reviewer audits evidence | All required tasks including S07E PNG export | All required acceptance IDs pass on declared host; known limitations and owner review packet |
| S09 Distribution | Separate distribution plan; platform backlog is P01–P12 | Preview accepted and distribution authorization | Signing/notarization/update/privacy/support matrix |

S01 may use an empty non-product test host for build/ABI probes; no unapproved tool or screen
implementation. If Figma access is unavailable, finish authorized non-UI work and leave the
UI dependency blocked. No HTML mockup or agent approval substitutes for owner Figma approval.

S02 includes class/module responsibility map, command/state diagrams, generated header example,
allocation and result-ownership policy, serialization examples, limits, cancellation and
shutdown tables, logging event schema, and migration/reuse ledger. Avoid committing a concrete
contract through implementation before the owner has reviewed it.

## Required acceptance cases

| ID | Observable requirement | Evidence required |
| --- | --- | --- |
| SU-01 | Build/run depends only on new repo and documented toolchain | Clean checkout/build with old repo unavailable; dependency-path scan |
| SU-02 | Commands, native controls and shortcuts share Rust behavior | Core command tests, bridge conformance, native control/shortcut E2E |
| SU-03 | Real samples ordered; corrected data validated; predictions never committed | Property tests, invalid-batch atomicity, replay; native mouse/tablet checks separately |
| SU-04 | One completed stroke adds one undo; cancel adds none | Core history tests and native Escape/focus-loss E2E |
| SU-05 | Select, move, scale, delete are accurate across pan/zoom | Hit/transform geometry tests; native drag/handle E2E; cancel restores exact state |
| SU-06 | One move/scale gesture adds one undo, no-op adds none | Core transaction tests plus repeated preview and undo/redo E2E |
| SU-07 | Approved tool/navigation/delete/editing bindings preserve native field behavior; S00F proposes P/V | Real text-field focus/selection/cut/copy/paste and menu E2E; Save flush and import/export-copy remain distinct |
| SU-08 | Navigation cannot draw or strand a gesture; zoom anchor stable | Core viewport tests; native pinch/scroll/resize/deactivation regressions |
| SU-09 | New-format save/open reproduces editable content; invalid/legacy input preserves current document | Codec round trips, malformed corpus, ABI tests, native Open error handling |
| SU-10 | Saving revision N cannot clean revision N+1 or another session | Deterministic worker race tests; edit-during-save native scenario |
| SU-11 | Failed/interrupted writes retain valid original or complete replacement; failures remain visible | Fault injection at write/sync/replace stages; crash restart and real panel cancellation |
| SU-12 | Dirty New/Open/close/quit and recovery preserve user choice | Native E2E for pending/failed autosave, retry/cancel and revision-safe exit; explicit recovery-copy cases distinguished from SQLite crash reopen |
| SU-13 | Wrong-thread/stale-handle/reentry errors cannot corrupt state; panics do not cross ABI | FFI conformance, controlled panic/poison tests and applicable sanitizers |
| SU-14 | Cache eviction/device-scale/resize/undo never changes content | Reference rendering with defined tolerances, cold/warm tests and surface lifecycle checks |
| SU-15 | Structured logs correlate action to outcome without sensitive data | Schema/redaction/sink-failure/overload tests and manual failure diagnosis from logs |
| SU-16 | Memory, queues, frame work and latency stay within reviewed limits | Exact-build visible-host measurements, sustained workload and failure-path measurements |
| SU-17 | Native controls are usable with keyboard and accessibility APIs | Figma-to-running-app designer review, keyboard/VoiceOver/manual checks and automated AX assertions |
| SU-18 | Source size, dependency direction, reproducibility and license policy hold | Format/lint/type/source checks, generated-declaration drift and dependency/license inventory |
| SU-19 | PNG export preserves intended appearance and enforces memory limits | PNG pixel checks and independent decoding, huge/empty bounds and cancellation tests; required by decision 18 |
| SU-20 | i18n-ready UI/input with unchanged canonical command/document semantics | Native resources/fallback, pseudo-LTR/RTL, numeric/IME/Unicode/AX and locale test matrix; real language rollout separate |

Native tests must interact with the actual app and focus system. Injected commands/replay
are valuable lower-level evidence, not a replacement for E2E. Do not claim physical tablet
latency from synthetic mouse events or software timestamps. Pro Pen 3 pressure/hover checks
require the connected device; physical pen-to-screen latency stays pending until a suitable
camera and protocol are available. This is a declared measurement limitation, not a failed
software timing test and not permission to advertise a physical latency number.

## Internationalization readiness supplement

SU-20: native resource/fallback, expanded/RTL/Unicode layout and input, localized numeric/AX behavior, and locale-independent document/command semantics must pass applicable [locale scenarios](../testing/internationalization.md). S00B plans language policy alongside S00A/S02; S04–S06 implement checks as features arrive. Full translation rollout is separately scoped. S08 requires this readiness evidence in addition to SU-01–SU-18 and conditional SU-19.

## Gallery-first acceptance supplement

SU-21: native gallery/library supports unnamed durable documents, creation, listing, rename,
open and approved deletion, with accessible keyboard navigation and visible failures. S02L owns
LIBRARY-CREATE/RENAME/OPEN/DELETE/FAILURE/NAV-001; see its task for exact scenario names. S02L
precedes S04 and owns minimal storage/metadata; S06 extends rather than replaces that service.
S08 requires SU-21 alongside existing acceptance. Gallery-only evidence cannot pass canvas tests.

## Performance acceptance method

In S02, freeze fixture IDs, resource safety caps, the measurement method and provisional
performance targets for the declared Mac. Do not claim a measured baseline before S04.
Measure the first release-mode native slice in S04 before optimizing it; extend the baseline
with save/recovery workloads in S06. Obtain owner review of resulting performance thresholds
before S07 acceptance. The suite covers:
small sketch, dense overlapping sketch, long stroke, large-coordinate navigation, active
drawing during save/recovery, repeated undo/redo and close/reopen. Initial candidates include
100 strokes/10,000 samples, 1,000 strokes/100,000 samples, and a single 65,536-sample accepted live stroke;
65,537 and 100,000 live samples are over-cap rejection cases under decision 181.

Record display/device/refresh/scale, app and dependency versions, release build, thermal and
power conditions, visibility and workload. Measure p50/p95/p99 event-to-command, frame
preparation and submission, missed frames, main-thread stalls, CPU/GPU memory, file timing,
snapshot capture and cache hit/eviction behavior. Separate software presentation evidence
from physical photons. Do not mix hidden/occluded trials with valid visible trials.
Use warm/cold caches and repeated runs; retain raw data and failures. A performance gate
cannot pass with unspecified budgets. Distinguish provisional design targets from measured
results and approved acceptance thresholds. Never loosen limits to hide a regression.

## Quality tooling and evidence

Pin a reproducible supported toolchain at S01, reviewing current primary documentation then;
this plan does not assert that an unverified version is “latest/best.” Rust: rustfmt, Clippy,
unit/property/integration tests, targeted fuzzing, applicable sanitizers and dependency/license
audit. Swift: formatter/linter, strict concurrency where supported, XCTest/XCUITest and
accessibility checks. TypeScript automation: Node native `.ts`, strict type checking,
Oxlint/Oxfmt and Node tests. No owned shell/PowerShell/Python orchestration is added.
Native build tools and Skia's upstream C++ remain dependencies, not new handwritten app layers.

Each acceptance registry entry records feature/invariant ID, discovered test IDs, lane,
platform/device, source revision/build, last result, artifact links and applicability reason.
Separate “test exists” from “test ran and passed”; missing, skipped, flaky and stale evidence
remain visible. Test controls must not ship enabled in normal builds. Keep logs/screenshots
free of private drawing data by using disposable fixtures.

## Agent workflow and stopping conditions

Lead owns scope/contracts/integration; rust_engine owns shared semantics and typed boundary;
macos_ui owns AppKit implementation; UX owns behavior/flow review; UI owns visual Figma and fidelity review;
rendering_performance owns measurement validity; build_reliability owns runners/evidence;
fresh reviewer checks correctness, security, maintainability and evidence independently.
ios_ui/android_ui/windows_ui may review portability/design now; feature implementation
follows macOS and the reviewed platform task. See ../platforms.md and tasks P01–P12.

At most three subagents and two writers; one feature in flight. Contract owner freezes
interfaces before parallel implementation. Concurrent writers use isolated worktrees within
the new repository. Every assignment states base commit, owned paths, dependencies,
acceptance IDs, failure cases, logs, evidence and stopping condition. Implementers own tests
and logging for their feature; a separate quality agent does not relieve that responsibility.

Use background checks routinely. Ask before a foreground desktop reservation unless there
is a current applicable reservation; old sessions/permissions do not carry over automatically.
After two unproductive repairs, lead diagnoses rather than looping. Material architecture
changes and new features/designs return for owner review. No automatic main merge or release.

S08 hands over a running local app, exact revision and build instructions, complete required
test matrix, designer assessment, fresh reviewer findings/fixes, performance data and known
limitations. Distribution, other platforms, camera latency and unapproved exports remain
explicitly outside this preview. No “all platforms complete” claim is permitted.

## Contract and shared scenario supplement

Apply [contract catalog](../contracts.md) and [shared E2E plan](../testing/shared-e2e.md).
S01 installs registry/discovery only when authorized; S02 reviews contracts/scenarios; S03
proves core/boundary conformance; S04–S06 implement actual macOS E2E with each feature; P01
refines shared helpers against the second platform. S08 cannot substitute replay or another
host's results for applicable native tests. Exact task briefs under tasks/ carry these duties.

Design planning supplement: S00A establishes semantic foundations/native mappings and adaptive Figma components before S00 detailed screen approval. macOS is detailed first; other platforms do not require exhaustive upfront designs. P10/P11 add Android TV/Google TV and Android XR placeholders, not implemented apps.
