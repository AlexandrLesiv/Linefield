# Localization verification

English and Ukrainian are the current app languages. Browser preferences select the supported UI
language at launch; unsupported preferences fall back to English. Region formatting is independent.
There is no in-app language switch or persisted override.

## Maintained checks

| Requirement | What to check | Test source under apps/web/tests |
| --- | --- | --- |
| I18N-LAUNCH-002 | en/en-US/uk/uk-UA launch/reload, de-DE fallback, ordered preferences with independent region | localization-launch.spec.ts |
| I18N-UK-002 | Ukrainian actions and literal combining text, Arabic and emoji survive Rename/open/return | localization-launch.spec.ts |
| WEB-R01 | Matching semantic IDs and named placeholders | refinements.spec.ts |
| WEB-D2-02/03/05; CT-08/09; INV-05/11; SU-07/20 | Keyboard traversal, visible/accessible percentages and Ukrainian UI with German region | drawing-keyboard.spec.ts |
| LOC-08/09, LOC-13–16 | Plural categories, integer-domain rejection, independent regions and literal/reordered Unicode substitutions | E2E coverage gap; removed standalone formatter cases are not current evidence |

Ordered navigator.languages overrides are labeled fixtures; isolated locale contexts exercise
browser settings without changing the owner's preferences. Ukrainian/German integer percentage
spacing can coincide, so that drawing case alone cannot discriminate formatter region. Independent mixed-region E2E coverage remains necessary. No localized numeric text parser is implemented.

[Shared catalog sources](../../../../shared/localization/README.md) use trusted literal TypeScript,
semantic IDs, argument contracts, plural categories and platform escaping. Generate resources
locally; do not restore generated files or old generator reports to Git. `pnpm locales:check`
validates output; `pnpm locales:native-check` reports syntax/compiler availability separately.
Syntax validation does not prove native loading. Standalone formatter suites are removed; their prior results do not certify current E2E coverage.

The useful locale coverage once grouped with swipe experiments remains relevant through these
checks. Custom swipe-reveal actions are removed; their old IDs/platform expectations are not current
requirements. WEB-ONE02–04 in responsive-actions.spec.ts maintain responsive ellipsis/locale coverage.

## Remaining review gaps

The [readiness document](../../../../docs/localization-web-readiness.md) owns the terminology queue,
including the contextual distinction between Ukrainian Undo/Cancel and the meaning of preview-tool
names. Catalog completeness or designer review does not establish proficient linguistic approval.

Full-catalog pseudo-expansion, real multi-preference profiles, physical IME/dead keys, native field
shortcuts, screen-reader speech and native resource/runtime integration remain separate work. Apple
catalog compilation and Android/Windows app linking are not implied by XML/gettext checks. Windows
plural-category selection still requires its future host adapter. In-memory Unicode name checks do
not establish document/file-path durability.
