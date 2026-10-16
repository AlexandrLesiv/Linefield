# Successor reuse inventory

Audit source: `/Users/oleksandr/projects/native-sketch`, commit
`3b580873ded3fea63d0220a53d7c5ece66c5d897`. Paths below are relative to that repository.
Reuse means inspect, selectively copy with provenance, adapt and rerun relevant tests.
It never means importing a dependency on the old checkout or inheriting its acceptance.

| Existing area | Disposition | Reason and requalification |
| --- | --- | --- |
| `crates/sketch-core/src/model/`, `geometry/` | Selective reuse | Document values, coordinate handling and stroke geometry are useful; remove legacy storage coupling, test finite and extreme coordinates |
| `crates/sketch-core/src/interaction/`, `history/` | Adapt | Preserve actual/corrected/predicted distinction, transactional cancellation and one-operation undo; add move semantics and tests |
| `crates/sketch-core/src/application/` | Adapt into one editor owner | Keep command validation, action availability and revision policy; eliminate competing application facades |
| `crates/sketch-core/src/scene/` | Adapt incremental paths | Preserve viewport-relative precision and immutable scene ideas; avoid full-document traversal or cloning per input/frame |
| `crates/sketch-core/src/persistence/` | Rewrite codec; retain validation lessons | New schema and fixtures; no `NSKETCH1` reader, byte compatibility or legacy conversion |
| `crates/sketch-core/src/tests/` | Reuse test intent selectively | Input ordering, atomic batch rejection, editing and property cases remain valuable; old fixtures may encode behavior deliberately excluded from the successor |
| `crates/sketch-services/src/storage/`, `recovery/` | Adapt | Staged writes, failure outcomes, recovery and operation ordering; test against new format and app identity |
| `crates/sketch-services/src/diagnostics/` | Adapt | Bounded, redacted structured events; verify sink failure and correlation rather than copying all old reporting infrastructure |
| `crates/sketch-services/src/native_runtime/` and `crates/sketch-app/` | Reference only; replace composition | Useful ownership/cancellation lessons, but do not reproduce two overlapping runtime/session owners |
| `crates/sketch-native-ffi/` | Reference typed boundary; regenerate | Opaque handles, thread checks and lifetimes inform new contract; no old symbol compatibility obligation |
| `crates/sketch-renderer/` | Adapt Skia/Metal implementation | Keep full normal Skia configuration, validate resource ownership, surface recreation and cache keys; old performance claims do not transfer |
| `apps/macos/Sources/NativeSketch/` | Recompose native host | Preserve known native behavior and focus fixes; do not copy the entire controller/manager graph |
| macOS native E2E and gesture helpers | Adapt cases and stable-runner lessons | New bundle identity, permissions and selectors; no inherited TCC trust or old pass evidence |
| `scripts/`, `quality/`, `.codex/agents/` | Select minimal tooling and instructions | Keep native Node `.ts`, evidence schema, source cap, ownership and review gates; omit unrelated host runners and historical tasks |
| `crates/sketch-app-wire/`, packet paths in app bridge/FFI/JNI/Wasm | Discard as successor production architecture | No opcodes, packet layouts or command serialization; selected lifetime/error tests can be rewritten for typed API |
| `crates/sketch-ffi/`, `sketch-wasm/` and non-macOS app prototypes | Reference only | No first-preview consumers; avoid bringing unused adapters into the new dependency graph |
| Vello experiments and renderer comparison machinery | Do not import | Skia selected; retain old historical evidence in the old repository |
| `apps/workbench/`, `.zed/` integrations | Defer | A drawing app should not depend on its development dashboard |

## Reuse ledger

For each copied component, record old commit/path, new path, license/attribution,
reason, changed semantics, removed dependencies, associated acceptance IDs and new results.
Review third-party licenses and generated-source provenance before copying. New files
must satisfy the 200-line source limit without cosmetic splitting or compressed formatting.

Do not transfer old “done” statuses, benchmark numbers, screenshots, recorded test passes,
build products, signing material, permission databases, machine paths or generated binaries.
Portability and performance must be earned again on the new application revision.

## Rewrite risks to keep visible

- Existing save/recovery and focus repairs are easy to lose in a cleaner-looking UI.
- Main-thread snapshot creation may still clone an entire document even if encoding is
  asynchronous; inspect allocation and copy costs rather than merely moving the encoder.
- A shorter source file is not proof of a cohesive responsibility or simpler lifetime.
- Moving a stroke is new behavior. Selection/scaling tests do not establish its correctness.
- A shared model does not automatically make every future native integration production-ready.
- Removing old file compatibility is approved; removing required preview behavior is not.
