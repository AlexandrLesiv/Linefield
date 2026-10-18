# Shared resource authoring and platform boundaries

Status2026-10-17: owner approved the typed TypeScript catalog migration (decision227). Theme and localization authoring now use typed TypeScript, with all12 generated locale files byte-identical and the palette unchanged; generated output formats remain unchanged. Decision230 adds deterministic native theme resource generation; native consumers and the other sharing candidates below remain future work.

Locale schema validation accepts ordinary and null-prototype data records, rejecting custom
prototype inheritance at each existing record boundary. A literal `__proto__` construct can
otherwise supply translations absent from the record's own serialized entries. This is trusted
catalog correctness, not an accessor/proxy or hostile-JavaScript sandbox. Generated formats and
current resource bytes remain unchanged. See quality/localization-record-boundaries/.

## What exists

- Locales: shared semantic IDs, context/arguments, separate English/Ukrainian translations, validated platform overrides, deterministic web JSON/Apple String Catalog/Android XML/Windows resources/gettext generation, stale-output and negative validation. Web consumes generated resources. Native resource generation is implemented; native application consumption/locale selection and linguistic review are not.
- Theme: shared primitive palette, semantic light/dark references and typed Vanilla Extract web adapter, with exact role/reference/hex/contrast checks and color-parity coverage. The web consumer is integrated. Native color resource generation is implemented for Apple, Android, WinUI and GTK. Native host consumers and accessibility mappings remain pending; generation is not an end-to-end native rollout.

## Consistent appearance without moving styles into Rust

Decision 232 selects one Linefield visual system across platforms and retires the wheel. Mandatory Liquid Glass, Material, Fluent and other native visual treatments are superseded. Keep the current data-only TypeScript authoring and build-time resource generation; this owner direction does not select a new authoring language or UI runtime.

Recommended boundary: shared resources/specifications own app colors, spacing, typography roles, shapes, icon artwork, component states and motion. Hosts render/adapt those components and retain layout, text/IME, focus, input, accessibility and OS integration. Rust owns tool/settings meanings and validation, document operations, history and persistence; a slider's accepted width range is different from its track color, height or animation. A reviewed Rust renderer can consume generated style values it needs without owning all UI styles or calling back across FFI for every visual property.

Only color and localization sharing/generation exist today. Add other token categories and component contracts as a reviewed screen needs them; this note does not claim a complete shared component library. Tokens alone cannot make different default widgets visually identical. Host component work and visual/interaction verification will still be needed. An all-Skia UI or another single UI framework would be a separate architecture choice with text, focus, accessibility and host-integration costs.

