# Linefield

An editable vector sketching app: responsive, offline-first, open-source in intended distribution, and cross-platform. macOS remains the primary product target, with native AppKit controls. Develop web first, then macOS, because the owner has the most experience with web; iPhone/iPad remains the next native priority. Shared Rust behavior and Skia rendering (CanvasKit on web) remain selected. See [platform plan](docs/platforms.md) and [apps](apps/README.md).

Status: a runnable, memory-only web gallery design prototype plus shared catalogs and development tooling. The editable Rust/Wasm drawing app, durable storage and native applications remain planned; the prototype is not a working drawing editor.

Start with [AGENTS.md](AGENTS.md), [objectives](docs/objectives.md), [decisions](docs/decisions.md), [task board](tasks/README.md), [quality requirements](docs/quality.md) and [resume instructions](docs/RESUME.md).

The [successor review packet](docs/successor/README.md) contains architecture diagrams, reuse analysis, format options and acceptance cases. Its proposals are not implementation approval. Creation of this scaffold does not approve a concrete ABI/schema/thread topology, exports or an unshown Figma design.

This is a separate project. Native Sketch is read-only reference at /Users/oleksandr/projects/native-sketch, commit 3b580873ded3fea63d0220a53d7c5ece66c5d897. No build or runtime dependency may point to that checkout.

See [folder responsibilities](docs/structure.md). Native app implementation, tests, benchmarks, remote repository and release publishing remain pending.

Review [contracts](docs/contracts.md), [shared E2E scenarios](docs/testing/shared-e2e.md) and
[the architecture decision audit](docs/architecture-decisions-audit.md) before task planning.

Day-one foundations: [logging](docs/logging.md), [Node/Vite tooling](docs/tooling.md), [Figma workflow](docs/design/workflow.md) and [Zed tasks/developer experience](docs/developer-experience.md).

Internationalization is a day-one requirement: [architecture and platform guidance](docs/internationalization.md), [locale test matrix](docs/testing/internationalization.md), and [S00B decisions](tasks/S00B.md).

Current review: [remaining decisions and recommendations](docs/planning-review.md); [competitor research workflow](docs/research/README.md). Recommendations remain pending owner review.

Owner decisions and approvals: [responsibility index](docs/owner-responsibilities.md).
On-demand architecture checks: [$linefield-review](docs/workflow/milestone-review.md), a project-local instruction skill; no executable runner or automatic milestone pass.

Root tooling: use Node 24.12.0 and pnpm 10.26.0, then pnpm install --frozen-lockfile and pnpm check. TypeScript scripts run directly through Node. See [tooling](docs/tooling.md) and [database CLI](docs/database/cli.md) for individual commands and credential boundaries.
