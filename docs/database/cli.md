# Root database documentation CLI

Installed by explicit owner request, 2026-10-16. Official dbdiagram **0.6.3**, exact devDependency
and root pnpm-lock.yaml. This tooling exception does not authorize Linefield application implementation.

Owner-operated commands from the Linefield root (agents require an externally constrained runner
for strict credential isolation; see the security note below):

```text
pnpm install --frozen-lockfile
pnpm run dbdiagram --version
pnpm run db:validate
```

The pnpm script runs the pinned local executable with the Linefield root as its working directory.
No global install, unpinned npx download, shell wrapper or MCP server is required.
Important: this CLI attempts credential lookup and usage telemetry even during validate. It is not
an offline/no-secret-access guarantee. Do not run it in an agent-accessible credential environment
when strict isolation is required; use an externally constrained runner or owner-operated command.
Node 24.12.0 and pnpm 10.26.0 are the verified development baseline; see the root package manifest.

Only an authenticated operator with appropriate authorization should publish:

```text
pnpm run dbdiagram build document --from-file docs/database/review.dbml --project AlexandrLesiv/Linefield-S02-proposal-v1 --version-name "S02 proposal v1"
```

This command uploads the schema and notes and creates a hosted version. It does not make
the schema approved or implement SQLite migrations. Verify private access after publishing.
Browser inspection can review visuals/privacy; schema validation and synchronization use this CLI.
Do not confuse the dbdocs project ID with a dbdiagram diagram ID.

For remote changes, use CLI pull into a disposable comparison file, inspect the diff and reconcile
the canonical individual schemas before regenerating review.dbml. Never pull over local edits.
The CLI's layout synchronization applies to supported diagram sources; a local .dbdiagram layout
was retrieved through the CLI after owner login and is now saved as docs/database/review.dbdiagram.

Credentials and enforcement: [CLI security](cli-security.md).
Vendor reference: [CLI](https://docs.dbdiagram.io/cli), [dbdocs](https://docs.dbdiagram.io/dbdocs/).
Owner completed CLI login on 2026-10-16. Authenticated pull and private publication passed afterward; agents did not generate tokens or directly inspect credentials. Strict credential isolation remains unconfigured.

The standalone tools/dbdiagram package was removed at owner request. The CLI version remains 0.6.3; only installation location and command working directory changed. Run from the project root, and use root-relative DBML paths. Authentication was not copied, read, reset or regenerated. Ordinary quality checks do not invoke dbdiagram; schema validation remains explicit because the CLI may look up credentials and send telemetry.