Background: [DTCG's platform-independent design-token model](https://www.designtokens.org/tr/2025.10/format/#introduction) explains translation into host resources; its interchange format is not being adopted here. [Compose custom design systems](https://developer.android.com/develop/ui/compose/designsystems/custom) demonstrates that a host toolkit and its default Material appearance are separate choices. Keep actual source/output format decisions and host feasibility distinct.

## Selected authoring format

Use native Node TypeScript modules for developer-authored catalogs: `shared/theme/palette.ts` and semantic references in `shared/theme/colors.ts`, locale metadata modules, `shared/localization/en.ts` and `uk.ts`. Export plain serializable constant data checked with `satisfies`; derive stable ID unions from the source catalog. Keep locales separate and preserve translator context, typed placeholders/plural rules and platform wording overrides. Split by cohesive domain if the200-line source limit requires it, not arbitrary numbered chunks.

TypeScript improves editor completion, refactoring, comments and compile-time completeness. Runtime validation still checks placeholders/plurals, exact keys, color contrast, resource-name collisions and invalid overrides. Native consumers do not execute TypeScript; build-time generation emits their normal resource formats. Web may consume typed theme data directly; translation output remains generated data. This is build-time resource generation, not dynamic runtime generation.

Tradeoffs: translation tools generally handle data/resource files more readily than TypeScript. Retain an import/export path for translators if needed, with validation on reimport. Importing a TypeScript module executes it: accept only trusted repository authoring modules, require data-only exports, no filesystem/network/environment/time-dependent catalog behavior and no remote/untrusted module imports. Type annotations alone cannot enforce purity. The root check validates a literal-only source grammar after stripping types, allowing comments and rejecting executable values/imports. The separately reviewed `shared/theme/resolve.ts` implements one-hop reference validation/resolution and is excluded explicitly from the literal-data grammar; all other authored theme/locale modules remain covered. Keep deterministic output tests and code review. Direct generator imports are still trusted repository execution; this check is an authoring restriction, not a security sandbox. Do not add native TypeScript runtimes or a universal UI library.

Resource output preflight now requires relative paths without traversal or file/directory collisions, real configured directory ancestors and regular existing targets. Unexpected files are never silently removed or concealed by inherited object names. See [writer contract](../reviews/resource-output-validation.md) and [evidence](../../quality/resource-output-validation/README.md). These stable-filesystem checks do not promise concurrent-race containment, hard-link isolation or transactional multi-file replacement.

## Migration acceptance and remaining work

1. Implemented: add shared catalog types and source imports to root type/lint/format/size gates. Convert the smaller theme first; demonstrate identical palette/contrast and unchanged web output/behavior.
2. Implemented: convert locale metadata and separate languages; reuse the existing runtime schema/generators. Compare every generated file byte-for-byte against the current valid catalog. Keep semantic IDs, names, placeholders, plural categories, escaping, translator context and overrides unchanged. Existing stale-output checks must keep failing on drift.
3. Implemented: switch consumers/generation in one change and remove superseded authored JSON. Keep generated JSON/resources ignored and reproducible; no parallel authoring source. Verify clean-checkout bootstrap, incremental generation without timestamp churn, type errors for missing keys, negative validation and all affected browser flows.
4. Native resource generation implemented (decision230): named Apple color assets, Android light/night resources, WinUI Light/Dark dictionaries and GTK named colors all resolve from the same shared semantic catalog. Native host inclusion and theme mapping remain pending. Linefield roles determine app appearance; system accessibility overrides and light/dark preference still apply. Verify resolved colors with each host's actual UI tests; generation alone is insufficient.

## What else should be shared

| Candidate | Recommendation and boundary |
| --- | --- |
| Action/tool IDs, availability, validation, document/edit/save/undo semantics | Canonical Rust contracts and generated bindings, following existing reviewed architecture. Do not create a competing TypeScript action/state model for native hosts. |
| Settings definitions/defaults/ranges and error IDs | Shared typed contracts owned by Rust where behavior depends on them; hosts own native presentation and localized messages. |
| Accessibility and motion intent | Share app-owned choreography, feedback, interruption and reduced-motion specifications. Hosts implement supported preference signals and OS-owned transitions. Prototype timing still needs actual-host validation. |
| Design roles | Common Linefield color/type/spacing/shape/state roles and component appearance. Add validated tokens when approved components need them; hosts adapt font metrics, scaling, hit targets and safe areas. |
| Test fixtures/scenarios | Share document examples, deterministic expected outcomes, resource parity fixtures and acceptance IDs. Keep browser/native drivers and execution evidence distinct. |
| Icons/assets | Share reviewed Linefield icon artwork, meaning and license/provenance. Generate suitable host assets without requiring one runtime file format or platform-default symbols. |

Shared visual identity does not require one concrete view tree or runtime. Keep adaptive composition, keyboard/gesture integration, native text editing, locale/number formatting and accessibility adapters with hosts. OS-owned panels retain OS behavior/appearance. No new screens, runtime boundary, storage behavior or automatic implementation scope is approved by this proposal.

Migration evidence: [apps/web/quality/web-typed-catalogs](../../apps/web/quality/web-typed-catalogs/README.md). Source files remain separate per language; metadata fits the source-size limit without arbitrary splits. Existing plural/escaping/platform-override runtime checks remain authoritative in addition to TypeScript key completeness.

## Three-layer theme adoption

Decision229 implements primitives → semantic light/dark roles → web adapter without recoloring the application. Use neutral/red numbered shades only as primitive vocabulary; do not reference them from components. Preserve separate destructive/error roles and explicit artwork-paper roles. Existing shades include uneven steps rather than inventing unused values to fill a 100–900 ramp. Future intentional palette changes should be reviewed through resolved semantic roles in both appearances and interaction states, with contrast validation. See [shared theme implementation](../../shared/theme/README.md).

Follow-up within the semantic vocabulary: give default primary-action fill and foreground their own roles before a future recolor. The compatibility adapter still reuses the existing text/background values for those states; this preservation pass keeps their values unchanged. Native resource generation now exists; host adapters and broader typography/spacing/behavior sharing remain separately scoped work.
