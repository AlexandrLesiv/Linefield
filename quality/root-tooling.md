# Root Node/TypeScript/pnpm setup

Date: 2026-10-16. Scoped owner authorization: remove tools/dbdiagram and set up Node/TypeScript/pnpm at the Linefield root for future scripting. No application implementation. S01 partial; SU-01/SU-18 tooling evidence only, not full acceptance. No Git revision yet; exact source hashes below.

## Security impact and scope

Development tooling/dependency change; existing documentation-CLI boundary retained. DBML stays input to pinned dbdiagram 0.6.3. New strict TypeScript/Oxc tools process repository-owned source/configuration. Root package is private; no app runtime, network service, credentials, system settings, native permissions or new publication destination. Dependency lifecycle scripts disabled in project configuration and installation. Owner credentials were not read/copied/reset. CLI current directory changes to root; old directory contained only package files, README and dependencies, with no unexpected files. Existing CLI credential/telemetry caveat remains in docs/database/cli-security.md.

Applicable SEC-03/04 native/peer interfaces unchanged. Existing supply-chain/dependency review obligations apply; exact packages and lockfile are committed-source candidates, not proof of upstream safety. No application threat-model change; authentication/publication remains separate from pnpm check. Native/FFI/database authority contracts untouched.

## Evidence

Host: macOS; Node 24.12.0, pnpm 10.26.0. TypeScript 7.0.2, Oxlint 1.88.0, Oxfmt 0.73.0, @types/node 24.19.2; existing dbdiagram 0.6.3 retained. Versions resolved from the official npm registry, installed with lifecycle scripts disabled. No global tool upgrade.

- Root installation and frozen lockfile reinstall: passed. Effective ignoreScripts/engineStrict settings: true.
- Clean disposable offline frozen install and pnpm check: passed.
- Strict type check, Oxlint, Oxfmt check, <=200 physical lines in scripts/**/*.ts: passed.
- Disposable incompatible-type fixture: TS2322 and nonzero check result, passed.
- Disposable 201-line source: size rejection and nonzero check result, passed. Fixtures removed.
- Root dbdiagram --version and db:validate: passed before old installation removal; schema remains unchanged.
- pnpm audit: zero reported advisories at check time (135 dependency entries); this is not a full security audit.
- Database-designer TOML parses. No local rendered diagrams added; no dbdocs publication required for tooling relocation.
- Independent read-only review by s02_packet_review: no actionable findings; independently reran pnpm check successfully against the exact tooling hashes below. Clean-install and negative checks were lead-run, not independently reproduced.
- Not run/not implemented: app builds, native E2E, Windows execution, browser/Vite/Wasm builds, general process cancellation/evidence framework and broader source-language gates.

## Exact tooling snapshot

| File | SHA-256 |
| --- | --- |
| package.json | 4381d23506a04a9d0c50dd8937f97b844ba607bae0b540b47d40668196a41144 |
| pnpm-lock.yaml | c6683a54a2208d9a7f3f277735ebd78d75267d04239347e40578a10c61c01af9 |
| pnpm-workspace.yaml | cca2760c158e74d6640048789d04ed9367f5efdae45c9f1bb6437adb0a68a0ef |
| .node-version | 38d8d1f43fc6a2759abe574ea7a05eae49e3b894110006ec85dba94603c5e226 |
| tsconfig.json | bc16c06350db1454f685463b5b83c3703a126c0b584c906eee7ef4c9f8c8cd95 |
| .oxlintrc.json | f17fad61781c2916b5280842d9432735dd24291c442b57208fb07093345e260a |
| .oxfmtrc.json | 6b380994ae171521d31a3e92447de7e80a8cfdff7ced1e4787a26ce98dcfe6ae |
| scripts/check.ts | 936d0958a5db8bd88be5d90e2a84921c89e5c2c6f7602d09952b1ebf4236ac08 |
