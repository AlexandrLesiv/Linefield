# Shared resource verification

Use the canonical [locale catalogues](../../shared/localization/README.md) and
[semantic themes](../../shared/theme/README.md). Generated host resources are ignored outputs.
`pnpm locales:generate` and `pnpm theme:generate` create them; the corresponding
`locales:check` and `theme:resources:check` commands detect drift. This page documents boundaries,
not a claim that those commands were executed for the current revision.

## Authoring and output boundaries

Locale/theme validation accepts ordinary and null-prototype data records and requires the
appropriate own keys. Inherited or nonenumerable required entries must not substitute for real
catalogue content. Trusted repository validation is not a sandbox for getters, proxies or global
prototype tampering.

The resource writer checks output names, file/directory collisions, case-folded spelling aliases,
ancestors and expected target kinds before content access. Configured ancestors must be real
directories. It does not guarantee safety against concurrent path replacement, hard links,
atomic multi-file rollback or competing generators. See the
[writer contract](../../docs/reviews/resource-output-validation.md).

## Locale acceptance

English and Ukrainian are required; UI language and number-formatting region remain independent.
Plural fixtures must derive expectations independently of the formatter being checked. The
selected plural-count contract is integer-only. Preserve empty strings, Unicode, repeated
placeholders and literal replacement-like content without recursive substitution.

Node formatter checks do not establish DOM insertion safety, native parsing/IME, OS language
negotiation, layout, linguistic correctness or assistive-technology behavior. Use the
[app unit tests](../../apps/web/tests/unit) and
[internationalization matrix](../../docs/testing/internationalization.md) for applicable coverage.

## Native tools and unresolved consumer gaps

`pnpm locales:native-check` and `pnpm theme:native-check` are syntax/resource checks.
Missing executables report not-run; installed tools whose probe fails must report failure.
The shared [resource-tool helper](../../scripts/resource-tool.ts) uses allowlisted diagnostics,
a 128 KiB output bound and a termination request after 30 seconds. This is not a hard deadline
for an uncooperative process and does not manage descendant processes.

An earlier locale-probe audit concern was corrected by sharing this helper; do not resurrect it
as an unresolved bug. Its process-control limits above still apply.

XML parsing does not certify WinUI compilation. Apple asset compilation, WinUI compilation,
GTK runtime loading, native app linkage/consumption, accessibility/system-color mappings and
physical-device acceptance still need host-specific evidence. No native consumer exists merely
because a resource file can be generated. Theme colors must not change saved artwork colors.
