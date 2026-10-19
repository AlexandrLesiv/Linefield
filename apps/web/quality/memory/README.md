# In-memory web foundation verification

P05-E01 implements the empty owner and presentation foundation. Pen input, drawing settings,
history operations and pan/zoom remain P05-E02. Retention evidence therefore concerns an empty
owner across navigation, not completed strokes or Undo history.

## Repeatable commands

Use the pinned Node/pnpm/Rust toolchain and install wasm-bindgen CLI 0.2.129 at
`.build-cache/tools/bin/wasm-bindgen`. From the repository root:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
cargo fmt --all -- --check
cargo clippy --locked --offline --target wasm32-unknown-unknown --all-targets -- -D warnings
pnpm --filter @linefield/web test
pnpm --filter @linefield/web run test:memory-fixtures
pnpm --filter @linefield/web build
node scripts/web-memory/audit.ts
```

Test-only browser pages and helpers live in `apps/web/tests/fixtures/memory`; application
code lives in `apps/web/src`. The production and isolated fixture builds use distinct Cargo targets, generated bindings,
assets and HTML entry points. Always rebuild production after fixtures and run the release
audit. The audit inspects actual Wasm exports, generated declarations/glue, the built manifest,
release chunks and script policy. Ordinary app E2E additionally checks that the fixture URL
does not expose its controls. No runtime URL/global switch enables faults in production.

Browser tests start fresh local servers with reuse disabled. They run headless Chrome; no
foreground desktop permission is assumed. Reports/captures stay in ignored
`apps/web/test-results`; runtime build identity stays in `.build-cache/web-memory/*/build.json`.
Record Git revision/dirty source identity, build hashes, browser version, host and backend with
the PR evidence. These commands do not themselves establish owner acceptance.

## Acceptance ownership and evidence

| IDs | Evidence and concrete failure cases |
| --- | --- |
| WMR-01, CT-06 | Real Rust/Wasm and pinned CanvasKit load from local production assets; ten typed commands; fixed-light named canvas, loading and permanent not-saved disclosure. |
| WMR-02, CT-08 | Ordinary UI Back/Forward/Resume, delayed loader completion, focus preservation, cold temporary URL/reload, gallery scroll and existing sample navigation regression. |
| WMR-03, CT-04, INV-01/08 | Isolated browser boundary actions reject hostile scalar kinds/ranges before coercion, preserve lifecycle state on invalid metrics, enforce one live snapshot, copied one-shot IDs, stale session/presentation rejection, bounded generation/sequence exhaustion. Ordinary UI covers zero/invalid size and real context loss/restoration; no sample-batch acceptance is claimed. |
| WMR-04, CT-06/07 | Isolated real trap leaves a fatal tombstone; Back/Resume issue no further Rust calls. Actual surface allocator/publication failures preserve or explicitly fail restoration. Cleanup continues after a thrown deletion and reports uncertain release. |
| WMR-05, I18N-LAUNCH-002, I18N-UK-002 | English/Ukrainian desktop/narrow/short captures, enlarged Ukrainian disclosure/Retry/gallery reachability, named disabled controls and focus. Designer review is separate from assertions. |
| WMR-06 | Bounded real CanvasKit scene calibration, output parity, lifetime/ownership accounting, maximum-area successful allocation and injected actual resource failure. These are isolated browser fixture actions, not pen interaction E2E. |
| CT-07, INV-09 | Diagnostics allowlist excludes content/coordinates/path data; fixed saturation exceeds 100 records, reports drops, and retains bounded output. |

## Resource experiment and limits

The fixed seed is `0x4c463031`. RGBA_8888/Premul/sRGB surfaces are 1024×768 and 4096×2048.
Each runs dot (one circle), short (32 circle/quad elements), long (65,537 elements), and many
(1,024 complete paths with eight elements), in cold/warm/evicted modes: 24 result rows.
Paths are filled as complete paths, never one draw call per segment. Optional cached paths use
a 16 MiB serialized-command estimate; it is not exact native path allocation.

Readback/hash parity runs outside timings. `publicationCpuMs` includes building/drawing,
staging flush/snapshot and front publication CPU submission. It is neither GPU time nor physical
display/pen latency. At maximum area the readback and explicit hash input copy coexist, at least
64 MiB of JS pixel buffers; cryptographic internal copies are unknown. Public pinned Gr cache
getters return undefined and are reported unavailable. CanvasKit heap capacity remaining after
deletion is not a leak or actual resident-memory measurement.

The four-RGBA-backing estimate is 12 MiB/128 MiB, excluding stencil, driver and cache overhead.
Successful maximum-area publication exceeds the 96 MiB graphics soft target by that estimate;
actual GPU bytes are unavailable. It does not prove exceeding the 320 MiB CPU target. Targets
do not automatically stop work. Zero owned-handle counters prove successful deletion attempts,
not physical driver deallocation; thrown cleanup remains explicitly uncertain.

Rust `State.cpuCharge` reports the model's owned struct size only. Snapshot reservation is 256
bytes; Rc/control block, generated WasmRefCell/wrapper, allocator overhead and Wasm heap capacity
are separate and must not be mislabeled total CPU usage. Snapshot creation occurs before core
mutation; generated glue inspection remains part of independent boundary review.

The final long synthetic path run showed approximately 143–177 ms CPU publication and up to 101 ms
single-path submission on the reviewed host. This is an unresolved P05-E02 responsiveness risk,
not an interactive latency pass, renderer switch decision or foundation rejection threshold.

## Provenance and security

CanvasKit 0.41.1 stock Wasm is 7,159,342 bytes with SHA-256
`bd669c88bd033eaf62d673103a42231a737c6d12e4cc99f8548b2784b5772430`.
The build verifies it and ships dependency notices. Rust/Wasm bindings pin wasm-bindgen 0.2.129;
no project license is invented while the owner's project-license decision remains pending.
Production CSP allows Wasm compilation without general script `unsafe-eval`; local assets and
no fault entry are checked separately. Dependency advisory scans do not prove Wasm safety.

The isolated fixed fault controls have no arbitrary command protocol. Tests cover delayed
load→Back→Resume, same-size replacement→old acknowledgement, dispose→new owner→old callback,
sequence exhaustion, usable-context restoration failure and terminal cleanup. Process/browser
kill recovery is unavailable for an in-memory drawing and is not simulated as durability.
