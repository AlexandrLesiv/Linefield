# Repository automation

Owned automation is native Node TypeScript (.ts ES modules), without a runtime transpiler. Run pnpm check from the root for types, lint, formatting and the 200-line scripts limit. scripts/check.ts orchestrates those local checks with shell disabled and a two-minute bound per child. Run schema validation separately with pnpm db:validate because upstream CLI credential lookup/telemetry is outside ordinary checks.

Native builds, tests, broader process orchestration and structured application evidence are not implemented. Follow AGENTS.md and docs/tooling.md before adding runners. Runtime implementation remains separately authorized.
