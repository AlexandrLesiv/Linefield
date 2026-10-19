# DX-C01 — Repository source cleanup

Type: executable leaf. Status: awaiting owner review. Owner: lead/current chat.
Branch: codex/dx-c01-repository-cleanup. Base: b866b09; stacked on DX-T02 / PR #4.

## Scope

Owner requests current-only source documentation, externally retained research, ignored generated
previews and run artifacts, removal of handoffs and superseded proposals, and tests restricted to
the primary application. Agent reviews are not owner acceptance. Keep current authored visual
references, app test coverage and experiments required by unresolved storage/engine decisions.

## Acceptance

- CLEAN-01: no generated documentation, verification captures/logs or handoff snapshots tracked.
- CLEAN-02: generators and task validation work from a checkout without generated output/evidence.
- CLEAN-03: current authored contracts and visual references remain available; obsolete versions
  and retired-tool inventories are removed, with active references repaired.
- CLEAN-04: developer-tool suites removed; primary-app semantic and browser checks preserved.
- CLEAN-05: research retained outside the repository, with independent review of the final diff.
- CLEAN-06: inspect deleted quality READMEs individually; retain maintained verification guidance,
  acceptance mappings and unresolved findings. Run logs and generated artifacts stay excluded.

Retire the HTML task tracker. Keep readable task briefs and structured JSON links without a task UI.
No product behavior, storage adoption, approval boundary, history rewrite or main merge is included.
Keep reports local; attach results in the PR description. Owner reviews and merges the PR stack.
