# S00B web localization readiness — 2026-10-18

This is a bounded completion record for the implemented web prototype and a remaining-work handoff. It does not complete S00B's native contracts/design review or certify Ukrainian translation quality. Owner authorization to continue task work covers these checks and documentation; no app behavior, language picker, service or dependency was added in this slice.

## Current implementation

Trusted literal TypeScript authoring lives in shared/localization/catalog.ts, en.ts and uk.ts. The41 semantic messages include gallery and drawing-prototype UI. Runtime consumes generated web resources and typed arguments. The root check verifies literal-only authoring, exact key coverage, placeholders/plurals, invalid values, deterministic output, stale/missing/extra output and resource format invariants. Native outputs are generated, not integrated native applications.

Web launch selects the first supported en/uk language in navigator.languages, falling back to navigator.language if that list is empty, then English when no preference matches. This is the current web adapter, not a universal native locale parser. The region used by Intl is navigator.language, independent of the selected supported UI language. No language picker or persisted override exists. Locale resolves at launch/reload; live switching is not implemented.

Gallery names remain literal Unicode text. Sample names are fixture/user content and are not translated into every UI language. A new blank preview receives a localized transient Untitled label; it neither allocates nor persists a library name. Decision159 Rust-owned durable name allocation is still unimplemented. Shared UI catalog generation does not satisfy that native contract.

## Evidence and limits

| Requirement | Current evidence | Remaining evidence |
| --- | --- | --- |
| I18N-RESOURCE-001 |14 locale/catalog checks within24 total shared tests (10theme); matching generated key/placeholder browser test; data-only catalog validation | Native resource consumers/compiled host builds; static unlocalized-text lint is not installed |
| I18N-LAUNCH-002 | Browser contexts en/en-US/uk/uk-UA and unsupported de-DE; initial launch/reload; separate ordered-preference fixtures | Actual multi-preference browser profile and native OS/per-app negotiation |
| I18N-UK-002 | Current en/uk resources; Ukrainian gallery rename/open/controls and literal mixed-script name | Named proficient Ukrainian linguistic/context review; full future feature coverage |
| I18N-LAYOUT-001 | P05-D01320/390/wide/short, dark/light, enlarged LTR and pseudo-RTL/forced-color captures reviewed by designer | Full-catalog pseudo-expansion, native layouts/design review and physical AX checks |
| I18N-NUMBER-001 | Native browser ranges expose bounded integers; displayed percentages use regional Intl; independent region fixture | No numeric text parser exists; future localized text parsing/decimals/domain command tests remain required |
| I18N-KEYBOARD-001 | Browser input/rename and synthetic composing-Escape guard | Physical IME/dead keys/alternate keyboard/native responder checks |
| I18N-AX-001 | Localized semantic button/range names and selected/disabled states asserted | Screen-reader walkthrough and native AX acceptance |
| I18N-DOCUMENT/FILE-001 | Static sample geometry and literal user-name tests only | Real document/file/persistence/recovery/Unicode path tests are unimplemented |

New tests are in apps/web/tests/localization-launch.spec.ts. Five launch cases use actual isolated browser-context locale settings. Three ordered-list cases override navigator.languages in an explicitly labeled test fixture while retaining a real de-DE context for region; they do not prove system/browser preference-panel behavior. A ninth Ukrainian case preserves combining characters, Arabic and emoji literally through rename/open/return. No global language/input preference was changed. Exact results/hashes are in [web-localization-launch evidence](../apps/web/quality/web-localization-launch/README.md).

## Terminology review queue

These are current catalog strings and contexts, not a new linguistic approval or instructions to translate user content.

| Stable ID | English / current Ukrainian | Meaning and review note |
| --- | --- | --- |
| drawing.create | New drawing / Новий малюнок | Opens disposable blank prototype; durable creation remains future work |
| drawing.untitled | Untitled / Без назви | Transient display label here; no durable ordinal allocation |
| action.rename | Rename / Перейменувати | Applies an edited gallery name in memory |
| action.delete | Delete / Видалити | Removes sample with recoverable in-place Undo |
| action.undo | Undo / Скасувати | Restores removed sample; must be distinguished from dismissing a dialog |
| action.cancel | Cancel / Скасувати | Dismisses unapplied Rename; current identical Ukrainian wording needs contextual linguistic review |
| canvas.pen | Pen / Перо | Selected UI mode; no ink input |
| canvas.select | Select / Вибір | UI mode with no settings; no geometry selection |
| canvas.eraser | Eraser / Гумка | UI mode with opaque width sample; no erasing |
| canvas.line / canvas.shapes | Line / Лінія; Shapes / Фігури | UI mode affordances; no geometry creation |
| canvas.width | Width / Товщина | Unitless integer preview width; no unreviewed physical-unit promise |
| canvas.opacity | Opacity / Непрозорість |0–100% isolated sample appearance;100% fully opaque |
| canvas.smoothing | Smoothing / Згладжування | Local setting display only; no smoothing algorithm |
| canvas.tools | Preview tools / Інструменти перегляду | May imply viewing tools rather than prototype controls; review with non-editing disclaimer |
| canvas.preview | UI preview · artwork is not editable / Прототип інтерфейсу · малюнок не редагується | Honest scope disclosure, visible in every drawing preview |

No Ukrainian strings were silently changed to resolve these review questions. ui_ux_designer owns terminology/context; lead must identify a proficient Ukrainian reviewer before claiming linguistic readiness. Engineers own resource and runtime assertions; independent reviewer checks evidence labels and unsupported claims.

## Next concrete handoff

Local follow-up evidence: [bounded plural/formatting tests](../quality/localization-boundaries/README.md) exercises727 integer counts per language with an independent category oracle and exact mixed-region examples. Existing XML/gettext resource syntax checks also passed. This is Node/resource-syntax evidence, not additional browser/native or linguistic acceptance.

Keep this web evidence while native presenters are implemented under their reviewed contracts. Prepare host language/bootstrap DTO and typed error/value presentation in S02; do not reuse navigator's web parsing in native hosts. Add regional numeric-text tests only when such a control exists. Preserve native field/IME priority, literal Unicode and content-free logs. Repeat native resource/locale/layout/AX lanes on each implemented host; generated files alone do not pass them.
