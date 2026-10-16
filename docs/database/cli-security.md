Current update (2026-10-16): the owner completed CLI login and requested the grouped diagram update. Agent CLI validation, pull and publication to the previously approved private project succeeded. Agents did not directly inspect credential files/environment. This is ordinary authenticated CLI use, not strict token isolation. Earlier pending-auth statements below describe the pre-login review.

# Database CLI and credentials

Owner requested project-local CLI installation and CLI-first database-designer work on 2026-10-16.
Official dbdiagram 0.6.3 is pinned in the root package.json, with lifecycle scripts disabled on install.
No community MCP server was installed. The legacy dbdocs CLI is deprecated in current vendor docs.
[Official CLI](https://docs.dbdiagram.io/cli), [dbdocs quickstart](https://docs.dbdiagram.io/dbdocs/).

## What is and is not protected

A .env file plus .gitignore is not an agent security boundary. File permissions such as 0600
exclude other OS users, not a command runner using the same account. Instruction-only restrictions
are useful operational policy, not a technical guarantee. Moving the secret outside the repository
also is not sufficient if the agent can read that location.

Source inspection of installed dbdiagram 0.6.3 found credential lookup order:
DBDIAGRAM_TOKEN environment variable, current-directory .dbdiagram/.credentials.json, then
user-home .dbdiagram/.credentials.json. Login writes the latter JSON file with mode 0600.
This is not Keychain storage. The agent did not directly inspect credential files or environment values, print/generate a token,
or authenticate the CLI. The validation process itself attempted upstream credential lookup; its
success/failure is unknown and no credential contents were exposed. Browser sign-in is a separate session.

Environment injection hides a token from command text/history if done carefully, but does not
provide isolation from an agent controlling the same process/user environment. A shell wrapper,
separate config path, Keychain fetch wrapper or an agent-readable CLI install does not by itself
enforce “can use but cannot read.”

## Recommended current workflow

Agents edit versioned DBML and prepare exact CLI validation/publication arguments and hashes.
Source review found the CLI global pre-action calls credential resolution even for validate, and
post-action flushes usage telemetry (device ID, command/client/environment metadata). “No authentication
required” does not mean no credential lookup or no network. For the strict isolation requirement,
run validation/publishing under an externally enforced policy denying secret paths/environment
and unintended network access, or hand the command to the owner. No such isolation is configured here. Do not place the token in the project or paste it into chat. The owner handles
credential entry and authenticated publication in their own trusted environment. This reduces
accidental exposure; it is not strict isolation from unrestricted same-user agents.

For a real guarantee, execute authenticated operations outside the agent's security boundary:
a separate OS user/host or a protected publishing service. The agent can submit only a fixed
validated schema artifact and project target. The service owns credentials, pins its own CLI and
does not run agent-supplied executable code, shell commands or modified dependencies. It returns
redacted status/version URL only. A protected CI environment could provide this later, with
owner approval and workflow-change protection. No such broker, CI service or OS isolation exists
in this project now; it requires separate design/setup approval.

## Agent obligations

- Use the root pnpm-managed CLI, not browser editing/raw HTTP/community MCP for schema
  validation/sync/publication. Browser visual/privacy review remains appropriate.
- Do not open/read/search/copy credential files, .env files, tokens or process environments.
  Do not print or embed secrets in commands, logs, reports, prompts or versioned files.
- Do not run token-generation/login commands on the owner's behalf or ask for tokens in chat.
  Authentication setup is owner-operated unless separately explicitly authorized.
- Validation requires no authentication but upstream still attempts credential lookup and telemetry.
  Under strict isolation, use an externally constrained runner or return the command to the owner.
  If publish/pull needs authentication, return the exact
  command and artifact hash for the owner/approved publisher; continue local work.
- Never claim a normal same-user CLI installation enforces secret isolation.
- Publish only the reviewed schema/notes to the authorized private project. No real drawings,
  arbitrary local files, new public links, account invitations or paid services.
- Recheck dependency/authentication behavior when upgrading. Do not alter upstream package code
  to intercept tokens or bypass authentication/security settings.
- Keep node_modules and all .dbdiagram credential files ignored. Settings may contain only
  non-secret project/source identifiers. Ignore rules prevent commits, not reads.

## Verified and pending

Installed: official CLI 0.6.3, lockfile, no lifecycle scripts.
Passed: --version, --help, build document --help, local DBML validate.
Dependency audit reported zero advisories for the checked dependency set; it is not a security audit
of the vendor, credential design or every dependency.
Pending: authenticated CLI publication/pull, exported editable layout, enforced credential isolation.
The earlier local validation passed before this upstream global-hook behavior was identified;
no further CLI execution is claimed isolated. No upstream code was patched.
