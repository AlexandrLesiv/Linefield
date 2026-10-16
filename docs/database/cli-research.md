# CLI and MCP research — 2026-10-16

Recommended and installed: official dbdiagram CLI 0.6.3. It synchronizes DBML/layout and publishes dbdocs. The older dbdocs CLI is deprecated, with updates ending in 2027. [Official CLI](https://docs.dbdiagram.io/cli), [dbdocs](https://docs.dbdiagram.io/dbdocs/).

No official MCP server was found in vendor documentation checked. A community [jtprogru/dbdiagram-mcp](https://github.com/jtprogru/dbdiagram-mcp) wraps the public API, requires paid-plan API access and a workspace-wide token, and exposes diagram CRUD/embed tools. It is not installed or security-reviewed and does not replace the official publishing CLI. Prefer the smaller CLI workflow here. [Public API scope](https://docs.dbdiagram.io/api/v1/).

Do not assume API tokens and CLI tokens are interchangeable. No token is stored in these project files. Follow [credential guidance](cli-security.md); normal same-user CLI execution is not a secret-isolation boundary.
