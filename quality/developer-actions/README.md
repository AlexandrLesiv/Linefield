# Local developer action evidence — 2026-10-18

DX00/S01 bounded runner; CT-07/CT-08, INV-09, partial SU-01/SU-18. Contract: docs/developer-actions.md. Base revision fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved dirty working tree.

Full pnpm check passed: 24 existing shared-resource tests and 22 action tests, root/web types, lint, formatting and source-size gates. check.log records discovered IDs and results. results.json records all five installed-tool checks, each passed with identical before/after fingerprint 6e3ccf867e75a2d0f2416dda9e85b04a29c1f4a661dd28ce33a46ae02f2928a7. Reports include host, Node/tool version, timestamp and unique job ID. No retries/skips.

Tests exercise invalid input, fixed argv, native compiler missing/mismatch, failed/missing child, forced termination, cancellation race, flood/privacy, snapshot limits/staleness, distinct jobs, sink failure and missing generated resources without bootstrap. Tests run headlessly on macOS arm64; Linux is unverified and Windows unsupported. This is developer CLI evidence, not browser/native application E2E or Zed UI evidence. Endpoint hashes do not prove atomic source snapshots.

Independent implementation/security review passed after fixing ancestor-symlink traversal, omitted checked configurations and late cancellation during metadata collection. Reviewer independently ran the complete check and recomputed the recorded fingerprint, then verified all five reports against it. No unresolved findings within this scope. No app behavior or dependency changed. Subsequent DX01 launcher changes have separate evidence in quality/zed-tasks/.
