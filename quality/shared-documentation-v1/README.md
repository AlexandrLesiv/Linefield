# DX-G02 shared documentation evidence

Base:e08f304e9bc08886ee936ee620d8498809869a23. Task branch codex/dx-g02-shared-documentation.
This is a stacked follow-up to DX-G01/PR #1, not a claim that its base has merged to main.

## Checks

- Root check passed:106 tests (87 existing +8 diagram +5 schema +6 SQL), typecheck, lint,
  formatting, generated drift and source-size gates. [Raw output](root-check.log).
- Web build passed with the same index-DCSOpgQJ.js / index-z7JnId1S.css asset names.
  [Build output](web-build.log). [Exact browser/runtime input parity](runtime-parity.json)
  verifies unchanged inputs against the prior118-pass suite; no new browser run is claimed.
- [Render evidence](renders.json):23 SVGs, headless Chrome155.0.8059.80, zero text outside canvas
  or overlapping text boxes. Fresh-page PNGs are local .build-cache artifacts; generated SVGs are
  published. Eighteen incoming architecture SVGs remain byte-identical. Earlier same-source
  screenshot comparisons were inconsistent, so no all-pixel-comparison pass is claimed.
- Five schema tests retain17 tables/146 columns/11 relationships and full notes. Reviewer also
  independently compared original committed source to the conversion fixture and unchanged SQL.
  Reference SQL is unchanged; jobs remain proposal-only. No production migration/engine introduced.
- [Retired paths](retired-paths.json) records20 obsolete schema files/tool documents. Duplicate
  diagram source notation was also removed. Historical bytes remain at Git e08f304; old approval
  hashes identify that revision. Current tracked source has no retired text-diagram tool mentions.

## Review and corrections

Configured designer owns the shared visual pipeline; database specialist owns schema semantics;
fresh independent reviewer examined code, workflow, source fidelity and rendering. Findings fixed:
partial UNIQUE must not imply global uniqueness; FK targets must be unconditional candidate keys;
unsupported token inheritance/reference directives must fail; task readiness must include exact
base, boundary cases and ownership. Final designer, database specialist and independent reviewer clearance: no unresolved findings.
Actual PR and owner-review state are recorded in the task handoff.

Generated schema JSON and the immutable conversion fixture are excluded only from generic
formatting: generation drift and exact fixture hash checks own their byte format. Current schema
inputs and handwritten automation still pass formatter/type/lint/size checks. No test threshold
was relaxed. DTCG consumer is intentionally a documented subset; app theme conversion/alpha support
is a separate task, with byte-parity requirements. No native consumer or complete W3C conformance
is claimed. Do not confuse shared style data with database/engine semantics.

Owner review and parent-first integration remain pending. Private captures and recovery backups
are preserved locally. No hosted schema project was deleted or republished, no credentials changed,
no main merge or release performed.
