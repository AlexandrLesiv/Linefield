# DX01 launcher evidence — 2026-10-18

CT-08, DX-ZED-001, partial SU-01/SU-18. Base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved dirty tree. Five project-local launchers invoke only the reviewed action CLI with fixed IDs. No global editor configuration, dependency, application behavior or foreground automation changed.

Final pnpm check passes:24 shared tests and23 action/configuration tests, no failures/skips, root/web types, lint, format and200-line gates. check.log contains exact discovered IDs. results.json records five actual CLI checks on macOS arm64, all passed/fresh/cancelled=false with distinct jobs and fingerprint064904d46c2e4fef6aad4bfd92874b033e684c943c08472f110be85afffd308a. Node/tool versions and timestamps are in reports. These are CLI runs, not Zed executions.

The first conformance attempt failed because a typed for-of binding was invalid in Node native TypeScript; moved the annotation into the loop body, reran the complete check, and obtained the final passes above. This was an implementation correction, not a flaky-test retry or suppressed failure.

Independent reviewer verified the corrected test, independently ran DX-ZED-001, inspected final full-check evidence and compared configuration with official https://zed.dev/docs/tasks on2026-10-18. Static configuration review passed with no unresolved finding. Earlier DX00 implementation/security review and source snapshot remain recorded separately in quality/developer-actions/.

Actual Zed focus, terminal reuse, workspace path handling, selected Node executable and cancellation propagation remain UNRUN. reveal:never requests focus preservation; save:none checks disk only. Concurrency exclusion is per task. Zed shell mediation is distinct from the runner's shell:false child spawn. No native jobs exist and no cross-task native lock is claimed. See tasks/DX01.md for limitations and future editor verification.
