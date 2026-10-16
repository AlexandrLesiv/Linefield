# Node TypeScript and browser tooling

Status: the owner authorized root Node/TypeScript/pnpm tooling on 2026-10-16. Root package.json, pnpm-lock.yaml, strict tsconfig and Oxlint/Oxfmt are installed with a native .ts check runner. Node 24.12.0/pnpm 10.26.0 are the verified baseline; dependencies are pinned. Vite/browser and native application tooling remain pending. zx is optional, not installed.

| Tool | Responsibility | Does not replace |
| --- | --- | --- |
| Node.js with native TypeScript support | Run owned .ts automation for builds, tests, reports and developer actions | Type checking or native platform build tools |
| TypeScript checker | Strict static checking without emitting automation JS | Runtime validation of input/report data |
| Oxlint | Lint handwritten JavaScript/TypeScript | Rust/Swift/Kotlin/C# checks or full type checking |
| Oxfmt | Format handwritten web/automation source | Semantic review and tests |
| Vite | Develop and bundle apps/web and a later approved browser workbench | Cargo/Rust-to-Wasm compilation or Node script execution |
| Rust/Wasm toolchain and generated typed bindings | Compile shared engine and expose reviewed browser boundary | CanvasKit rendering or browser E2E |
| Skia CanvasKit | Web Skia rendering | Authoritative shared Rust editing semantics |
| google/zx, optional | Ergonomic subprocess orchestration for justified shell-oriented tasks | Cross-platform process policy, quoting review or a shell-free runtime |

## Owned automation

Use .ts ES modules, explicit .ts imports and import type. Use strict erasable types: no
runtime enums, parameter properties, decorators, any casts or type-check suppressions.
Run scripts directly with the pinned supported Node runtime; still run a separate strict
TypeScript check. No owned shell/PowerShell/Python orchestration or transpiler for scripts.
Native tools such as Cargo, Xcode and Gradle remain subprocesses invoked by these scripts.

Default to Node filesystem/process APIs and executable-plus-argument-array launches with
shell disabled. Centralize cancellation, timeout, output bounds, exit status, cwd, environment
allowlist and structured job reporting. Never interpolate user-controlled paths into shell
commands. Port-specific executable discovery belongs in small adapters, not scattered scripts.

zx uses a shell and defaults to Bash; it does not remove shell availability or portability
concerns. Evaluate only where it materially improves a particular operation. Avoid embedded
shell programs disguised as TypeScript, raw/unescaped interpolation and verbose secret-bearing
command output. Preserve the same process controls and Windows tests if zx is adopted.
[Official zx configuration](https://google.github.io/zx/configuration).

Node's native type stripping runs erasable TypeScript but does not type-check it; runtime
support and type checking are separate gates. Pin a supported Node release at implementation
rather than silently following whatever global executable is installed.
[Node TypeScript documentation](https://nodejs.org/api/typescript.html).

## Browser and Wasm

Vite handles the browser development server, JS/TS assets and production bundling. Build Rust
Wasm and generated glue through the reviewed toolchain, then integrate those outputs; Vite
is not a Rust compiler. Verify generated glue/CanvasKit asset paths, deployment base URLs,
MIME types, worker loading and any cross-origin isolation requirements of the selected mode.
[Official Vite features](https://vite.dev/guide/features.html).

Run type checking and Oxlint separately from bundling. Lint maintained TS glue/UI, not Wasm
bytecode; generated sources have explicit exclusions plus generation/conformance checks.
Rust formatting/lint/tests still cover the engine. Track Wasm/JS/CanvasKit download and
compressed sizes, initialization time, memory and browser E2E. No minimal Skia-feature build
is implied by bundle measurement. [Oxlint documentation](https://oxc.rs/docs/guide/usage/linter.html).

The no-transpiler rule applies to Node automation; it does not prohibit Vite's normal browser
TypeScript transformation. Future workbench/report UI can share browser presentation modules;
it must not become a dependency of the drawing engine or native apps.

Internationalization tooling: select native resource extraction/compilation and placeholder/plural validation, pseudolocale checks and per-platform resource mapping under S01/S00B. Node .ts may orchestrate native tools; Vite/Intl/Oxlint alone do not supply a translated-message catalog or linguistic verification. No translation service or generator installed by this plan.

## Selected macOS binding generator

Decision 55 selects cbindgen to generate C headers from the Rust public C-compatible interface,
with a thin handwritten Swift wrapper. Pin a verified compatible version and generation settings
under S01; document deterministic output and drift checks. Swift wrapper code still needs its
own format/lint/size checks and boundary tests. Generated declarations do not enforce ownership,
threading or pointer safety. Exact ABI review precedes implementation/compile probes. This is a
selected tool, not an installed or passing gate. No universal cross-platform generator is selected.
[Official cbindgen documentation](https://github.com/mozilla/cbindgen).

## Application diagnostic files

Decision 65 selects rotating JSON Lines app logs with a reviewed schema. Future owned TypeScript
evidence tools may read them with bounded input/schema validation and explicit partial-tail handling.
Keep app logs distinct from test/build report payloads and retention; no viewer or upload tool is
implemented. Pin any sink dependency only after S02 contract review and implementation approval.

Decisions 112/114/115: once implementation is authorized, Node .ts runners should expose bounded
seeded generated/fuzz commit checks and longer milestone lanes, reproducible failure artifacts
and safe eligible-successful-artifact pruning with protected evidence. Define budgets/quotas first;
no scheduled jobs or current deletion. Keep unrelated dependency upgrades in separate reviewed
changes, pinned and audited; required feature/fix updates need rationale. Do not add update bots
or silently refresh latest versions. Planned runner requirements are not executable checks yet.

## Installed documentation tool (2026-10-16)

Official dbdiagram 0.6.3 is pinned in the root package with pnpm-lock.yaml and lifecycle scripts disabled. See [usage](database/cli.md) and [credential limits](database/cli-security.md). Root CLI version and DBML validation passed; existing owner CLI login remains in use. No MCP or legacy dbdocs CLI installed.

## Installed root commands

- pnpm install --frozen-lockfile: install the pinned development tools; pnpm-workspace.yaml disables lifecycle scripts and enforces engines. Never weaken this to make installation pass.
- pnpm check: native Node scripts/check.ts runs strict type checking, Oxlint, Oxfmt check and the 200-physical-line limit for scripts/**/*.ts. It does not invoke dbdiagram, native UI, app builds or network checks.
- pnpm typecheck / pnpm lint / pnpm format:check: individual checks; pnpm format intentionally formats owned tooling files only, not the existing documentation tree.
- pnpm db:validate / pnpm dbdiagram: explicit schema validation or upstream CLI commands; credential policy still applies.

The root workspace currently contains only this package; add apps/web packages when authorized, rather than generating empty package manifests for native hosts. Node runs erasable .ts directly; tsc checks types separately. No tsx/ts-node transpiler, zx wrapper, Vite app, CI or global runtime upgrade was added. The source-size gate currently covers owned scripts only; native-language gates remain future S01 work. Generic cancellable multi-platform build orchestration and evidence collection remain planned; this small bounded background check runner is not that full framework.
