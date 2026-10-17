# Shared localization catalog

The owner authorized this catalog and generation pipeline on 2026-10-17. Edit
`catalog.ts` (semantic IDs, translator context and typed arguments), `en.ts`
and `uk.ts`. English is the complete source/fallback. Do not edit `generated/`. This reproducible folder is Git-ignored; authored catalogues and generator source are versioned.
All 26 existing strings retain their wording. Translation completeness does not
claim independent linguistic review.

Run `pnpm locales:generate` after source edits, `pnpm locales:check` to reject
missing/stale/extra generated files, and `pnpm locales:test` for LOC-01–LOC-12.
Web dev/build/typecheck/test commands generate resources before consuming them. `pnpm check` bootstraps a missing generated folder on a clean checkout, then runs generation validation and tests as well as lint/type/size gates. If output already exists, stale files still fail the check; regenerate explicitly after catalog edits.
Repeated generation preserves unchanged file bytes and timestamps, avoiding unnecessary preview reloads.
Generated directories reject symlinks/special files before writes.
Generated resource/data files and generated argument declarations are excluded
from handwritten-source limits. There are no generator dependencies.

## Supported source grammar

A metadata entry is `{ "kind": "plain", "context": "Meaning and usage",
"arguments": { "name": "string" } }`; each locale holds a full message such as
`"Open {name}"`. Named arguments are sorted lexically for native positional
formatting. `string` means literal text; `integer` means an integer passed using
the host format API. No HTML, nested ICU expressions, selects, dates, arbitrary
format directives or literal brace escapes are supported. Unknown syntax fails.
Literal percent signs, XML markup characters, quotes, whitespace and Unicode
are escaped for each resource format. Invalid XML scalars are rejected.

`kind: "plural"` additionally requires `selector: "count"` and exactly one
argument `count: "integer"`. The supported domain is nonnegative signed-32-bit
counts; fractional/negative values are outside this initial contract. Each locale
holds an object with **all** required categories: en `one/other`; uk
`one/few/many/other`. Every form must include `{count}`. No production plural
copy is invented: synthetic fixtures exercise the generator. Native adapters
must use their platform cardinal selection and number formatting, not English
singular logic. Extra categories and missing forms fail validation.

Optional metadata `overrides` maps platform names (`web`, `apple`, `android`,
`windows`, `linux`) to complete `{ "en": ..., "uk": ... }` replacements.
Overrides retain the same argument/type/category contract. Native resource IDs
map dots to underscores and lowercase; collisions, including Windows plural
suffix collisions, fail validation. Existing catalog has no overrides.

## Generated outputs and host integration

- `web/en.json`, `uk.json`, `arguments.ts`, `contracts.json`: browser imports generated resources
  and typed argument contracts. Browser preferences still select locale; the bounded
  formatter uses Intl.PluralRules for language and Intl.NumberFormat for region.
- `apple/Localizable.xcstrings`: semantic keys, translator comments, native
  plural variations. Positional arguments use `%N$@` / `%N$lld`.
- `android/values/strings.xml`, `values-uk/strings.xml`: complete default and
  Ukrainian resources; positional `%N$s` / `%N$d`; plurals use native quantities.
- `windows/en/Resources.resw`, `uk/Resources.resw`: positional `{0}` arguments;
  plural resources have `_one`, `_few`, `_many`, `_other` suffixes as applicable.
  **MRT Core does not select these suffixes automatically.** A future host adapter
  must select cardinal categories with its supported locale formatter, then use
  the matching resource and format arguments. This adapter is not implemented.
- `linux/en.po`, `uk.po`: semantic `msgctxt`, English source `msgid`, native
  gettext integer plural rule. Ukrainian integer categories map indices
  0/1/2 to one/few/many; `other` is retained in the shared source for platforms
  requiring it but is unreachable for this integer-only gettext domain.
- `manifest.json`: ID mappings, kind and canonical native argument order/types.

For messages with arguments, retrieve then format once with platform APIs;
percent literals are escaped for that formatting pass. Messages with no arguments
are read directly without a format pass (percent signs remain single). Never
interpret user argument content as a format string or markup. Region formatting,
locale negotiation, accessibility and native resources remain host-owned; no
Rust/FFI protocol or shared localization runtime has been added.

`pnpm locales:native-check` validates actual and synthetic escaping/plural resources
with xmllint and msgfmt when installed; unavailable tools are reported not-run.
On this host XML validation passed for eight files and gettext compilation for
four files. xcstringstool is unavailable, so Apple catalog compilation was not run.

Native outputs are staged resources, not integrated native applications. XML
well-formedness and gettext compiler checks do not prove Android/Windows/Apple
runtime behavior or accessibility. Native projects/compiler and E2E integration
remain separate. Unsupported catalog features are rejected rather than silently
approximated. Changing grammar requires explicit validation and host conformance.

Decision227 authorizes typed TypeScript authoring with unchanged generated platform formats and runtime validation. Keep modules trusted and data-only: no filesystem, network, time or environment-dependent behavior. Native hosts consume generated resources, not TypeScript. See [shared resource boundaries](../../docs/design/shared-resources-plan.md).
