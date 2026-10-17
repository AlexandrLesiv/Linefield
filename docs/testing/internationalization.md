# Internationalization acceptance and locale matrix

Status: planned, no executable tests/catalogs/translations. Implements the test requirements
for [i18n architecture](../internationalization.md), CT-09/INV-11 and SU-20.

Both English (en) and Ukrainian (uk) are required from the first web UI and at each native
host launch. Use real reviewed catalogs plus artificial expanded LTR/RTL resources; these
pseudo-locales supplement rather than replace either real language. Additional languages
remain separately scoped. No resource or runtime pass is claimed yet.

## Common scenarios

| ID | Required behavior and evidence |
| --- | --- |
| I18N-RESOURCE-001 | Complete source fallback, no raw keys/untranslated literals in app-owned UI, typed placeholder/plural validity; declared unsupported locale handled safely |
| I18N-LAYOUT-001 | Expanded labels, enlarged text, narrow/typical/wide frames, LTR/RTL and mixed scripts retain essential controls/focus; designer evidence plus actual native checks |
| I18N-NUMBER-001 | Locale-aware width/scale input and display; full-input parsing; comma/dot/grouping/non-Latin digits/invalid suffixes/overflow; failed parse does not mutate Rust state |
| I18N-KEYBOARD-001 | Native field typing/IME/dead keys and alternate keyboard layouts retain text editing; shortcuts invoke only intended Rust commands outside protected composition/focus |
| I18N-DOCUMENT-001 | Same drawing under different UI/region locales preserves geometry/order/semantic file content; RTL does not reflect canvas or pointer transforms |
| I18N-FILE-001 | Non-ASCII/combining/mixed-direction filenames, native dialogs and recovery display preserve access/content; no path normalization shortcut or sensitive logs |
| I18N-LOCALE-001 | Language and regional settings remain distinct. If live refresh is approved, preserve edits/history/dirty state under the reviewed active-field policy. Required relaunch follows normal dirty-close/save/recovery guards; undo history remains session-local |
| I18N-AX-001 | Localized labels, values and announcements remain meaningful; stable automation IDs independent of display language; screen-reader review on declared host |

Core/boundary tests cover numeric-domain invariants and locale-independent serialization.
Native integration tests cover actual host parsing and resource resolution. Real E2E exercises
fields, menus, focus, file panels and geometry. Injecting formatted numeric commands directly
cannot pass native locale-input or keyboard scenarios. Fault-injected resource tests are labeled.

S01 prepares catalog extraction/validation and pseudolocale tooling when authorized; S02
freezes the concrete presentation/typed-argument and numeric/fallback policy. S03 tests engine
invariance; S04–S05 test resources/layout/numbers/keyboard/AX for implemented controls. S06
adds file/recovery/document-roundtrip scenarios. No early task requires unimplemented files.
S07 audits complete applicability and retained failures; S08 requires SU-20 readiness evidence.
Each P01–P12 port repeats applicable scenarios; viewers omit editing inputs with reasons and
retain UI/resource/file/navigation checks. Native system strings may differ from app language;
assert the documented host behavior rather than forcing English OS dialogs.

## Test dimensions and evidence

Record separately: requested/resolved app language, OS language, resource locale, region/number format,
time zone, direction, keyboard layout/input method, text scaling, OS/resource-library versions,
fixture version/hash, app revision/build, test ID, driver and outcome. Keep these in local test
metadata, not automatic user telemetry. Never store typed user content or private paths.

Use bounded pairwise coverage for routine runs and targeted combinations for risks. Examples:
source-language baseline; expanded labels at minimum size; pseudo-RTL with mixed text; UI
language different from comma-decimal region; representative CJK IME and non-Latin keyboard.
Do not run a full Cartesian product of all locales/displays/devices by default. Every declared
shipping locale still needs reviewed translations and a defined native smoke/layout/AX lane.

Launch tests with isolated app/process locale settings where supported. Do not modify global
user language/input settings silently. Real IME/device/assistive technology checks may need a
reserved foreground session; report unavailable lanes rather than substituting direct injection.
Preserve stable accessibility IDs for locating controls, and separately assert the expected
localized visible/accessibility text. Do not identify everything by English labels or normalize
away meaningful Unicode, punctuation, direction, numeric or ordering differences.

Pseudolocalization detects extraction/layout issues, not linguistic quality. Android exposes
expanded and RTL pseudolocales; other hosts need their own supported test resources/configuration.
[Android pseudolocale documentation](https://developer.android.com/guide/topics/resources/pseudolocales).

Planned quality gates: untranslated-literal checks with reviewed exclusions, missing/duplicate
keys, placeholder/type/plural validation, glossary/context checks, native resource compilation,
pseudolocale snapshots, generated resource drift if generation is approved, and actual E2E.
Do not enforce identical key sets for platform-only features: use explicit applicability and
semantic mappings. Select concrete tools in S01/platform tasks; no localization SaaS or universal
resource generator is assumed. Retain translation review status separately from test outcomes.

## Required bilingual launch lane

- I18N-LAUNCH-002: actual host launch with en/en-US and uk/uk-UA; ordered preferences,
  unsupported-language fallback and no in-app language selector/override. Web uses browser preferences.
- I18N-UK-002: complete app-owned Ukrainian UI/AX, context review, plural fixtures such as
  1/2/5/11/21/22 and decimals where applicable using native rules; never English singular logic.
- Run gallery/create/rename/open/recovery prompts in both languages, then applicable pen/tool/
  export scenarios as implemented. Viewer ports cover browsing/navigation/errors, not editing.
- Cross UI language with independent region and keyboard. Verify Ukrainian text entry,
  glyphs/labels at narrow widths, stable automation IDs and unchanged document semantics.
- Default generated names use the resolved language on creation under the approved naming policy;
  existing saved/user-entered names are not retroactively translated after OS language changes.
- Every P01-P12 port must record both real-language lanes and linguistic review separately.
  Missing device access, resource completeness or Ukrainian review blocks the locale acceptance;
  no silent English-only port. Do not change the owner's global language settings for tests.

