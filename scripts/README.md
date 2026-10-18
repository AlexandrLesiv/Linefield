# Repository automation

Owned automation is native Node TypeScript (.ts ES modules), without a runtime transpiler. Run pnpm check from the root for types, lint, formatting and the 200-line scripts limit. scripts/check.ts orchestrates those local checks with shell disabled and a two-minute bound per child. Root checks include local diagram/schema generation drift and parity tests; no external schema CLI or credentials are required.

Native builds, tests, broader process orchestration and structured application evidence are not implemented. Follow AGENTS.md and docs/tooling.md before adding runners. Runtime implementation remains separately authorized.

The bounded local check CLI is scripts/action.ts; see docs/developer-actions.md. Disposable S02 mathematical evidence lives under probes/regional/, runnable with pnpm probe:regional and tested by root checks. It has no application consumers and does not establish a supported geometry envelope or production implementation.
