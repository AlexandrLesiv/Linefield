# DX-T01 — Application theme DTCG parity migration

Type: executable leaf. Parent: S00A / DX00. Status: contract-blocked until DX-G02 token subset review.
Branch: codex/dx-t01 (not created). PR: not opened. Writer/worktree: unassigned.
Authority: owner-requested autonomous contract/probe work and decision239; production gates retained.
Dependencies: Hard integration dependency DX-G02; can inventory current palette/resources read-only meanwhile.
Owned paths: shared/theme/**; scripts/theme-resources/**; scripts/theme-validation*; apps/web/src/theme.css.ts; quality/theme-dtcg/**. Global index/decision-log edits are coordinated by the lead.
Base: record actual verified revision before claiming Ready for implementation. If DX-G01 is
unmerged, explicitly stack on PR #1 and integrate parent first; do not claim this is main.

## Outcome and limits

Make supported DTCG JSON the single application style source while retaining typed adapters and semantic IDs. Preserve every resolved light/dark value and generated host resource. Keep locales in TypeScript. No visual redesign or native runtime rollout.

## Acceptance TOKEN-PARITY-01

Byte-identical native resources; semantic and alpha parity; malformed token/reference rejection; build and affected browser regressions; designer/reviewer signoff.

Security: repository tooling/synthetic or documentation scope only; no actual user drawing,
credential, IPC service or production mutation. Preserve failure artifacts and do not weaken gates.
Use a separate worktree and one writer; do not modify another task's owned paths. Implementer owns
feature tests; independent reviewer checks scope and evidence. Material ABI/schema/security changes
remain proposed until owner approval. Stop when the bounded deliverable is reviewed and PR is open.
Owner merges; verify actual integration before declaring Done. Next task need not wait if independent.
