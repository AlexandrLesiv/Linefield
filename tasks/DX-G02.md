# DX-G02 — shared generated documentation and independent task lanes

Type: executable leaf. Parent: DX00/S00A/S02 documentation. Status: in progress.
Branch: codex/dx-g02-shared-documentation. PR: pending. Sole integration writer: lead/current chat.
Base: e08f304e9bc08886ee936ee620d8498809869a23, explicitly stacked on DX-G01 / PR #1.
Hard integration dependency: DX-G01 first; no merge to main until parent integration verified.
Authority: decision239 and owner request. No production schema, engine or native implementation.

## Outcome

Permit independent ready tasks while PRs await owner review; document dependency/ownership rules
and actionable leaf tasks. Replace obsolete diagram tooling with shared definitions, DTCG diagram
style tokens and generated SVG/schema review artifacts. Retire unused package/scripts/source formats
without losing evidence or approved semantics. Original bytes remain in parent Git history.

Lead owns tasks/workflow/cleanup/root integration. Designer owns shared/diagrams, scripts/diagrams
and generated diagram SVGs; database_designer owns shared/schema, scripts/schema, generated schema
views and schema parity tests. These are coordinated modules of one documentation-tooling outcome;
contracts freeze before consumer work. No competing task branches or recursive delegation.

## Acceptance

- PAR-01: explicit hard/contract/independent dependencies, disjoint paths, stacked base and merge order.
- GEN-01–04: deterministic generation/drift checks, invalid token/ref rejection, escaped safe SVG,
  existing v2 appearance preserved and new parallel-workflow view reviewed.
- SCHEMA-01: preserve17 tables/146 columns/11 relationships and notes; unchanged SQL authority;
  reject malformed references and check SQL-derived data, dictionary and generated SVG drift.
- CLEAN-01: obsolete notation references removed from tracked checkout; retired CLI/dependency gone;
  no broken local links; historical evidence explicitly points to its original commit.
- VERIFY-01: root/new unit/schema tests, build and relevant browser evidence; designer+fresh review.

Security: trusted repository definitions only, strict SVG element/attribute whitelist and XML escaping;
no network renderer or runtime platform behavior. No automatic publication to former hosted service.
Owner PR review/merge required. Record final evidence and actual PR; stop at owner review.

## Verification handoff

[Evidence](../quality/shared-documentation-v1/README.md):106 root tests/type/lint/format/drift/size
pass; web build unchanged;90 app/runtime inputs match prior118-browser-pass evidence (not rerun).
23 fresh-page SVG renders have no text clipping/overlap; original18architecture SVGs byte-identical.
Designer approved presentation of the new parallel lanes and four schema views; database review
verified schema fidelity; fresh reviewer findings fixed. Current link/retired-notation audit is clean.
